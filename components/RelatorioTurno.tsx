"use client";

import { useState } from "react";
import { horaCurta } from "@/lib/formato";
import { gerarRelatorio, type Relatorio } from "@/lib/regras";
import { useSentinels } from "./Provedor";
import s from "./RelatorioTurno.module.css";

const RISCO = { baixo: "Risco baixo", moderado: "Risco moderado", alto: "Risco alto" };
const PESO = { alta: "Alta", media: "Média", baixa: "Baixa" };

export default function RelatorioTurno() {
  const { pronto, estado, clima, atualizar } = useSentinels();
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [geradoEm, setGeradoEm] = useState(0);

  function gerar() {
    setRel(
      gerarRelatorio({
        inicio: estado.inicioTurno,
        agora: Date.now(),
        limiteVia: estado.limite,
        alertas: estado.alertas,
        clima: clima.situacao === "ok" ? clima.dados : null,
        pendentes: estado.ocorrencias.filter((o) => o.status !== "resolvida"),
      }),
    );
    setGeradoEm(Date.now());
  }

  return (
    <section className="caixa" aria-labelledby="t-relatorio">
      <div className="caixa__cabeca">
        <h2 id="t-relatorio">Relatório de turno</h2>
        <p className="texto-mudo">{pronto ? `Turno desde ${horaCurta(estado.inicioTurno)}` : " "}</p>
      </div>

      {!rel ? (
        <p className={s.intro}>
          Resumo dos alertas do turno, do clima nas obras e dos relatos pendentes, com recomendações para a passagem de turno.
          As recomendações seguem regras fixas sobre esses dados.
        </p>
      ) : (
        <div className={s.resultado} aria-live="polite">
          <p className={s.cabecalho}>
            <span className={`${s.risco} ${s[rel.risco]}`}>{RISCO[rel.risco]}</span>
            <span className="texto-mudo">Gerado às {horaCurta(geradoEm)}</span>
          </p>
          <p className={s.resumo}>{rel.resumo}</p>
          <div className={s.colunas}>
            <div>
              <h3>Destaques</h3>
              <ul>
                {rel.destaques.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Recomendações</h3>
              <ol className={s.recs}>
                {rel.recomendacoes.map((r, i) => (
                  <li key={i}>
                    <span className={`selo-prioridade ${r.prioridade}`}>{PESO[r.prioridade]}</span> {r.acao}{" "}
                    <span className="texto-mudo">({r.responsavel})</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="linha-botoes">
        <button type="button" className="btn btn-primario" onClick={gerar} disabled={!pronto}>
          {rel ? "Atualizar relatório" : "Gerar relatório de turno"}
        </button>
        <button
          type="button"
          className="btn btn-claro"
          disabled={!pronto}
          onClick={() => {
            if (window.confirm("Iniciar um novo turno? O relatório passa a contar a partir de agora.")) {
              atualizar((e) => ({ ...e, inicioTurno: Date.now() }));
              setRel(null);
            }
          }}
        >
          Iniciar novo turno
        </button>
      </div>
    </section>
  );
}
