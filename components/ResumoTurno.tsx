"use client";

import Link from "next/link";
import { OBRAS } from "@/lib/dados";
import { horaCurta } from "@/lib/formato";
import { useSentinels } from "./Provedor";

/* Linha de situação do turno e ação principal da tela inicial. */
export default function ResumoTurno() {
  const { pronto, estado } = useSentinels();
  const abertos = estado.alertas.filter((a) => a.status === "aberto");
  const criticos = abertos.filter((a) => a.prioridade === "critica").length;
  return (
    <div className="resumo-turno">
      <p className="lead">
        {pronto ? (
          <>
            Turno desde {horaCurta(estado.inicioTurno)} · {OBRAS.length} obras ativas ·{" "}
            <span className={criticos ? "texto-critico" : undefined}>
              {abertos.length} {abertos.length === 1 ? "alerta aberto" : "alertas abertos"}
              {criticos ? `, ${criticos} ${criticos === 1 ? "crítico" : "críticos"}` : ""}
            </span>
          </>
        ) : (
          "Carregando situação do turno..."
        )}
      </p>
      <div className="linha-botoes">
        <Link className="btn btn-claro" href="/tempo-real/">
          Coletar dados em tempo real
        </Link>
        <span className="texto-mudo">{estado.pausado ? "Coleta simulada pausada" : "Coleta simulada em andamento"}</span>
      </div>
    </div>
  );
}
