"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { OBRAS, PONTOS, TRACADO, posKm, type Obra, type PontoColeta } from "@/lib/dados";
import { km, num } from "@/lib/formato";
import { descreverTempo } from "@/lib/clima";
import type { ClimaObra } from "@/lib/tipos";
import { useSentinels } from "./Provedor";
import s from "./MapaVias.module.css";

const ICONE_CAMERA = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 7.5h12v9H3zM15 10.5l6-3v9l-6-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICONE_CONE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 4h4l5 15H5L10 4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.3 10h7.4M6.9 14.5h10.2M3 19.5h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function esc(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function popupObra(o: Obra, c?: ClimaObra): string {
  const clima = c
    ? `<br><strong>${esc(descreverTempo(c.codigo))}</strong>, limite recomendado ${c.limiteRecomendado} km/h` +
      (c.condicoes.length ? `<br>${esc(c.condicoes.map((x) => x.texto).join(". "))}` : "")
    : "";
  return `<strong>${esc(o.id + " · " + o.titulo)}</strong><br>${esc(km(o.kmIni) + " a " + num(o.kmFim, 1))}<br>${esc(o.faixa)}<br>${esc(o.equipe)}<br>Limite da obra: ${o.limite} km/h${clima}`;
}

function popupPonto(p: PontoColeta): string {
  return `<strong>${esc(p.id + " · " + p.nome)}</strong><br>${esc(p.equip)}<br>${p.status === "online" ? "Online" : "Conexão instável"}`;
}

export default function MapaVias() {
  const { clima } = useSentinels();
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<LMap | null>(null);
  const marcadores = useRef<Record<string, Marker>>({});
  const [situacao, setSituacao] = useState<"carregando" | "ok" | "erro">("carregando");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelado || !div.current || mapa.current) return;
        const m = L.map(div.current, { scrollWheelZoom: false });
        mapa.current = m;
        const camada = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m);
        camada.on("tileerror", () => setSituacao((x) => (x === "ok" ? "ok" : "erro")));
        camada.on("load", () => setSituacao("ok"));

        const icone = (classe: string, svg: string, acima = false) =>
          L.divIcon({ className: `marcador ${classe}`, html: `<span>${svg}</span>`, iconSize: [30, 30], iconAnchor: acima ? [15, 44] : [15, 15], popupAnchor: [0, acima ? -42 : -14] });

        const linha = L.polyline(TRACADO, { color: "#03509d", weight: 8, opacity: 0.85 }).addTo(m);
        L.polyline(TRACADO, { color: "#f8f8f8", weight: 2, dashArray: "8 8" }).addTo(m);
        for (const o of OBRAS) {
          const pts: [number, number][] = [];
          for (let k = o.kmIni; k <= o.kmFim + 0.001; k += 0.2) pts.push(posKm(Math.min(k, o.kmFim)));
          L.polyline(pts, { color: "#ff7800", weight: 12, opacity: 0.9, lineCap: "butt" }).addTo(m);
          marcadores.current[o.id] = L.marker(posKm((o.kmIni + o.kmFim) / 2), {
            icon: icone("marcador--obra", ICONE_CONE, true), title: `${o.id} ${o.titulo}`, alt: `Obra ${o.id}`, zIndexOffset: 500,
          }).addTo(m).bindPopup(popupObra(o));
        }
        for (const p of PONTOS) {
          marcadores.current[p.id] = L.marker(posKm(p.km), {
            icon: icone(p.status === "online" ? "marcador--ponto" : "marcador--instavel", ICONE_CAMERA), title: `${p.id} ${p.nome}`, alt: `Ponto de coleta ${p.id}`,
          }).addTo(m).bindPopup(popupPonto(p));
        }
        m.fitBounds(linha.getBounds(), { padding: [24, 24] });
      } catch {
        if (!cancelado) setSituacao("erro");
      }
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      marcadores.current = {};
    };
  }, []);

  /* atualiza os popups das obras com o clima real */
  useEffect(() => {
    for (const o of OBRAS) {
      const c = clima.dados.find((x) => x.obra === o.id);
      marcadores.current[o.id]?.setPopupContent(popupObra(o, c));
    }
  }, [clima.dados]);

  function focar(id: string) {
    const m = marcadores.current[id];
    if (!m || !mapa.current) return;
    mapa.current.setView(m.getLatLng(), 14);
    m.openPopup();
    div.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <>
      <section className="caixa" aria-labelledby="t-mapa-caixa">
        <h2 id="t-mapa-caixa" className="sr">
          Mapa do trecho
        </h2>
        <div className={s.moldura} aria-busy={situacao === "carregando"}>
          <div ref={div} className={s.mapa} role="region" aria-label="Mapa do trecho com pontos de coleta e obras" />
          {situacao === "carregando" && <div className={`esqueleto ${s.esq}`} aria-hidden="true" />}
        </div>
        {situacao === "erro" && (
          <p className="erro" role="alert">
            Parte do mapa não carregou. Verifique a conexão; os pontos e obras continuam listados abaixo.
          </p>
        )}
        <ul className={s.legenda} aria-label="Legenda">
          <li><span className={`${s.sim} ${s.ponto}`} />Ponto de coleta</li>
          <li><span className={`${s.sim} ${s.instavel}`} />Conexão instável</li>
          <li><span className={`${s.sim} ${s.obra}`} />Obra ativa</li>
        </ul>
      </section>
      <div className="duas-colunas">
        <section className="caixa" aria-labelledby="t-lista-obras">
          <h2 id="t-lista-obras">Obras ativas</h2>
          <ul className={s.lista}>
            {OBRAS.map((o) => {
              const c = clima.dados.find((x) => x.obra === o.id);
              const lim = c ? c.limiteRecomendado : o.limite;
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => focar(o.id)}>
                    <span className={`${s.sim} ${s.obra}`} />
                    <span className={s.texto}>
                      <strong>{o.id} · {o.titulo}</strong>
                      <small>{km(o.kmIni)} a {num(o.kmFim, 1)} · {o.faixa}</small>
                      {c && <small>{descreverTempo(c.codigo)}{c.condicoes.length ? " · limite reduzido pelo clima" : ""}</small>}
                    </span>
                    <span className="placa-limite placa-limite--mini" role="img" aria-label={`Limite ${lim} km/h`}>{lim}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="caixa" aria-labelledby="t-lista-pontos">
          <h2 id="t-lista-pontos">Pontos de coleta</h2>
          <ul className={s.lista}>
            {PONTOS.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => focar(p.id)}>
                  <span className={`${s.sim} ${p.status === "online" ? s.ponto : s.instavel}`} />
                  <span className={s.texto}>
                    <strong>{p.id} · {p.nome}</strong>
                    <small>{p.equip}{p.status === "online" ? "" : " · conexão instável"}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
