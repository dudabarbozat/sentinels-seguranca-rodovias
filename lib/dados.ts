/* Dados fictícios do trecho monitorado. Nenhuma informação aqui é real. */
import type { Ocorrencia } from "./tipos";

export interface PontoColeta {
  id: string;
  nome: string;
  km: number;
  equip: string;
  status: "online" | "instavel";
}

export interface Obra {
  id: string;
  titulo: string;
  kmIni: number;
  kmFim: number;
  ponto: string;
  faixa: string;
  equipe: string;
  turno: string;
  inicio: string;
  limite: number;
}

export interface TipoVeiculo {
  tipo: string;
  tamanho: string;
  comp: [number, number];
  base: number;
  peso: number;
  pesado: boolean;
}

export const RODOVIA = {
  nome: "BR-116/SP",
  kmIni: 335,
  kmFim: 390,
  descricao: "Trecho fictício de serra, pista dupla, sentido sul",
};

/* Traçado aproximado, só para referência visual no mapa. */
export const TRACADO: [number, number][] = [
  [-23.948, -47.093],
  [-23.991, -47.152],
  [-24.034, -47.213],
  [-24.079, -47.271],
  [-24.122, -47.322],
  [-24.171, -47.367],
  [-24.226, -47.415],
  [-24.279, -47.462],
];

export const PONTOS: PontoColeta[] = [
  { id: "PC-01", nome: "Pórtico km 338", km: 338.2, equip: "Câmera + radar Doppler", status: "online" },
  { id: "PC-02", nome: "Viaduto km 346", km: 346.7, equip: "Câmera + radar Doppler", status: "online" },
  { id: "PC-03", nome: "Obra km 353", km: 353.1, equip: "Câmera térmica + radar", status: "online" },
  { id: "PC-04", nome: "Curva km 361", km: 361.5, equip: "Câmera + radar Doppler", status: "online" },
  { id: "PC-05", nome: "Obra km 372", km: 372.0, equip: "Câmera térmica + radar", status: "online" },
  { id: "PC-06", nome: "Praça km 384", km: 384.4, equip: "Câmera", status: "instavel" },
];

export const OBRAS: Obra[] = [
  {
    id: "OB-31", titulo: "Recapeamento da faixa 2", kmIni: 352.4, kmFim: 354.0, ponto: "PC-03",
    faixa: "Faixa 2 interditada", equipe: "Frente 3 · 9 colaboradores", turno: "07h às 17h", inicio: "2026-11-09", limite: 60,
  },
  {
    id: "OB-34", titulo: "Troca de defensa metálica", kmIni: 371.3, kmFim: 372.6, ponto: "PC-05",
    faixa: "Acostamento e faixa 2", equipe: "Frente 1 · 6 colaboradores", turno: "08h às 16h", inicio: "2026-11-12", limite: 60,
  },
  {
    id: "OB-36", titulo: "Roçada e limpeza de drenagem", kmIni: 380.0, kmFim: 381.1, ponto: "PC-06",
    faixa: "Acostamento", equipe: "Frente 4 · 5 colaboradores", turno: "07h às 15h", inicio: "2026-11-16", limite: 80,
  },
];

export const VEICULOS: TipoVeiculo[] = [
  { tipo: "Moto", tamanho: "P", comp: [1.9, 2.3], base: 80, peso: 10, pesado: false },
  { tipo: "Carro", tamanho: "M", comp: [3.8, 4.8], base: 76, peso: 48, pesado: false },
  { tipo: "Utilitário", tamanho: "M", comp: [4.9, 6.2], base: 72, peso: 14, pesado: false },
  { tipo: "Ônibus", tamanho: "G", comp: [12.0, 14.0], base: 68, peso: 5, pesado: true },
  { tipo: "Caminhão", tamanho: "G", comp: [7.5, 11.0], base: 64, peso: 14, pesado: true },
  { tipo: "Carreta", tamanho: "XG", comp: [16.5, 19.8], base: 60, peso: 9, pesado: true },
];

export const TIPOS_OCORRENCIA = [
  "Quase acidente",
  "Invasão da área de obra",
  "Sinalização danificada",
  "Equipamento com defeito",
  "Sugestão",
];

export const OCORRENCIAS_EXEMPLO: Ocorrencia[] = [
  {
    id: "OC-0118", tipo: "Invasão da área de obra", local: "OB-31", km: 352.9, gravidade: "alta",
    descricao: "Caminhão passou por cima dos cones da faixa 2 e só voltou para a faixa 1 depois do segundo cavalete.",
    autor: "COL-0412", criada: "2026-11-17T09:42:00", status: "em-analise",
  },
  {
    id: "OC-0117", tipo: "Sinalização danificada", local: "OB-34", km: 371.4, gravidade: "media",
    descricao: "Placa de redução para 60 km/h caída depois da chuva. Recolocamos provisoriamente, falta fixar.",
    autor: "Anônimo", criada: "2026-11-17T07:15:00", status: "aberta",
  },
  {
    id: "OC-0115", tipo: "Quase acidente", local: "OB-34", km: 372.1, gravidade: "alta",
    descricao: "Carro em alta velocidade freou em cima da equipe na saída da curva. Alerta no celular chegou uns 4 segundos antes.",
    autor: "COL-0287", criada: "2026-11-16T15:03:00", status: "em-analise",
  },
  {
    id: "OC-0112", tipo: "Equipamento com defeito", local: "PC-06", km: 384.4, gravidade: "baixa",
    descricao: "Câmera da praça perdendo conexão no fim da tarde. Leituras chegam com atraso.",
    autor: "COL-0150", criada: "2026-11-15T17:48:00", status: "aberta",
  },
  {
    id: "OC-0109", tipo: "Sugestão", local: "OB-31", km: 353.0, gravidade: "baixa",
    descricao: "Colocar o painel de mensagem variável 500 m antes do atual, motorista vê a obra tarde demais.",
    autor: "COL-0412", criada: "2026-11-14T11:20:00", status: "resolvida",
  },
  {
    id: "OC-0104", tipo: "Quase acidente", local: "OB-31", km: 352.6, gravidade: "media",
    descricao: "Moto passou pelo acostamento entre os cones durante a troca de turno.",
    autor: "Anônimo", criada: "2026-11-12T16:55:00", status: "resolvida",
  },
];

/* Posição aproximada (lat, lng) de um km do trecho, interpolada no traçado. */
export function posKm(km: number): [number, number] {
  const t = Math.min(1, Math.max(0, (km - RODOVIA.kmIni) / (RODOVIA.kmFim - RODOVIA.kmIni)));
  const seg = TRACADO.length - 1;
  const x = t * seg;
  const i = Math.min(seg - 1, Math.floor(x));
  const f = x - i;
  const a = TRACADO[i]!;
  const b = TRACADO[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function obraDoPonto(pontoId: string): Obra | null {
  return OBRAS.find((o) => o.ponto === pontoId) ?? null;
}

export function obraPorId(id: string | null): Obra | null {
  return id ? OBRAS.find((o) => o.id === id) ?? null : null;
}

export function nomeLocal(id: string): string {
  const o = OBRAS.find((x) => x.id === id);
  if (o) return `${o.id} · ${o.titulo}`;
  const p = PONTOS.find((x) => x.id === id);
  if (p) return `${p.id} · ${p.nome}`;
  if (id === "camera") return "Câmera local";
  if (id === "demonstracao") return "Câmera real da TfL (Londres) · obra simulada";
  return "Outro trecho";
}
