"use client";

import { descreverTempo } from "@/lib/clima";
import { horaCurta, num } from "@/lib/formato";
import {
  AMOSTRA_REFERENCIA,
  DENATRAN,
  EXPOENTES,
  FONTES_IMPACTO,
  MIN_MEDICOES,
  mortesEvitadas,
  reducaoRisco,
  type AnoDenatran,
  type Cenario,
} from "@/lib/impacto";
import type { ClimaObra } from "@/lib/tipos";
import s from "./DemoAoVivo.module.css";

export interface Medidas {
  veiculos: number;
  invasoes: number;
  velocidades: number[];
}

export type EstadoClimaDemo = { situacao: "carregando" } | { situacao: "erro" } | { situacao: "ok"; dados: ClimaObra; dia: boolean; em: number };

type Natureza = "real" | "simulado" | "estimativa";
const ROTULO: Record<Natureza, string> = { real: "real", simulado: "simulado", estimativa: "estimativa" };

export function Selo({ tipo, texto }: { tipo: Natureza; texto?: string }) {
  return <span className={`selo-natureza selo-natureza--${tipo}`}>{texto ?? ROTULO[tipo]}</span>;
}

function pct(r: number): string {
  return `${num(r * 100, 1)}%`;
}

/* Linha presente nos dois modos, para a troca de simulado para medido não mexer no layout. */
function Base({ referencia, medidos }: { referencia: boolean; medidos: number }) {
  return (
    <p className={s.base}>
      {referencia ? (
        <>
          Cenário de referência (simulado) até a câmera medir {MIN_MEDICOES} velocidades · {medidos} de {MIN_MEDICOES} medidas
        </>
      ) : (
        <>
          Com base em {medidos} velocidades medidas nesta câmera{medidos < 30 ? " · amostra pequena, o número oscila" : ""}
        </>
      )}
    </p>
  );
}

export function PainelImpacto({
  medidas,
  medido,
  cenario,
  referencia,
  limiteCenario,
  limite,
  limiteObra,
  adesao,
  clima,
  recarregarClima,
}: {
  medidas: Medidas;
  medido: Cenario;
  cenario: Cenario;
  referencia: boolean;
  limiteCenario: number;
  limite: number;
  limiteObra: number;
  adesao: number;
  clima: EstadoClimaDemo;
  recarregarClima: () => void;
}) {
  const n = EXPOENTES.nilsson;
  const e = EXPOENTES.elvikUrbano;

  return (
    <aside className={s.painel} aria-labelledby="t-impacto">
      <h3 id="t-impacto">Impacto estimado</h3>
      <p className="texto-mudo">Atualizado com o que a câmera mede desde que você abriu a página.</p>

      <dl className={s.contadores}>
        <div>
          <dt>
            Veículos analisados <Selo tipo="real" />
          </dt>
          <dd>{medidas.veiculos}</dd>
        </div>
        <div>
          <dt>
            Acima do limite <Selo tipo="real" />
          </dt>
          <dd>
            {medido.acima}
            <small> de {medido.n} medidos</small>
          </dd>
        </div>
        <div>
          <dt>
            Invasões da área <Selo tipo="simulado" texto="área simulada" />
          </dt>
          <dd>{medidas.invasoes}</dd>
        </div>
        <div>
          <dt>
            Velocidade média <Selo tipo="real" texto="medida" />
          </dt>
          <dd>{medido.n ? `${num(medido.v0, 0)} km/h` : "–"}</dd>
        </div>
      </dl>

      <div className={`${s.bloco} ${s.modo}`} data-modo={referencia ? "simulado" : "medido"}>
        <h4>
          Redução de risco se o alerta funcionar {referencia ? <Selo tipo="simulado" /> : <Selo tipo="estimativa" />}
        </h4>
        <Base referencia={referencia} medidos={medido.n} />
        <div className={s.reducoes}>
          <p>
            <strong>{pct(reducaoRisco(cenario.v0, cenario.v1, n.fatal))}</strong>
            <span>menos risco de acidente fatal</span>
          </p>
          <p>
            <strong>{pct(reducaoRisco(cenario.v0, cenario.v1, n.feridos))}</strong>
            <span>menos risco de acidente com feridos</span>
          </p>
        </div>
        <p className="texto-mudo">
          {cenario.acima === 0
            ? `Nenhum veículo medido acima de ${limiteCenario} km/h até agora, então o alerta não teria o que reduzir.`
            : `Se ${adesao}% dos motoristas acima de ${limiteCenario} km/h reduzissem até o limite, a média ${referencia ? "do cenário simulado" : "medida"} cairia de ${num(cenario.v0, 1)} para ${num(cenario.v1, 1)} km/h.`}{" "}
          Modelo de potência de Nilsson (2004). Com os expoentes de Elvik (2009) para vias urbanas, mais conservadores:{" "}
          {pct(reducaoRisco(cenario.v0, cenario.v1, e.fatal))} e {pct(reducaoRisco(cenario.v0, cenario.v1, e.feridos))}.
        </p>
      </div>

      <div className={s.bloco}>
        <div className={s.cabecaBloco}>
          <h4>
            Clima no ponto da câmera <Selo tipo="real" />
          </h4>
          {clima.situacao === "erro" && (
            <button type="button" className="btn btn-claro btn-sm" onClick={recarregarClima}>
              Tentar de novo
            </button>
          )}
        </div>
        {clima.situacao === "carregando" && <div className="esqueleto" style={{ height: 44 }} role="status" aria-label="Consultando o clima" />}
        {clima.situacao === "erro" && <p className="texto-mudo">Clima indisponível agora; vale o limite da obra, {limiteObra} km/h.</p>}
        {clima.situacao === "ok" && (
          <>
            <p>
              {descreverTempo(clima.dados.codigo)} em Londres · chuva {num(clima.dados.chuva, 1)} mm · visibilidade{" "}
              {clima.dados.visibilidade >= 10000 ? "acima de 10 km" : `${Math.round(clima.dados.visibilidade)} m`}
              {clima.dia ? "" : " · noite"}
            </p>
            {!clima.dia && (
              <p className="aviso-demo">
                É noite em Londres: com faróis e pouca luz, o modelo leve perde parte dos veículos e os contadores sobem mais devagar.
              </p>
            )}
            <p className="texto-mudo">
              {limite < limiteObra
                ? `${clima.dados.condicoes.map((c) => c.texto).join(". ")}. Pela regra do protótipo o limite na obra cai de ${limiteObra} para ${limite} km/h, e mais veículos passam a contar como acima do limite.`
                : `Sem chuva nem baixa visibilidade: vale o limite da obra, ${limiteObra} km/h.`}{" "}
              Regra do protótipo, não dado científico: chuva a partir de 0,5 mm ou visibilidade abaixo de 2 km reduzem o limite em 10
              a 20 km/h (mínimo de 30). Open-Meteo, consultado às {horaCurta(clima.em)}.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

export function ProjecaoImpacto({
  cenario,
  referencia,
  medidos,
  limite,
  adesao,
  setAdesao,
  cobertura,
  setCobertura,
  ano,
  setAno,
}: {
  cenario: Cenario;
  referencia: boolean;
  medidos: number;
  limite: number;
  adesao: number;
  setAdesao: (n: number) => void;
  cobertura: number;
  setCobertura: (n: number) => void;
  ano: AnoDenatran;
  setAno: (a: AnoDenatran) => void;
}) {
  const rN = reducaoRisco(cenario.v0, cenario.v1, EXPOENTES.nilsson.fatal);
  const rE = reducaoRisco(cenario.v0, cenario.v1, EXPOENTES.elvikUrbano.fatal);
  const mortes = DENATRAN[ano].mortes;
  const evitN = mortesEvitadas(ano, cobertura / 100, rN);
  const evitE = mortesEvitadas(ano, cobertura / 100, rE);
  const fmt = (x: number) => (x > 0 && x < 1 ? "menos de 1" : Math.round(x).toLocaleString("pt-BR"));

  return (
    <div className={s.projecao} role="group" aria-labelledby="t-projecao">
      <h3 id="t-projecao">
        E se valesse para as rodovias brasileiras? {referencia ? <Selo tipo="simulado" /> : null} <Selo tipo="estimativa" texto="estimativa ilustrativa" />
      </h3>
      <div className={s.hipoteses}>
        <div className="grupo">
          <label htmlFor="pj-ano">Ano dos dados (DENATRAN)</label>
          <select id="pj-ano" className="campo" value={ano} onChange={(e) => setAno(Number(e.target.value) as AnoDenatran)}>
            <option value={2022}>2022 · {DENATRAN[2022].acidentes} acidentes, {DENATRAN[2022].mortes.toLocaleString("pt-BR")} mortes</option>
            <option value={2021}>2021 · {DENATRAN[2021].acidentes} acidentes, {DENATRAN[2021].mortes.toLocaleString("pt-BR")} mortes</option>
          </select>
        </div>
        <div className="grupo">
          <label htmlFor="pj-cobertura">
            Vias com o sistema: <output htmlFor="pj-cobertura">{cobertura}%</output>
          </label>
          <input id="pj-cobertura" className={s.faixa} type="range" min={1} max={100} step={1} value={cobertura} onChange={(e) => setCobertura(Number(e.target.value))} aria-valuetext={`${cobertura}% das vias`} />
        </div>
        <div className="grupo">
          <label htmlFor="pj-adesao">
            Motoristas que obedecem ao alerta: <output htmlFor="pj-adesao">{adesao}%</output>
          </label>
          <input id="pj-adesao" className={s.faixa} type="range" min={0} max={100} step={5} value={adesao} onChange={(e) => setAdesao(Number(e.target.value))} aria-valuetext={`${adesao}% dos motoristas`} />
        </div>
      </div>

      <div className={s.modo} data-modo={referencia ? "simulado" : "medido"}>
        <Base referencia={referencia} medidos={medidos} />
        <p className={s.resultado}>
          <strong>{fmt(evitN)}</strong> {evitN >= 1.5 ? "mortes por ano poderiam ser evitadas" : "morte por ano poderia ser evitada"}, numa estimativa ilustrativa
          <span>
            {" "}
            (ou {fmt(evitE)} com o expoente mais conservador de Elvik para vias urbanas). Não é previsão nem promessa de resultado.
          </span>
        </p>
      </div>

      <details className={s.calculo}>
        <summary>Como chegamos nesse número</summary>
        <ol>
          <li>
            {referencia ? (
              <>
                <strong>Amostra de referência (simulada).</strong> A câmera mediu {medidos} de {MIN_MEDICOES} velocidades; até lá o cálculo usa 30
                velocidades fictícias numa obra com limite de {limite} km/h ({AMOSTRA_REFERENCIA.join(", ")} km/h). Média v0 = {num(cenario.v0, 1)} km/h.
              </>
            ) : (
              <>
                <strong>Medição (real).</strong> A câmera mediu {cenario.n} velocidades; média v0 = {num(cenario.v0, 1)} km/h. A velocidade é estimada
                pelo tempo entre as linhas A e B e por uma distância aproximada, estimada pela perspectiva da imagem.
              </>
            )}
          </li>
          <li>
            <strong>Cenário com alerta (hipótese).</strong> Cada veículo acima de {limite} km/h reduz {adesao}% do excesso: nova velocidade = v −{" "}
            {num(adesao / 100, 2)} × (v − {limite}). Nova média v1 = {num(cenario.v1, 1)} km/h.
          </li>
          <li>
            <strong>Modelo de potência (estimativa).</strong> Risco depois / risco antes = (v1 / v0)<sup>k</sup>, com k = 4 para acidentes fatais, 3 para
            fatais ou graves e 2 para acidentes com feridos (Nilsson). Redução do risco fatal = 1 − (v1 / v0)<sup>4</sup> ={" "}
            {pct(rN)}; com k = 2,6 (Elvik, vias urbanas) = {pct(rE)}.
          </li>
          <li>
            <strong>Projeção (ilustrativa).</strong> Mortes evitadas = {mortes.toLocaleString("pt-BR")} mortes ({ano}, DENATRAN) × {cobertura}% das vias
            × {pct(rN)} = {fmt(evitN)}.
          </li>
        </ol>
        <p>Hipóteses e limites:</p>
        <ul>
          <li>O modelo de potência relaciona a velocidade média do tráfego ao número de acidentes; aplicar a redução de acidentes fatais ao número de mortes é uma simplificação.</li>
          <li>As velocidades vêm de poucos segundos de vídeo de vias urbanas de Londres, com distância entre as linhas estimada, não medida. Rodovias brasileiras têm outro perfil de velocidade e de tráfego.</li>
          <li>A obra, o limite de {limite} km/h e o efeito do alerta são simulados. A adesão e a cobertura são hipóteses que você escolhe.</li>
          <li>A regra de clima é do protótipo. Os números zeram quando a página é recarregada.</li>
        </ul>
        <p>Fontes:</p>
        <ul>
          <li>
            <a href={FONTES_IMPACTO.nilsson.link} target="_blank" rel="noreferrer">
              {FONTES_IMPACTO.nilsson.rotulo}
            </a>
          </li>
          <li>
            <a href={FONTES_IMPACTO.elvik.link} target="_blank" rel="noreferrer">
              {FONTES_IMPACTO.elvik.rotulo}
            </a>
          </li>
          <li>DENATRAN, números citados no pitch do Hackarteris (2023).</li>
        </ul>
      </details>
    </div>
  );
}
