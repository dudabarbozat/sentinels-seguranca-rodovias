"use client";

import { useState } from "react";
import { OBRAS, PONTOS, TIPOS_OCORRENCIA, nomeLocal } from "@/lib/dados";
import { dataCurta, km, mascaraMatricula } from "@/lib/formato";
import { triarOcorrencias, type Triagem } from "@/lib/regras";
import type { Gravidade, StatusOcorrencia } from "@/lib/tipos";
import { useSentinels } from "./Provedor";
import s from "./Feedback.module.css";

const STATUS: Record<StatusOcorrencia, string> = { aberta: "Aberta", "em-analise": "Em análise", resolvida: "Resolvida" };
const GRAV: Record<Gravidade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PESO = { alta: "Alta", media: "Média", baixa: "Baixa" };
const ROTULO_FILTRO = { "": "Todas", aberta: "Abertas", "em-analise": "Em análise", resolvida: "Resolvidas" };

export default function Feedback() {
  const { pronto, estado, atualizar } = useSentinels();
  const [tipo, setTipo] = useState(TIPOS_OCORRENCIA[0]!);
  const [local, setLocal] = useState(OBRAS[0]!.id);
  const [kmTxt, setKmTxt] = useState("");
  const [grav, setGrav] = useState<Gravidade>("media");
  const [desc, setDesc] = useState("");
  const [autor, setAutor] = useState("");
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [ok, setOk] = useState("");
  const [filtro, setFiltro] = useState<StatusOcorrencia | "">("");
  const [triagem, setTriagem] = useState<Triagem | null>(null);

  const kmNum = kmTxt ? Number(kmTxt.replace(",", ".")) : null;
  const erros = {
    desc: desc.trim().length < 10 ? "Escreva pelo menos 10 caracteres sobre o que aconteceu." : "",
    autor: autor && !/^COL-\d{4}$/.test(autor) ? "A matrícula tem 4 números: COL-0000." : "",
    km: kmNum !== null && (!Number.isFinite(kmNum) || kmNum < 335 || kmNum > 390) ? "O trecho monitorado vai do km 335 ao 390." : "",
  };

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTocado({ desc: true, autor: true, km: true });
    const primeiro = erros.desc ? "f-descricao" : erros.km ? "f-km" : erros.autor ? "f-autor" : "";
    if (primeiro) {
      document.getElementById(primeiro)?.focus();
      return;
    }
    const id = "OC-" + String(estado.proximaOcorrencia).padStart(4, "0");
    atualizar((x) => ({
      ...x,
      proximaOcorrencia: x.proximaOcorrencia + 1,
      ocorrencias: [
        { id, tipo, local, km: kmNum, gravidade: grav, descricao: desc.trim(), autor: autor || "Anônimo", criada: new Date().toISOString(), status: "aberta" },
        ...x.ocorrencias,
      ],
    }));
    setDesc("");
    setKmTxt("");
    setAutor("");
    setTocado({});
    setFiltro("");
    setOk(`${id} registrada. O centro de operações já vê o relato.`);
  }

  function triar() {
    setTriagem(triarOcorrencias(estado.ocorrencias.filter((o) => o.status !== "resolvida")));
  }

  const lista = estado.ocorrencias.filter((o) => !filtro || o.status === filtro);
  const triPor = new Map((triagem?.itens ?? []).map((i) => [i.id, i]));
  const ordenada = triagem
    ? [...lista].sort((a, b) => {
        const pa = triPor.get(a.id)?.prioridade;
        const pb = triPor.get(b.id)?.prioridade;
        const v = { alta: 0, media: 1, baixa: 2 };
        return (pa ? v[pa] : 3) - (pb ? v[pb] : 3);
      })
    : lista;

  return (
    <div className="colunas-feedback">
      <form className="caixa pilha" onSubmit={enviar} noValidate aria-labelledby="t-nova">
        <h2 id="t-nova">Nova ocorrência</h2>
        <div className="grupo">
          <label htmlFor="f-tipo">Tipo</label>
          <select id="f-tipo" className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_OCORRENCIA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className={s.duplo}>
          <div className="grupo">
            <label htmlFor="f-local">Local</label>
            <select id="f-local" className="campo" value={local} onChange={(e) => setLocal(e.target.value)}>
              <optgroup label="Obras ativas">
                {OBRAS.map((o) => (
                  <option key={o.id} value={o.id}>{o.id} · {o.titulo}</option>
                ))}
              </optgroup>
              <optgroup label="Pontos de coleta">
                {PONTOS.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} · {p.nome}</option>
                ))}
              </optgroup>
              <option value="outro">Outro trecho</option>
            </select>
          </div>
          <div className="grupo">
            <label htmlFor="f-km">
              Km <span className="texto-mudo">(opcional)</span>
            </label>
            <input
              id="f-km"
              className="campo"
              inputMode="decimal"
              placeholder="352,8"
              value={kmTxt}
              onChange={(e) => setKmTxt(e.target.value.replace(/[^\d,.]/g, "").slice(0, 6))}
              onBlur={() => setTocado((t) => ({ ...t, km: true }))}
              aria-invalid={!!(tocado.km && erros.km)}
              aria-describedby="f-km-erro"
            />
          </div>
        </div>
        <p className="erro" id="f-km-erro">{tocado.km ? erros.km : ""}</p>
        <fieldset className={`grupo ${s.gravidade}`}>
          <legend>Gravidade</legend>
          {(Object.keys(GRAV) as Gravidade[]).map((g) => (
            <label key={g}>
              <input type="radio" name="gravidade" value={g} checked={grav === g} onChange={() => setGrav(g)} /> {GRAV[g]}
            </label>
          ))}
        </fieldset>
        <div className="grupo">
          <label htmlFor="f-descricao">O que aconteceu</label>
          <textarea
            id="f-descricao"
            className="campo"
            rows={4}
            value={desc}
            maxLength={600}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, desc: true }))}
            aria-invalid={!!(tocado.desc && erros.desc)}
            aria-describedby="f-descricao-erro f-descricao-cont"
            placeholder="Descreva o que viu, onde e o que foi feito na hora."
          />
          <div className={s.linhaErro}>
            <p className="erro" id="f-descricao-erro">{tocado.desc ? erros.desc : ""}</p>
            <span className="texto-mudo" id="f-descricao-cont">{desc.length}/600</span>
          </div>
        </div>
        <div className="grupo">
          <label htmlFor="f-autor">
            Matrícula <span className="texto-mudo">(vazio = anônimo)</span>
          </label>
          <input
            id="f-autor"
            className="campo"
            autoComplete="off"
            inputMode="numeric"
            placeholder="COL-0000"
            value={autor}
            onChange={(e) => setAutor(mascaraMatricula(e.target.value))}
            onBlur={() => setTocado((t) => ({ ...t, autor: true }))}
            aria-invalid={!!(tocado.autor && erros.autor)}
            aria-describedby="f-autor-erro"
          />
          <p className="erro" id="f-autor-erro">{tocado.autor ? erros.autor : ""}</p>
        </div>
        <button type="submit" className="btn btn-primario" disabled={!pronto}>
          Enviar feedback
        </button>
        <p className="confirmacao" role="status">{ok}</p>
      </form>

      <section className="caixa" aria-labelledby="t-ocorrencias">
        <div className="caixa__cabeca">
          <h2 id="t-ocorrencias">Ocorrências</h2>
          <div className={s.filtros} role="group" aria-label="Filtrar por status">
            {(["", "aberta", "em-analise", "resolvida"] as const).map((f) => (
              <button key={f || "todas"} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                {ROTULO_FILTRO[f]}
              </button>
            ))}
          </div>
        </div>

        <div className={s.triagem}>
          <div>
            <strong>Triagem dos relatos pendentes</strong>
            <p className="texto-mudo">Sugere prioridade, categoria, próxima ação e prazo para cada relato.</p>
          </div>
          <button type="button" className="btn btn-claro" onClick={triar} disabled={!pronto}>
            {triagem ? "Refazer triagem" : "Fazer triagem"}
          </button>
        </div>
        {triagem && (
          <p className="texto-mudo" role="status">
            {triagem.itens.length
              ? "Lista ordenada pela prioridade sugerida. Regras: risco à equipe, gravidade informada e tipo do relato."
              : "Não há relatos pendentes para triar."}
          </p>
        )}

        {!pronto ? (
          <div className="esqueleto" style={{ height: 200 }} />
        ) : ordenada.length === 0 ? (
          <div className="vazio-bloco">
            <p>Nenhuma ocorrência com esse status.</p>
          </div>
        ) : (
          <ul className={s.lista}>
            {ordenada.map((o) => {
              const t = triPor.get(o.id);
              return (
                <li key={o.id} className={`${s.item} ${s[o.gravidade]}`}>
                  <div className={s.topo}>
                    <span className={s.id}>{o.id}</span>
                    <span className={`grav grav--${o.gravidade}`}>{GRAV[o.gravidade]}</span>
                    <span className={`status status--${o.status}`}>{STATUS[o.status]}</span>
                  </div>
                  <p className={s.tipo}>{o.tipo}</p>
                  <p className={s.texto}>{o.descricao}</p>
                  {t && (
                    <div className={s.sugestao}>
                      <span className={`selo-prioridade ${t.prioridade}`}>Prioridade {PESO[t.prioridade]}</span>{" "}
                      <strong>{t.categoria}</strong> · {t.acao} <span className="texto-mudo">Prazo: {t.prazo}</span>
                    </div>
                  )}
                  <div className={s.rodape}>
                    <span>
                      {nomeLocal(o.local)}
                      {o.km ? ` · ${km(o.km)}` : ""}
                    </span>
                    <span>
                      {o.autor} · {dataCurta(o.criada)}
                    </span>
                    <label className="sr" htmlFor={`st-${o.id}`}>
                      Status da {o.id}
                    </label>
                    <select
                      id={`st-${o.id}`}
                      value={o.status}
                      onChange={(e) =>
                        atualizar((x) => ({
                          ...x,
                          ocorrencias: x.ocorrencias.map((y) => (y.id === o.id ? { ...y, status: e.target.value as StatusOcorrencia } : y)),
                        }))
                      }
                    >
                      {(Object.keys(STATUS) as StatusOcorrencia[]).map((k) => (
                        <option key={k} value={k}>
                          {STATUS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
