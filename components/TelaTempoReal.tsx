"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Orientacao from "./Orientacao";
import PainelSimulacao from "./PainelSimulacao";

const Visao = dynamic(() => import("./Visao"), {
  ssr: false,
  loading: () => <div className="caixa"><div className="esqueleto" style={{ height: 220 }} /></div>,
});

const CamerasPublicas = dynamic(() => import("./CamerasPublicas"), {
  ssr: false,
  loading: () => <div className="caixa"><div className="esqueleto" style={{ height: 320 }} /></div>,
});

const ABAS = [
  { id: "simulacao", rotulo: "Simulação" },
  { id: "camera", rotulo: "Câmera ou vídeo" },
  { id: "publicas", rotulo: "Câmeras públicas" },
] as const;

export default function TelaTempoReal() {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("simulacao");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  /* /tempo-real/#publicas (ou #camera, #simulacao) abre direto na aba */
  useEffect(() => {
    const lerHash = () => {
      const alvo = ABAS.find((a) => `#${a.id}` === window.location.hash);
      if (alvo) setAba(alvo.id);
    };
    lerHash();
    window.addEventListener("hashchange", lerHash);
    return () => window.removeEventListener("hashchange", lerHash);
  }, []);

  return (
    <>
      <div className="caixa cabecalho-tela">
        <h1 className="titulo-secao">Coletar Dados em Tempo Real</h1>
        <div role="tablist" aria-label="Fonte dos dados" className="abas-tela">
          {ABAS.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls={`painel-${a.id}`}
              tabIndex={aba === a.id ? 0 : -1}
              onClick={() => setAba(a.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const j = (i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length;
                  setAba(ABAS[j]!.id);
                  refs.current[j]?.focus();
                }
              }}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <Orientacao id="tempo-real">
        Sem câmera, a aba Simulação gera uma leitura a cada 1,5 s. Em “Câmera ou vídeo” o navegador detecta os veículos de
        verdade: marque duas linhas para estimar a velocidade e a área de obra para receber alertas de invasão. “Câmeras
        públicas” testa a mesma detecção em câmeras reais de órgãos de trânsito.
      </Orientacao>

      <div id="painel-simulacao" role="tabpanel" aria-labelledby="aba-simulacao" hidden={aba !== "simulacao"}>
        <PainelSimulacao />
      </div>
      <div id="painel-camera" role="tabpanel" aria-labelledby="aba-camera" hidden={aba !== "camera"}>
        {aba === "camera" && <Visao />}
      </div>
      <div id="painel-publicas" role="tabpanel" aria-labelledby="aba-publicas" hidden={aba !== "publicas"}>
        {aba === "publicas" && <CamerasPublicas />}
      </div>
    </>
  );
}
