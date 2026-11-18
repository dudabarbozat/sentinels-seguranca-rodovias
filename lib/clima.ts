/* Clima atual nas obras via Open-Meteo (https://open-meteo.com), sem chave e com CORS liberado. */
import { OBRAS, posKm } from "./dados";
import type { ClimaObra, Prioridade } from "./tipos";

const URL_BASE = "https://api.open-meteo.com/v1/forecast";
const CAMPOS = "precipitation,rain,visibility,wind_speed_10m,wind_gusts_10m,weather_code,is_day";

export interface RespostaAtual {
  current?: {
    time: string;
    precipitation: number;
    visibility: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
    is_day?: number;
  };
}

/* Regras de redução do limite recomendado na área de obra. */
export function avaliarClima(obraId: string, limiteObra: number, c: NonNullable<RespostaAtual["current"]>): ClimaObra {
  const condicoes: ClimaObra["condicoes"] = [];
  let limite = limiteObra;
  if (c.precipitation >= 0.5) {
    const forte = c.precipitation >= 4;
    limite -= forte ? 20 : 10;
    condicoes.push({
      tipo: "chuva",
      texto: `Chuva de ${c.precipitation.toLocaleString("pt-BR")} mm em 15 min: pista molhada`,
      prioridade: (forte ? "alta" : "media") as Prioridade,
    });
  }
  if (c.visibility < 2000) {
    const baixa = c.visibility < 800;
    limite -= baixa ? 20 : 10;
    condicoes.push({
      tipo: "visibilidade",
      texto: `Visibilidade de ${Math.round(c.visibility)} m`,
      prioridade: baixa ? "alta" : "media",
    });
  }
  if (c.wind_gusts_10m >= 50) {
    limite -= 10;
    condicoes.push({
      tipo: "vento",
      texto: `Rajadas de ${Math.round(c.wind_gusts_10m)} km/h: risco para sinalização e cones`,
      prioridade: c.wind_gusts_10m >= 70 ? "alta" : "media",
    });
  }
  return {
    obra: obraId,
    hora: c.time,
    chuva: c.precipitation,
    visibilidade: c.visibility,
    vento: c.wind_speed_10m,
    rajada: c.wind_gusts_10m,
    codigo: c.weather_code,
    limiteRecomendado: Math.max(30, limite),
    condicoes,
  };
}

export async function buscarClimaObras(sinal?: AbortSignal): Promise<ClimaObra[]> {
  const pos = OBRAS.map((o) => posKm((o.kmIni + o.kmFim) / 2));
  const params = new URLSearchParams({
    latitude: pos.map((p) => p[0].toFixed(4)).join(","),
    longitude: pos.map((p) => p[1].toFixed(4)).join(","),
    current: CAMPOS,
    timezone: "America/Sao_Paulo",
  });
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 15000);
  sinal?.addEventListener("abort", () => controle.abort());
  try {
    const r = await fetch(`${URL_BASE}?${params.toString()}`, { signal: controle.signal });
    if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status}`);
    const corpo = (await r.json()) as RespostaAtual | RespostaAtual[];
    const lista = Array.isArray(corpo) ? corpo : [corpo];
    return OBRAS.map((o, i) => {
      const atual = lista[i]?.current;
      if (!atual) throw new Error("Resposta sem dados atuais");
      return avaliarClima(o.id, o.limite, atual);
    });
  } finally {
    clearTimeout(tempo);
  }
}

export type ClimaAtual = NonNullable<RespostaAtual["current"]>;

/* Clima atual num ponto qualquer (usado pela demonstração da página inicial). */
export async function buscarClimaPonto(lat: number, lon: number, fuso: string): Promise<ClimaAtual> {
  const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), current: CAMPOS, timezone: fuso });
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 15000);
  try {
    const r = await fetch(`${URL_BASE}?${params.toString()}`, { signal: controle.signal });
    if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status}`);
    const atual = ((await r.json()) as RespostaAtual).current;
    if (!atual) throw new Error("Resposta sem dados atuais");
    return atual;
  } finally {
    clearTimeout(tempo);
  }
}

const DESCRICAO_WMO: Record<number, string> = {
  0: "Céu limpo", 1: "Poucas nuvens", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Neblina", 48: "Neblina com geada",
  51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte",
  61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  80: "Pancadas fracas", 81: "Pancadas de chuva", 82: "Pancadas fortes",
  95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada forte",
};

export function descreverTempo(codigo: number): string {
  return DESCRICAO_WMO[codigo] ?? "Condição variável";
}

/* Cache de 10 min no navegador, para não consultar a API a cada recarga de página. */
const CHAVE_CACHE = "sentinels:clima";
export const VALIDADE_CLIMA = 10 * 60 * 1000;

export function lerCacheClima(): { t: number; dados: ClimaObra[] } | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_CACHE) ?? "null") as { t: number; dados: ClimaObra[] } | null;
    return c && Date.now() - c.t < VALIDADE_CLIMA && Array.isArray(c.dados) ? c : null;
  } catch {
    return null;
  }
}

export function gravarCacheClima(dados: ClimaObra[]): void {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify({ t: Date.now(), dados }));
  } catch {
    /* ignora */
  }
}
