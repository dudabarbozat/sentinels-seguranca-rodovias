export type TipoAlerta = "velocidade" | "pneu" | "invasao" | "clima";
export type Prioridade = "critica" | "alta" | "media" | "baixa";
export type StatusAlerta = "aberto" | "reconhecido" | "encerrado";
export type OrigemAlerta = "simulacao" | "camera" | "clima" | "demonstracao";

export interface Alerta {
  id: string;
  chave?: string; // evita duplicar alertas de clima abertos
  tipo: TipoAlerta;
  prioridade: Prioridade;
  status: StatusAlerta;
  origem: OrigemAlerta;
  titulo: string;
  detalhe: string;
  local: string;
  criadoEm: number;
  reconhecidoEm?: number;
  encerradoEm?: number;
}

export interface Leitura {
  n: number;
  ponto: string;
  obra: string | null;
  tipo: string;
  tamanho: string;
  comp: number;
  placa: string;
  velocidade: number;
  tempPneu: number;
  classePneu: number;
  invasao: boolean;
  quando: number;
}

export type Gravidade = "baixa" | "media" | "alta";
export type StatusOcorrencia = "aberta" | "em-analise" | "resolvida";

export interface Ocorrencia {
  id: string;
  tipo: string;
  local: string;
  km: number | null;
  gravidade: Gravidade;
  descricao: string;
  autor: string;
  criada: string;
  status: StatusOcorrencia;
}

export interface Ponto2D {
  x: number; // normalizado 0..1
  y: number;
}

export interface ConfigVisao {
  linhaA: [Ponto2D, Ponto2D] | null;
  linhaB: [Ponto2D, Ponto2D] | null;
  distancia: number; // metros entre as linhas
  area: Ponto2D[];
}

export interface ClimaObra {
  obra: string;
  hora: string;
  chuva: number; // mm
  visibilidade: number; // m
  vento: number; // km/h
  rajada: number; // km/h
  codigo: number;
  limiteRecomendado: number;
  condicoes: { tipo: "chuva" | "visibilidade" | "vento"; texto: string; prioridade: Prioridade }[];
}

export interface Estado {
  versao: 2;
  semente: number;
  seq: number;
  limite: number;
  som: boolean;
  pausado: boolean;
  filtroPonto: string;
  indicadores: string[];
  sessao: Record<TipoAlerta, number>;
  alertas: Alerta[];
  proximoAlerta: number;
  ocorrencias: Ocorrencia[];
  proximaOcorrencia: number;
  inicioTurno: number;
  orientacaoVista: Record<string, boolean>;
  visao: ConfigVisao;
}
