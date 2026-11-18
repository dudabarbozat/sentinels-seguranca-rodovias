"use client";

import { useState } from "react";
import { OBRAS, PONTOS } from "@/lib/dados";
import { avaliar } from "@/lib/simulador";
import type { Estado, Leitura } from "@/lib/tipos";
import { useSentinels } from "./Provedor";
import s from "./Indicadores.module.css";

interface Def {
  rotulo: string;
  tom?: "laranja" | "vermelho" | "verde" | "verdeClaro";
  valor: (e: Estado, l: Leitura[], lim: Record<string, number>) => string;
  nota: (e: Estado, l: Leitura[]) => string;
}

const INDICADORES: Record<string, Def> = {
  abertos: {
    rotulo: "Alertas abertos", tom: "vermelho",
    valor: (e) => String(e.alertas.filter((a) => a.status === "aberto").length),
    nota: () => "aguardando reconhecimento",
  },
  criticos: {
    rotulo: "Invasões no turno", tom: "vermelho",
    valor: (e) => String(e.alertas.filter((a) => a.tipo === "invasao" && a.criadoEm >= e.inicioTurno).length),
    nota: () => "área de obra",
  },
  velMedia: {
    rotulo: "Velocidade média",
    valor: (_e, l) => (l.length ? Math.round(l.reduce((s, x) => s + x.velocidade, 0) / l.length) + " km/h" : "–"),
    nota: (_e, l) => `últimas ${l.length} leituras`,
  },
  excesso: {
    rotulo: "Acima do limite", tom: "laranja",
    valor: (e, l, lim) => {
      if (!l.length) return "–";
      const n = l.filter((x) => avaliar(x, e.limite, lim).alertas.some((a) => a.tipo === "velocidade")).length;
      return Math.round((n / l.length) * 100) + "%";
    },
    nota: (e) => `limite da via ${e.limite} km/h`,
  },
  pendentes: {
    rotulo: "Relatos pendentes", tom: "verde",
    valor: (e) => String(e.ocorrencias.filter((o) => o.status !== "resolvida").length),
    nota: () => "abertos ou em análise",
  },
  obras: {
    rotulo: "Obras ativas", tom: "verdeClaro",
    valor: () => String(OBRAS.length),
    nota: () => `${OBRAS.reduce((s, o) => s + parseInt(o.equipe.split("· ")[1] ?? "0", 10), 0)} colaboradores na pista`,
  },
  leituras: {
    rotulo: "Leituras processadas",
    valor: (e) => e.seq.toLocaleString("pt-BR"),
    nota: () => "desde o início da demo",
  },
  pontos: {
    rotulo: "Pontos de coleta",
    valor: () => `${PONTOS.filter((p) => p.status === "online").length}/${PONTOS.length}`,
    nota: () => "online agora",
  },
};

export default function Indicadores() {
  const { pronto, estado, leituras, limitesClima, atualizar } = useSentinels();
  const [editar, setEditar] = useState(false);
  const visiveis = Object.keys(INDICADORES).filter((k) => estado.indicadores.includes(k));

  return (
    <section className="caixa" aria-labelledby="t-indicadores">
      <div className="caixa__cabeca">
        <h2 id="t-indicadores">Indicadores</h2>
        <button type="button" className="btn btn-claro btn-sm" aria-expanded={editar} aria-controls="opcoes-indicadores" onClick={() => setEditar((v) => !v)}>
          {editar ? "Concluir" : "Personalizar"}
        </button>
      </div>
      {editar && (
        <fieldset className={s.opcoes} id="opcoes-indicadores">
          <legend>Mostrar no painel</legend>
          {Object.entries(INDICADORES).map(([k, d]) => (
            <label key={k} className="marcar">
              <input
                type="checkbox"
                checked={estado.indicadores.includes(k)}
                onChange={(e) =>
                  atualizar((x) => ({
                    ...x,
                    indicadores: e.target.checked ? [...x.indicadores, k] : x.indicadores.filter((i) => i !== k),
                  }))
                }
              />
              <span>{d.rotulo}</span>
            </label>
          ))}
        </fieldset>
      )}
      {visiveis.length === 0 ? (
        <p className="texto-mudo">Nenhum indicador selecionado. Use “Personalizar”.</p>
      ) : (
        <div className={s.grade}>
          {visiveis.map((k) => {
            const d = INDICADORES[k]!;
            return (
              <div key={k} className={`${s.kpi} ${d.tom ? s[d.tom] : ""}`}>
                <p className={s.rotulo}>{d.rotulo}</p>
                <p className={s.valor}>{pronto ? d.valor(estado, leituras, limitesClima) : "–"}</p>
                <p className={s.nota}>{pronto ? d.nota(estado, leituras) : " "}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
