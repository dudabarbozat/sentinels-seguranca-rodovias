"use client";

import { useState } from "react";
import { PONTOS } from "@/lib/dados";
import { hora, num } from "@/lib/formato";
import { PNEU_MINIMO, TEMP_MAXIMA, avaliar } from "@/lib/simulador";
import { useSentinels } from "./Provedor";
import s from "./PainelSimulacao.module.css";

const LINHAS = 12;
const ROTULO = { velocidade: "Velocidade", pneu: "Pneu", invasao: "Invasão", clima: "Clima" } as const;

export default function PainelSimulacao() {
  const { pronto, estado, leituras, limitesClima, atualizar } = useSentinels();
  const [camera, setCamera] = useState(false);
  const visiveis = leituras.filter((l) => !estado.filtroPonto || l.ponto === estado.filtroPonto).slice(0, LINHAS);
  const ultima = leituras[0];

  function limite(v: number) {
    if (!Number.isFinite(v)) return;
    const x = Math.min(110, Math.max(40, Math.round(v / 10) * 10));
    atualizar((e) => ({ ...e, limite: x }));
  }

  let ok = 0;
  if (ultima) {
    ok = 1 / (1 + Math.exp(-(ultima.classePneu - PNEU_MINIMO) * 3.2));
    if (ultima.tempPneu >= TEMP_MAXIMA) ok = Math.min(ok, 0.2);
  }

  return (
    <>
      <section className="caixa caixa--centro" aria-label="Controle da coleta simulada">
        <button
          type="button"
          className={`btn ${estado.pausado ? "btn-primario" : "btn-perigo"}`}
          aria-pressed={!estado.pausado}
          onClick={() => atualizar((e) => ({ ...e, pausado: !e.pausado }))}
        >
          {estado.pausado ? "Simular Coleta de Dados em Tempo Real" : "Pausar Coleta"}
        </button>
        <p className={s.status} aria-live="polite">
          {estado.pausado ? (
            `Coleta pausada. ${estado.seq.toLocaleString("pt-BR")} leituras até agora.`
          ) : (
            <>
              <span className="ponto-vivo" aria-hidden="true" />
              Coletando: uma leitura a cada 1,5 s
            </>
          )}
        </p>
        <div className={s.opcoes}>
          <div className="grupo">
            <label htmlFor="in-limite">Limite da via (km/h)</label>
            <div className={s.limite}>
              <input type="range" min={40} max={110} step={10} value={estado.limite} aria-label="Limite da via, controle deslizante" onChange={(e) => limite(Number(e.target.value))} />
              <input id="in-limite" className="campo campo--curto" type="number" min={40} max={110} step={10} inputMode="numeric" value={estado.limite} onChange={(e) => limite(Number(e.target.value))} />
            </div>
          </div>
          <div className="grupo">
            <label htmlFor="in-ponto">Ponto de coleta</label>
            <select id="in-ponto" className="campo" value={estado.filtroPonto} onChange={(e) => atualizar((x) => ({ ...x, filtroPonto: e.target.value }))}>
              <option value="">Todos os pontos</option>
              {PONTOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grupo grupo--check">
            <input id="in-som" type="checkbox" checked={estado.som} onChange={(e) => atualizar((x) => ({ ...x, som: e.target.checked }))} />
            <label htmlFor="in-som">Som para alertas críticos</label>
          </div>
        </div>
        <p className="texto-mudo">
          Leituras simuladas na demo. Em área de obra vale o menor entre o limite da via, o da obra e o recomendado pelo clima.
        </p>
      </section>

      <section className="caixa" aria-label="Leituras por veículo">
        <div className="tabela-rolagem">
          <table className="tabela">
            <caption className="sr">Leituras por veículo, mais recentes primeiro</caption>
            <thead>
              <tr>
                <th scope="col">Carro</th>
                <th scope="col">Temperatura dos Pneus (°C)</th>
                <th scope="col">Classificação dos Pneus (0-5)</th>
                <th scope="col">Velocidade (km/h)</th>
                <th scope="col">Tamanho do Veículo</th>
                <th scope="col">Ponto</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {!pronto &&
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="esqueleto" style={{ height: 18 }} />
                    </td>
                  </tr>
                ))}
              {pronto && visiveis.length === 0 && (
                <tr>
                  <td colSpan={7} className="vazio-celula">
                    Nenhuma leitura recente neste ponto.
                  </td>
                </tr>
              )}
              {visiveis.map((l, i) => {
                const av = avaliar(l, estado.limite, limitesClima);
                const tipos = av.alertas.map((a) => a.tipo);
                return (
                  <tr key={l.n} className={i === 0 && l === leituras[0] && !estado.pausado ? s.nova : undefined}>
                    <td data-rotulo="Carro" className={s.nowrap}>
                      {l.tipo} <span className={s.placa}>{l.placa}</span>
                    </td>
                    <td data-rotulo="Temperatura dos pneus" className={l.tempPneu >= TEMP_MAXIMA ? s.vermelho : undefined}>
                      {num(l.tempPneu)} °C
                    </td>
                    <td data-rotulo="Classificação (0-5)" className={l.classePneu < PNEU_MINIMO ? s.vermelho : undefined}>
                      {num(l.classePneu)}
                    </td>
                    <td data-rotulo="Velocidade" className={tipos.includes("velocidade") ? s.vermelho : undefined}>
                      {num(l.velocidade)} km/h <span className={s.limiteCelula}>/ {av.limite}</span>
                    </td>
                    <td data-rotulo="Tamanho">{num(l.comp, 1)} m</td>
                    <td data-rotulo="Ponto" className={s.nowrap}>
                      {l.ponto} {l.obra && <span className="tag-obra">obra</span>}
                    </td>
                    <td data-rotulo="Situação">
                      {av.alertas.length ? (
                        av.alertas.map((a) => (
                          <span key={a.tipo} className={`selo selo--${a.tipo}`}>
                            {ROTULO[a.tipo]}
                          </span>
                        ))
                      ) : (
                        <span className="selo selo--ok">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="caixa caixa--centro" aria-labelledby="t-camera-pneu">
        <h2 id="t-camera-pneu" className={s.tituloCamera}>
          A câmera é usada para verificar o estado dos pneus.
        </h2>
        <p className={s.subtitulo}>Classificação do pneu do veículo mais recente (simulada na demo)</p>
        <p className="texto-mudo">Mau estado: nota abaixo de 1,5 ou temperatura a partir de 90 °C.</p>
        <div className={s.botoes}>
          <button type="button" className="btn btn-primario" disabled={camera} onClick={() => setCamera(true)}>
            Ligar Câmera
          </button>
          <button type="button" className="btn btn-perigo" disabled={!camera} onClick={() => setCamera(false)}>
            Desligar Câmera
          </button>
        </div>
        {camera && ultima && (
          <>
            <div className={s.camera}>
              <div className={s.faixa} aria-hidden="true" />
              <span className={s.selo}>Câmera simulada na demo</span>
            </div>
            <div className={s.saida} aria-live="polite">
              <p className={s.veiculo}>
                {ultima.tipo} {ultima.placa} · {ultima.ponto} · {hora(ultima.quando)}
              </p>
              <div className={s.barra}>
                <span>Pneu em Mau Estado: {num(1 - ok)}</span>
                <i style={{ ["--v" as string]: `${Math.round((1 - ok) * 100)}%` }} className={s.mau} />
              </div>
              <div className={s.barra}>
                <span>Pneu OK: {num(ok)}</span>
                <i style={{ ["--v" as string]: `${Math.round(ok * 100)}%` }} className={s.ok} />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
