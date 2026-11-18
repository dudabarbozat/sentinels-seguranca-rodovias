/*
 * Impacto estimado da demonstração: modelo de potência de Nilsson sobre as velocidades medidas na câmera.
 *
 * Nilsson (2004): a variação no número de acidentes acompanha a variação da velocidade média elevada a um expoente:
 *   acidentes depois / acidentes antes = (v1 / v0) ^ expoente
 * com expoente 4 para acidentes fatais, 3 para acidentes fatais ou com feridos graves e 2 para acidentes com feridos.
 * Elvik (2009, TØI 1034/2009, tabela S1) revisou os expoentes por ambiente; para vias urbanas: 2,6 (acidentes fatais),
 * 1,5 (acidentes com feridos graves) e 1,2 (todos os acidentes com feridos). Usamos esses como leitura conservadora,
 * já que as câmeras da demonstração são de vias urbanas de Londres.
 */

export const EXPOENTES = {
  nilsson: { fatal: 4, grave: 3, feridos: 2 },
  elvikUrbano: { fatal: 2.6, grave: 1.5, feridos: 1.2 },
} as const;

export const FONTES_IMPACTO = {
  nilsson: {
    rotulo: "Nilsson, G. (2004). Traffic safety dimensions and the Power Model to describe the effect of speed on safety. Lund Institute of Technology, Bulletin 221.",
    link: "https://lup.lub.lu.se/record/21612",
  },
  elvik: {
    rotulo: "Elvik, R. (2009). The Power Model of the relationship between speed and road safety: update and new analyses. TØI report 1034/2009, tabela S1.",
    link: "https://www.toi.no/publications/the-power-model-of-the-relationship-between-speed-and-road-safety-update-and-new-analyses-article27943-29.html",
  },
};

/* Números citados no pitch do evento (fonte: DENATRAN). Em 2021 o pitch diz "+500.000" acidentes. */
export const DENATRAN = {
  2022: { acidentes: "595.572", mortes: 12201 },
  2021: { acidentes: "mais de 500.000", mortes: 11479 },
} as const;
export type AnoDenatran = keyof typeof DENATRAN;

/* Abaixo disso não há média que valha mostrar; mesmo acima, com poucas medições o número oscila muito. */
export const MIN_MEDICOES = 3;

/*
 * Cenário de referência (simulado), usado só enquanto a câmera não mediu MIN_MEDICOES velocidades: 30 velocidades
 * plausíveis numa via de obra com limite de 40 km/h, 14 delas acima do limite (média 42,6 km/h). Não são medições;
 * servem para o visitante ver a ordem de grandeza ao abrir a página.
 */
export const LIMITE_REFERENCIA = 40;
export const AMOSTRA_REFERENCIA: readonly number[] = [
  30, 32, 34, 35, 36, 36, 37, 38, 38, 39, 39, 39, 40, 40, 40, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 50, 52, 53, 55, 58, 62,
];

export interface Cenario {
  n: number;
  v0: number; // média medida
  v1: number; // média no cenário com alerta
  acima: number;
}

/*
 * Cenário com alerta: cada veículo medido acima do limite reduz `adesao` (0 a 1) do excesso.
 * Com adesao = 1, todos os que estavam acima passam exatamente no limite.
 */
export function cenarioComAlerta(velocidades: number[], limite: number, adesao: number): Cenario {
  const n = velocidades.length;
  if (!n) return { n: 0, v0: 0, v1: 0, acima: 0 };
  let soma0 = 0;
  let soma1 = 0;
  let acima = 0;
  for (const v of velocidades) {
    soma0 += v;
    if (v > limite) {
      acima++;
      soma1 += v - adesao * (v - limite);
    } else soma1 += v;
  }
  return { n, v0: soma0 / n, v1: soma1 / n, acima };
}

/* Redução relativa do risco (0 a 1) pelo modelo de potência. */
export function reducaoRisco(v0: number, v1: number, expoente: number): number {
  if (v0 <= 0) return 0;
  return Math.max(0, 1 - Math.pow(v1 / v0, expoente));
}

export function mortesEvitadas(ano: AnoDenatran, cobertura: number, reducao: number): number {
  return DENATRAN[ano].mortes * cobertura * reducao;
}
