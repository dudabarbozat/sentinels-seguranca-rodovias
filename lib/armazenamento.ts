/* Estado da demo no localStorage do visitante. */
import { OCORRENCIAS_EXEMPLO } from "./dados";
import type { Alerta, Estado } from "./tipos";

const CHAVE_ESTADO = "sentinels:estado:v2";

export const INDICADORES_PADRAO = ["abertos", "criticos", "velMedia", "excesso", "pendentes", "obras"];

/* Alertas de exemplo do início do turno, para a central não abrir vazia na primeira visita. */
function alertasExemplo(agora: number): Alerta[] {
  const min = 60 * 1000;
  return [
    {
      id: "AL-0004", tipo: "invasao", prioridade: "critica", status: "aberto", origem: "simulacao",
      titulo: "Invasão da área de obra", detalhe: "Caminhão KRT4B21 · Entrou na área isolada da OB-31", local: "OB-31",
      criadoEm: agora - 6 * min,
    },
    {
      id: "AL-0003", tipo: "velocidade", prioridade: "alta", status: "aberto", origem: "simulacao",
      titulo: "Excesso de velocidade na obra", detalhe: "Carro PLM2C87 · 84,30 km/h em trecho de 60", local: "OB-34",
      criadoEm: agora - 14 * min,
    },
    {
      id: "AL-0002", tipo: "pneu", prioridade: "alta", status: "reconhecido", origem: "simulacao",
      titulo: "Pneu crítico perto da obra", detalhe: "Carreta VHA8D10 · Pneu nota 0,74 · 93,12 °C", local: "OB-31",
      criadoEm: agora - 31 * min, reconhecidoEm: agora - 29 * min,
    },
    {
      id: "AL-0001", tipo: "velocidade", prioridade: "media", status: "encerrado", origem: "simulacao",
      titulo: "Excesso de velocidade na obra", detalhe: "Utilitário GSD5E44 · 71,05 km/h em trecho de 60", local: "OB-34",
      criadoEm: agora - 52 * min, reconhecidoEm: agora - 50 * min, encerradoEm: agora - 41 * min,
    },
  ];
}

export function estadoPadrao(): Estado {
  const agora = Date.now();
  return {
    versao: 2,
    semente: 2310,
    seq: 30,
    limite: 80,
    som: false,
    pausado: false,
    filtroPonto: "",
    indicadores: [...INDICADORES_PADRAO],
    sessao: { velocidade: 0, pneu: 0, invasao: 0, clima: 0 },
    alertas: alertasExemplo(agora),
    proximoAlerta: 5,
    ocorrencias: OCORRENCIAS_EXEMPLO.map((o) => ({ ...o })),
    proximaOcorrencia: 119,
    inicioTurno: agora - 60 * 60 * 1000,
    orientacaoVista: {},
    visao: { linhaA: null, linhaB: null, distancia: 20, area: [] },
  };
}

export function carregarEstado(): Estado {
  const base = estadoPadrao();
  try {
    const bruto = localStorage.getItem(CHAVE_ESTADO);
    if (!bruto) return base;
    const salvo = JSON.parse(bruto) as Partial<Estado>;
    if (salvo.versao !== 2) return base;
    return {
      ...base,
      ...salvo,
      sessao: { ...base.sessao, ...(salvo.sessao ?? {}) },
      visao: { ...base.visao, ...(salvo.visao ?? {}) },
    };
  } catch {
    return base;
  }
}

export function salvarEstado(e: Estado): void {
  try {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(e));
  } catch {
    /* sem armazenamento: segue em memória */
  }
}

export function apagarEstado(): void {
  try {
    localStorage.removeItem(CHAVE_ESTADO);
  } catch {
    /* ignora */
  }
}
