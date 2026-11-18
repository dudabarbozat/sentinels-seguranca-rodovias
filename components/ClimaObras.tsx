"use client";

import { OBRAS } from "@/lib/dados";
import { descreverTempo } from "@/lib/clima";
import { horaCurta, num } from "@/lib/formato";
import Icone from "./Icone";
import { useSentinels } from "./Provedor";
import s from "./ClimaObras.module.css";

export default function ClimaObras({ compacto = false }: { compacto?: boolean }) {
  const { clima, recarregarClima } = useSentinels();

  return (
    <section className="caixa" aria-labelledby="t-clima" aria-busy={clima.situacao === "carregando"}>
      <div className="caixa__cabeca">
        <h2 id="t-clima">Clima nas obras</h2>
        <button type="button" className="botao-icone" onClick={recarregarClima} aria-label="Atualizar clima" disabled={clima.situacao === "carregando"}>
          <Icone nome="recarregar" />
        </button>
      </div>

      {clima.situacao === "erro" && (
        <div className="erro-bloco" role="alert">
          <p>{clima.erro} O limite recomendado volta ao padrão da obra até a próxima consulta.</p>
          <button type="button" className="btn btn-primario btn-sm" onClick={recarregarClima}>
            Tentar de novo
          </button>
        </div>
      )}

      {clima.situacao === "carregando" && clima.dados.length === 0 && (
        <ul className={s.lista}>
          {OBRAS.map((o) => (
            <li key={o.id} className="esqueleto" style={{ height: 58 }} />
          ))}
        </ul>
      )}

      {clima.dados.length > 0 && (
        <ul className={s.lista}>
          {clima.dados.map((c) => {
            const obra = OBRAS.find((o) => o.id === c.obra)!;
            const reduzido = c.limiteRecomendado < obra.limite;
            return (
              <li key={c.obra} className={`${s.item} ${reduzido ? s.atencao : ""}`}>
                <div className={s.cabeca}>
                  <strong>{c.obra}</strong>
                  <span className={s.tempo}>{descreverTempo(c.codigo)}</span>
                  <span className="placa-limite placa-limite--mini" role="img" aria-label={`Limite recomendado ${c.limiteRecomendado} km/h`}>
                    {c.limiteRecomendado}
                  </span>
                </div>
                {!compacto && (
                  <p className={s.dados}>
                    Chuva {num(c.chuva, 1)} mm · Visibilidade {c.visibilidade >= 10000 ? "acima de 10 km" : `${Math.round(c.visibilidade)} m`} · Rajadas{" "}
                    {Math.round(c.rajada)} km/h
                  </p>
                )}
                <p className={s.condicao}>
                  {reduzido ? c.condicoes.map((x) => x.texto).join(". ") + "." : `Sem restrição de clima. Limite da obra: ${obra.limite} km/h.`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {clima.atualizadoEm && (
        <p className="texto-mudo">
          Dados reais da Open-Meteo para o ponto médio de cada obra, consultados às {horaCurta(clima.atualizadoEm)}.
        </p>
      )}
    </section>
  );
}
