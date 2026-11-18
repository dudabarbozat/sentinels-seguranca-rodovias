"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CircleMarker, Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { FONTES, listarCameras, type CameraPublica, type IdFonte } from "@/lib/cameras";
import Visao, { type FontePublica } from "./Visao";
import s from "./CamerasPublicas.module.css";

const MAX_OPCOES = 400;

export default function CamerasPublicas() {
  const [fonteId, setFonteId] = useState<IdFonte>("tfl");
  const [cameras, setCameras] = useState<CameraPublica[]>([]);
  const [situacao, setSituacao] = useState<"carregando" | "ok" | "erro">("carregando");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<CameraPublica | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const divMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<LMap | null>(null);
  const marcadores = useRef<Map<string, CircleMarker>>(new Map());
  const fonte = FONTES.find((f) => f.id === fonteId)!;

  useEffect(() => {
    let ativo = true;
    setSituacao("carregando");
    setSelecionada(null);
    setBusca("");
    setCameras([]);
    listarCameras(fonteId)
      .then((l) => {
        if (!ativo) return;
        setCameras(l);
        setSituacao(l.length ? "ok" : "erro");
      })
      .catch(() => ativo && setSituacao("erro"));
    return () => {
      ativo = false;
    };
  }, [fonteId, tentativa]);

  /* mini mapa com as câmeras da fonte */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !divMapa.current) return;
      if (!mapa.current) {
        mapa.current = L.map(divMapa.current, { preferCanvas: true, scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa.current);
      }
      const m = mapa.current;
      marcadores.current.forEach((mk) => mk.remove());
      marcadores.current.clear();
      if (!cameras.length) {
        m.setView(fonte.centro, 10);
        return;
      }
      for (const c of cameras) {
        const mk = L.circleMarker([c.lat, c.lon], { radius: 5, color: "#fff", weight: 1, fillColor: "#03509d", fillOpacity: 0.9 })
          .addTo(m)
          .bindTooltip(c.nome);
        mk.on("click", () => setSelecionada(c));
        marcadores.current.set(c.id, mk);
      }
      m.fitBounds(L.latLngBounds(cameras.map((c) => [c.lat, c.lon] as [number, number])), { padding: [16, 16] });
    })();
    return () => {
      cancelado = true;
    };
  }, [cameras, fonte.centro]);

  useEffect(() => {
    marcadores.current.forEach((mk, id) =>
      mk.setStyle(id === selecionada?.id ? { fillColor: "#ff7800", radius: 9 } : { fillColor: "#03509d", radius: 5 }),
    );
    if (selecionada && mapa.current) mapa.current.setView([selecionada.lat, selecionada.lon], Math.max(mapa.current.getZoom(), 13));
  }, [selecionada]);

  useEffect(
    () => () => {
      mapa.current?.remove();
      mapa.current = null;
    },
    [],
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (q ? cameras.filter((c) => c.nome.toLowerCase().includes(q)) : cameras).slice(0, MAX_OPCOES);
  }, [cameras, busca]);

  const publica: FontePublica | null = selecionada
    ? {
        chave: `${fonteId}:${selecionada.id}`,
        nome: selecionada.nome,
        tipo: selecionada.tipo,
        url: selecionada.url,
        intervaloSeg: selecionada.intervaloSeg,
        atribuicao: (
          <>
            {fonte.atribuicao.texto} (
            <a href={fonte.atribuicao.link} target="_blank" rel="noreferrer">
              {fonte.atribuicao.rotuloLink}
            </a>
            )
          </>
        ),
      }
    : null;

  return (
    <>
      <section className="caixa" aria-labelledby="t-publicas">
        <h2 id="t-publicas">Câmeras públicas de trânsito</h2>
        <p className={s.intro}>
          Teste a detecção em câmeras reais de órgãos de trânsito que publicam as imagens como dados abertos. O vídeo de cada
          câmera vem direto do órgão; nada passa por servidor nosso.
        </p>
        <div className={s.grade}>
          <div className={s.controles}>
            <div className="grupo">
              <label htmlFor="cp-fonte">Cidade e órgão</label>
              <select id="cp-fonte" className="campo" value={fonteId} onChange={(e) => setFonteId(e.target.value as IdFonte)}>
                {FONTES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="grupo">
              <label htmlFor="cp-busca">Buscar câmera</label>
              <input
                id="cp-busca"
                className="campo"
                type="search"
                placeholder={fonteId === "tfl" ? "Ex.: A406, Westminster" : "Ex.: I-110, US-101"}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                disabled={situacao !== "ok"}
              />
            </div>
            {situacao === "carregando" && (
              <div role="status">
                <div className="esqueleto" style={{ height: 200 }} />
                {fonteId !== "tfl" && <p className="texto-mudo">A lista da Caltrans tem cerca de 900 KB e o servidor responde devagar; pode levar até meio minuto.</p>}
              </div>
            )}
            {situacao === "erro" && (
              <div className="erro-bloco" role="alert">
                <p>Não foi possível carregar a lista de câmeras desta fonte agora.</p>
                <button type="button" className="btn btn-primario btn-sm" onClick={() => setTentativa((n) => n + 1)}>
                  Tentar de novo
                </button>
              </div>
            )}
            {situacao === "ok" && (
              <div className="grupo">
                <label htmlFor="cp-lista">
                  Câmeras ({filtradas.length}
                  {filtradas.length === MAX_OPCOES ? "+" : ""} de {cameras.length})
                </label>
                <select
                  id="cp-lista"
                  className={`campo ${s.lista}`}
                  size={9}
                  value={selecionada?.id ?? ""}
                  onChange={(e) => setSelecionada(cameras.find((c) => c.id === e.target.value) ?? null)}
                >
                  {filtradas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {filtradas.length === 0 && <p className="texto-mudo">Nenhuma câmera com esse nome.</p>}
              </div>
            )}
          </div>
          <div className={s.mapaBox}>
            <div ref={divMapa} className={s.mapa} role="region" aria-label={`Mapa das câmeras de ${fonte.cidade}; clique num ponto para escolher`} />
          </div>
        </div>
        <p className="texto-mudo">
          {fonteId === "tfl"
            ? "A TfL publica um clipe de cerca de 10 segundos por câmera, renovado a cada poucos minutos: dá para rastrear e estimar velocidade dentro do clipe."
            : "A Caltrans publica uma foto por câmera, renovada a cada poucos minutos: a detecção conta veículos e confere a área de obra, sem velocidade."}
        </p>
      </section>
      <Visao publica={publica} />
    </>
  );
}
