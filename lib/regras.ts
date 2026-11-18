/* Relatório de turno e triagem de ocorrências por regras fixas sobre os dados do turno. */
import { OBRAS, nomeLocal } from "./dados";
import { horaCurta } from "./formato";
import type { Alerta, ClimaObra, Ocorrencia, Prioridade, TipoAlerta } from "./tipos";

export type NivelRisco = "baixo" | "moderado" | "alto";
export type Peso = "alta" | "media" | "baixa";

export interface Relatorio {
  risco: NivelRisco;
  resumo: string;
  destaques: string[];
  recomendacoes: { acao: string; prioridade: Peso; responsavel: string }[];
}

export interface Triagem {
  itens: { id: string; prioridade: Peso; categoria: string; acao: string; prazo: string }[];
}

export interface DadosTurno {
  inicio: number;
  agora: number;
  limiteVia: number;
  alertas: Alerta[];
  clima: ClimaObra[] | null;
  pendentes: Ocorrencia[];
}

const NOME_TIPO: Record<TipoAlerta, string> = {
  velocidade: "excesso de velocidade",
  pneu: "pneu em mau estado",
  invasao: "invasão da área de obra",
  clima: "condição de clima",
};

function contar<T extends string>(lista: T[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const x of lista) c[x] = (c[x] ?? 0) + 1;
  return c;
}

function maisFrequente(c: Record<string, number>): [string, number] | null {
  let melhor: [string, number] | null = null;
  for (const [k, v] of Object.entries(c)) if (!melhor || v > melhor[1]) melhor = [k, v];
  return melhor;
}

/* ---------- relatório de turno ---------- */

export function gerarRelatorio(d: DadosTurno): Relatorio {
  const doTurno = d.alertas.filter((a) => a.criadoEm >= d.inicio);
  const porTipo = contar(doTurno.map((a) => a.tipo));
  const porLocal = contar(doTurno.map((a) => a.local));
  const criticos = doTurno.filter((a) => a.prioridade === "critica").length;
  const abertos = d.alertas.filter((a) => a.status === "aberto");
  const climaRuim = (d.clima ?? []).filter((c) => c.condicoes.length > 0);
  const risco: NivelRisco = criticos >= 3 || climaRuim.some((c) => c.condicoes.some((x) => x.prioridade === "alta"))
    ? "alto"
    : criticos > 0 || doTurno.length >= 10 || climaRuim.length > 0
      ? "moderado"
      : "baixo";

  const local = maisFrequente(porLocal);
  const tipo = maisFrequente(porTipo);
  const resumo = doTurno.length
    ? `Desde as ${horaCurta(d.inicio)} foram ${doTurno.length} alertas, ${criticos} críticos. ` +
      (tipo ? `O mais frequente foi ${NOME_TIPO[tipo[0] as TipoAlerta]} (${tipo[1]}). ` : "") +
      (local ? `${nomeLocal(local[0])} concentrou ${local[1]} ocorrências. ` : "") +
      `${abertos.length} alertas seguem sem reconhecimento.`
    : `Desde as ${horaCurta(d.inicio)} nenhum alerta foi registrado. ${d.pendentes.length} ocorrências de colaboradores seguem pendentes.`;

  const destaques: string[] = [];
  if (criticos) destaques.push(`${criticos} invasões da área de obra no turno.`);
  if (porTipo.velocidade) destaques.push(`${porTipo.velocidade} veículos acima do limite perto das equipes.`);
  if (porTipo.pneu) destaques.push(`${porTipo.pneu} veículos com pneu em estado crítico.`);
  for (const c of climaRuim) destaques.push(`${c.obra}: ${c.condicoes.map((x) => x.texto.toLowerCase()).join("; ")}.`);
  if (d.pendentes.length) destaques.push(`${d.pendentes.length} relatos de colaboradores aguardando análise.`);
  if (!destaques.length) destaques.push("Turno sem eventos relevantes até agora.");

  const recomendacoes: Relatorio["recomendacoes"] = [];
  if (criticos && local) {
    recomendacoes.push({ acao: `Reforçar o isolamento com cones e cavaletes extras em ${nomeLocal(local[0])}.`, prioridade: "alta", responsavel: "Encarregado da frente" });
  }
  if (porTipo.velocidade) {
    recomendacoes.push({ acao: "Antecipar o painel de mensagem variável e pedir apoio de fiscalização no horário de pico.", prioridade: porTipo.velocidade >= 5 ? "alta" : "media", responsavel: "Centro de operações" });
  }
  for (const c of climaRuim) {
    const obra = OBRAS.find((o) => o.id === c.obra);
    recomendacoes.push({ acao: `Reduzir o limite sinalizado na ${c.obra} para ${c.limiteRecomendado} km/h enquanto durar a condição (hoje ${obra?.limite ?? d.limiteVia} km/h).`, prioridade: "alta", responsavel: "Centro de operações" });
  }
  if (abertos.length) recomendacoes.push({ acao: `Reconhecer ou encerrar os ${abertos.length} alertas em aberto antes da troca de turno.`, prioridade: "media", responsavel: "Operador de plantão" });
  if (d.pendentes.length) recomendacoes.push({ acao: "Responder aos relatos pendentes dos colaboradores.", prioridade: "baixa", responsavel: "Segurança do trabalho" });
  if (!recomendacoes.length) recomendacoes.push({ acao: "Manter o monitoramento e conferir a sinalização na troca de turno.", prioridade: "baixa", responsavel: "Operador de plantão" });

  return { risco, resumo, destaques: destaques.slice(0, 6), recomendacoes: recomendacoes.slice(0, 6) };
}

/* ---------- triagem de ocorrências ---------- */

export function triarOcorrencias(lista: Ocorrencia[]): Triagem {
  return {
    itens: lista.map((o) => {
      const texto = o.descricao.toLowerCase();
      const grave = o.gravidade === "alta" || o.tipo === "Invasão da área de obra" || /cone|equipe|freou|atropel/.test(texto);
      const prioridade: Peso = grave ? "alta" : o.gravidade === "media" || o.tipo === "Sinalização danificada" ? "media" : "baixa";
      const mapa: Record<string, [string, string]> = {
        "Quase acidente": ["Risco à equipe", "Revisar a distância da sinalização de aproximação e ouvir a equipe envolvida."],
        "Invasão da área de obra": ["Risco à equipe", "Reforçar o isolamento e conferir o alinhamento dos cones na faixa interditada."],
        "Sinalização danificada": ["Sinalização", "Enviar equipe de conservação para refixar ou trocar a placa."],
        "Equipamento com defeito": ["Equipamento", "Abrir chamado de manutenção do ponto de coleta e checar a conexão."],
        Sugestão: ["Melhoria", "Avaliar na próxima reunião de segurança e responder ao colaborador."],
      };
      const [categoria, acao] = mapa[o.tipo] ?? ["Outros", "Analisar o relato com a equipe responsável."];
      return { id: o.id, prioridade, categoria, acao, prazo: prioridade === "alta" ? "Hoje" : prioridade === "media" ? "Até 48 h" : "Esta semana" };
    }),
  };
}

export const NOME_PRIORIDADE: Record<Prioridade, string> = { critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa" };
