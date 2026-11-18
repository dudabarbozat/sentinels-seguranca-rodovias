"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nomeLocal } from "@/lib/dados";
import { haQuanto, hora } from "@/lib/formato";
import { NOME_PRIORIDADE } from "@/lib/regras";
import type { Alerta, Prioridade, StatusAlerta } from "@/lib/tipos";
import Icone from "./Icone";
import { useSentinels } from "./Provedor";
import s from "./CentralAlertas.module.css";

const PESO: Record<Prioridade, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const ORIGEM: Record<Alerta["origem"], string> = { simulacao: "Simulação", camera: "Câmera", clima: "Clima", demonstracao: "Demonstração" };
const ABAS: { id: StatusAlerta; rotulo: string }[] = [
  { id: "aberto", rotulo: "Abertos" },
  { id: "reconhecido", rotulo: "Em acompanhamento" },
  { id: "encerrado", rotulo: "Histórico" },
];

export default function CentralAlertas() {
  const { pronto, estado, mudarStatus, reconhecerTodos } = useSentinels();
  const [aba, setAba] = useState<StatusAlerta>("aberto");
  const [agora, setAgora] = useState(0);
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const contagem = useMemo(() => {
    const c: Record<StatusAlerta, number> = { aberto: 0, reconhecido: 0, encerrado: 0 };
    for (const a of estado.alertas) c[a.status]++;
    return c;
  }, [estado.alertas]);

  const lista = useMemo(() => {
    const l = estado.alertas.filter((a) => a.status === aba);
    if (aba === "encerrado") return l.sort((a, b) => (b.encerradoEm ?? 0) - (a.encerradoEm ?? 0)).slice(0, 40);
    return l.sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || b.criadoEm - a.criadoEm).slice(0, 40);
  }, [estado.alertas, aba]);

  function teclaAba(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const prox = (i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length;
    setAba(ABAS[prox]!.id);
    abasRef.current[prox]?.focus();
  }

  return (
    <section className="caixa" aria-labelledby="t-central">
      <div className="caixa__cabeca">
        <h2 id="t-central">Central de alertas</h2>
        {aba === "aberto" && contagem.aberto > 1 && (
          <button type="button" className="btn btn-claro btn-sm" onClick={reconhecerTodos}>
            Reconhecer todos
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Situação dos alertas" className={s.abas}>
        {ABAS.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => {
              abasRef.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`aba-${x.id}`}
            aria-selected={aba === x.id}
            aria-controls="painel-alertas"
            tabIndex={aba === x.id ? 0 : -1}
            onClick={() => setAba(x.id)}
            onKeyDown={(e) => teclaAba(e, i)}
          >
            {x.rotulo} <span className={s.qtd}>{pronto ? contagem[x.id] : "–"}</span>
          </button>
        ))}
      </div>

      <div id="painel-alertas" role="tabpanel" aria-labelledby={`aba-${aba}`} className={s.painel}>
        {!pronto ? (
          <div className={s.lista} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="esqueleto" style={{ height: 64 }} />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="vazio-bloco">
            <Icone nome="check" tamanho={28} />
            <p>
              {aba === "aberto"
                ? "Nenhum alerta aberto. A equipe em campo está sem ocorrências pendentes."
                : aba === "reconhecido"
                  ? "Nada em acompanhamento. Alertas reconhecidos aparecem aqui até serem encerrados."
                  : "O histórico guarda os alertas encerrados neste navegador."}
            </p>
          </div>
        ) : (
          <ul className={s.lista}>
            {lista.map((a) => (
              <li key={a.id} className={`${s.item} ${s[a.prioridade]}`}>
                <span className={s.icone}>
                  <Icone nome={a.tipo} tamanho={20} />
                </span>
                <div className={s.texto}>
                  <p className={s.topo}>
                    <span className={`selo-prioridade ${a.prioridade}`}>{NOME_PRIORIDADE[a.prioridade]}</span>
                    <strong>{a.titulo}</strong>
                  </p>
                  <p className={s.detalhe}>{a.detalhe}</p>
                  <p className={s.meta}>
                    {nomeLocal(a.local)} · {ORIGEM[a.origem]} ·{" "}
                    <time dateTime={new Date(a.criadoEm).toISOString()} title={hora(a.criadoEm)}>
                      {agora ? haQuanto(a.criadoEm, agora) : hora(a.criadoEm)}
                    </time>
                    {a.status === "encerrado" && a.encerradoEm ? ` · encerrado às ${hora(a.encerradoEm)}` : ""}
                  </p>
                </div>
                <div className={s.acoes}>
                  {a.status === "aberto" && (
                    <button type="button" className="btn btn-primario btn-sm" onClick={() => mudarStatus(a.id, "reconhecido")}>
                      Reconhecer
                    </button>
                  )}
                  {a.status !== "encerrado" ? (
                    <button type="button" className="btn btn-claro btn-sm" onClick={() => mudarStatus(a.id, "encerrado")}>
                      Encerrar
                    </button>
                  ) : (
                    <button type="button" className="btn btn-claro btn-sm" onClick={() => mudarStatus(a.id, "aberto")}>
                      Reabrir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
