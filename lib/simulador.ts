/* Gerador determinístico de leituras. Substitui a câmera e o radar quando não há vídeo. */
import { PONTOS, VEICULOS, obraDoPonto, obraPorId, type TipoVeiculo } from "./dados";
import { num } from "./formato";
import type { Leitura, Prioridade, TipoAlerta } from "./tipos";

export const PNEU_MINIMO = 1.5;
export const TEMP_MAXIMA = 90;
const LETRAS = "ABCDEFGHJKLMNPRSTUVWXYZ";

/* mulberry32 */
export function rng(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escolherPeso(r: () => number, lista: TipoVeiculo[]): TipoVeiculo {
  const total = lista.reduce((s, v) => s + v.peso, 0);
  let x = r() * total;
  for (const v of lista) {
    x -= v.peso;
    if (x < 0) return v;
  }
  return lista[lista.length - 1]!;
}

function placa(r: () => number): string {
  const l = () => LETRAS[Math.floor(r() * LETRAS.length)]!;
  const n = () => String(Math.floor(r() * 10));
  return l() + l() + l() + n() + l() + n() + n();
}

/* Mesma semente + mesmo n = mesma leitura. ajusteHora soma à velocidade (madrugada tende a ser mais rápida). */
export function gerarLeitura(semente: number, n: number, ajusteHora = 0, quando = 0): Leitura {
  const r = rng((semente * 7919 + n * 104729) >>> 0);
  const ponto = PONTOS[Math.floor(r() * PONTOS.length)]!;
  const obra = obraDoPonto(ponto.id);
  const v = escolherPeso(r, VEICULOS);

  let vel = v.base + (r() + r() + r() - 1.5) * 15 + ajusteHora;
  if (obra) vel -= 24;
  if (r() < 0.05) vel += 24 + r() * 26;
  vel = Math.max(18, Math.round(vel * 100) / 100);

  let temp = 34 + r() * 22 + (v.pesado ? 12 : 0) + (vel - 70) * 0.12;
  if (r() < 0.05) temp += 28 + r() * 14;
  temp = Math.round(temp * 100) / 100;

  const q = r();
  let faixa = q < 0.03 ? 0 : q < 0.07 ? 1 : q < 0.16 ? 2 : q < 0.36 ? 3 : 4;
  if (temp >= TEMP_MAXIMA && faixa > 1) faixa -= 1;
  const classe = Math.round((faixa + r()) * 100) / 100;

  const invasao = !!obra && r() < 0.04;
  const comp = v.comp[0] + r() * (v.comp[1] - v.comp[0]);

  return {
    n,
    ponto: ponto.id,
    obra: obra ? obra.id : null,
    tipo: v.tipo,
    tamanho: v.tamanho,
    comp: Math.round(comp * 10) / 10,
    placa: placa(r),
    velocidade: vel,
    tempPneu: temp,
    classePneu: classe,
    invasao,
    quando,
  };
}

export interface AlertaLeitura {
  tipo: TipoAlerta;
  texto: string;
  prioridade: Prioridade;
  /* vai para a central de alertas (só o que ameaça a equipe em obra) */
  fila: boolean;
}

/* Limite que vale para a leitura: o menor entre via, obra e recomendação por clima. */
export function limiteEfetivo(obraId: string | null, limiteVia: number, limitesClima: Record<string, number> = {}): number {
  const obra = obraPorId(obraId);
  if (!obra) return limiteVia;
  return Math.min(limiteVia, obra.limite, limitesClima[obra.id] ?? Infinity);
}

export function avaliar(
  l: Leitura,
  limiteVia: number,
  limitesClima: Record<string, number> = {},
): { limite: number; alertas: AlertaLeitura[] } {
  const lim = limiteEfetivo(l.obra, limiteVia, limitesClima);
  const a: AlertaLeitura[] = [];
  if (l.velocidade > lim) {
    const excesso = l.velocidade - lim;
    a.push({
      tipo: "velocidade",
      texto: `${num(l.velocidade)} km/h em trecho de ${lim}`,
      prioridade: excesso >= 20 ? "alta" : "media",
      fila: !!l.obra && excesso >= 8,
    });
  }
  if (l.classePneu < PNEU_MINIMO || l.tempPneu >= TEMP_MAXIMA) {
    const grave = l.classePneu < 1 || l.tempPneu >= TEMP_MAXIMA;
    a.push({
      tipo: "pneu",
      texto: `Pneu nota ${num(l.classePneu)} · ${num(l.tempPneu)} °C`,
      prioridade: grave ? "alta" : "media",
      fila: !!l.obra && grave,
    });
  }
  if (l.invasao) {
    a.push({ tipo: "invasao", texto: `Entrou na área isolada da ${l.obra}`, prioridade: "critica", fila: true });
  }
  return { limite: lim, alertas: a };
}

/* Histórico simulado das últimas 24 h: velocidade média por hora, alertas por tipo e notas de pneu. */
export function historico(semente: number, limite: number) {
  const porHora: { hora: number; media: number; volume: number }[] = [];
  const contagem = { velocidade: 0, pneu: 0, invasao: 0 };
  const classes = [0, 0, 0, 0, 0];
  for (let h = 0; h < 24; h++) {
    const noite = h < 5 || h >= 22;
    const pico = (h >= 7 && h <= 9) || (h >= 17 && h <= 19);
    const ajuste = noite ? 9 : pico ? -11 : 0;
    const volume = noite ? 22 : pico ? 70 : 45;
    let soma = 0;
    for (let i = 0; i < volume; i++) {
      const l = gerarLeitura(semente + 1000, h * 1000 + i, ajuste);
      soma += l.velocidade;
      classes[Math.min(4, Math.floor(l.classePneu))]!++;
      for (const x of avaliar(l, limite).alertas) {
        if (x.tipo !== "clima") contagem[x.tipo]++;
      }
    }
    porHora.push({ hora: h, media: Math.round(soma / volume), volume });
  }
  return { porHora, contagem, classes };
}

