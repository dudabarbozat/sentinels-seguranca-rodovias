"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";
import { CAMERAS_DEMO, FONTES, type CameraDemo } from "@/lib/cameras";
import { avaliarClima, buscarClimaPonto } from "@/lib/clima";
import { carregarModelo, desenharCena, processarQuadro } from "@/lib/deteccao";
import { horaCurta, num } from "@/lib/formato";
import { AMOSTRA_REFERENCIA, LIMITE_REFERENCIA, MIN_MEDICOES, cenarioComAlerta, type AnoDenatran } from "@/lib/impacto";
import { CLASSES_VEICULO, Rastreador, type Trilha } from "@/lib/rastreador";
import { PainelImpacto, ProjecaoImpacto, type EstadoClimaDemo, type Medidas } from "./PainelImpacto";
import { useSentinels } from "./Provedor";
import s from "./DemoAoVivo.module.css";

const INTERVALO_CLIPE = 60 * 1000; // procura um clipe novo da TfL (ela renova a cada poucos minutos)
const INTERVALO_ALERTA = 30 * 1000; // no máximo um alerta de cada tipo a cada 30 s na central
const INTERVALO_ANUNCIO = 20 * 1000; // resumo para leitores de tela
/* limiar um pouco abaixo do da aba de câmera: os clipes da TfL têm 352 x 288 px e o modelo leve perde veículos pequenos */
const LIMIAR = 0.3;
const LIMITE_MODELO = 60 * 1000;
const TFL = FONTES.find((f) => f.id === "tfl")!;

async function baixarClipe(cam: CameraDemo): Promise<{ url: string; modificado: string }> {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 15000);
  try {
    const r = await fetch(cam.video, { cache: "no-store", signal: controle.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    if (blob.size < 20000) throw new Error("clipe vazio");
    return { url: URL.createObjectURL(blob), modificado: r.headers.get("last-modified") ?? "" };
  } finally {
    clearTimeout(tempo);
  }
}

function aguardarQuadro(v: HTMLVideoElement): Promise<void> {
  return new Promise((ok, falha) => {
    const fim = () => {
      clearTimeout(tempo);
      v.onloadeddata = null;
      v.onerror = null;
    };
    const tempo = setTimeout(() => {
      fim();
      falha(new Error("tempo esgotado"));
    }, 12000);
    v.onloadeddata = () => {
      fim();
      ok();
    };
    v.onerror = () => {
      fim();
      falha(new Error("vídeo inválido"));
    };
  });
}

export default function DemoAoVivo() {
  const { registrarAlerta } = useSentinels();
  const secaoRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeloRef = useRef<ObjectDetection | null>(null);
  const rastreador = useRef(new Rastreador());
  const urlClipe = useRef<string | null>(null);
  const modificadoRef = useRef("");
  const camRef = useRef<CameraDemo>(CAMERAS_DEMO[0]!);
  const geracao = useRef(0);
  const ultimoT = useRef(0);
  const passada = useRef(0);
  const tempoDeteccao = useRef(0);
  const ultimoAlerta = useRef<Record<string, number>>({});
  const medidasRef = useRef<Medidas>({ veiculos: 0, invasoes: 0, velocidades: [] });
  const montado = useRef(true);

  const [camIdx, setCamIdx] = useState(0);
  const [fase, setFase] = useState<"aguardando" | "video" | "pronto" | "erro">("aguardando");
  const [modelo, setModelo] = useState<"ocioso" | "carregando" | "pronto" | "erro">("ocioso");
  const [pausado, setPausado] = useState<boolean | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [abaVisivel, setAbaVisivel] = useState(true);
  const [clipeEm, setClipeEm] = useState("");
  const [velocidadeReproducao, setVelocidadeReproducao] = useState(1);
  const [medidas, setMedidas] = useState<Medidas>(medidasRef.current);
  const [clima, setClima] = useState<EstadoClimaDemo>({ situacao: "carregando" });
  const [tentativaClima, setTentativaClima] = useState(0);
  const [adesao, setAdesao] = useState(50);
  const [cobertura, setCobertura] = useState(10);
  const [ano, setAno] = useState<AnoDenatran>(2022);
  const [anuncio, setAnuncio] = useState("");
  const [proporcao, setProporcao] = useState("11 / 9");

  const cam = CAMERAS_DEMO[camIdx]!;
  const limite = clima.situacao === "ok" ? clima.dados.limiteRecomendado : cam.limiteObra;
  const limiteRef = useRef(limite);
  limiteRef.current = limite;

  /* ---------- desenho e contagem ---------- */
  const desenhar = useCallback((ativos: Trilha[]) => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const { visao } = camRef.current;
    desenharCena(
      c,
      v.videoWidth,
      v.videoHeight,
      { area: visao.area, fecharArea: true, linhas: [["A", visao.linhaA], ["B", visao.linhaB]], rotuloArea: "Obra simulada" },
      ativos,
      limiteRef.current,
    );
  }, []);

  const alertar = useCallback(
    (tipo: "invasao" | "velocidade", detalhe: string, prioridade: "critica" | "alta" | "media") => {
      const agora = Date.now();
      if (agora - (ultimoAlerta.current[tipo] ?? 0) < INTERVALO_ALERTA) return;
      ultimoAlerta.current[tipo] = agora;
      registrarAlerta({
        tipo,
        prioridade,
        origem: "demonstracao",
        titulo: tipo === "invasao" ? "Invasão da área de obra (demonstração)" : "Excesso de velocidade na obra (demonstração)",
        detalhe,
        local: "demonstracao",
      });
    },
    [registrarAlerta],
  );

  /* Conta só a primeira passada de cada clipe: o vídeo repete em laço e os mesmos veículos não podem contar duas vezes. */
  const contabilizar = useCallback(
    (ativos: Trilha[], novos: number) => {
      const m = medidasRef.current;
      const lim = limiteRef.current;
      const nomeCam = camRef.current.nome;
      m.veiculos += novos;
      for (const tr of ativos) {
        const tipo = CLASSES_VEICULO[tr.classe] ?? "Veículo";
        if (tr.dentroArea && !tr.alertouInvasao) {
          tr.alertouInvasao = true;
          m.invasoes += 1;
          alertar("invasao", `${tipo} entrou na área de obra simulada · câmera ${nomeCam}`, "critica");
        }
        if (tr.velocidade !== undefined && !tr.alertouVelocidade) {
          tr.alertouVelocidade = true;
          m.velocidades.push(tr.velocidade);
          if (tr.velocidade > lim) {
            const exc = tr.velocidade - lim;
            alertar(
              "velocidade",
              `${tipo} a cerca de ${num(tr.velocidade, 0)} km/h na obra simulada de ${lim} km/h · câmera ${nomeCam}`,
              exc >= 20 ? "alta" : "media",
            );
          }
        }
      }
    },
    [alertar],
  );

  const laco = useCallback(
    async (gen: number) => {
      if (gen !== geracao.current) return;
      const v = videoRef.current;
      const m = modeloRef.current;
      if (v && m && v.readyState >= 2 && !v.paused && v.videoWidth) {
        try {
          const ini = performance.now();
          const preds = await m.detect(v, 20, LIMIAR);
          if (gen !== geracao.current) return;
          /* aparelho lento: reduz a velocidade de reprodução para o rastreador não perder os veículos */
          tempoDeteccao.current = tempoDeteccao.current ? tempoDeteccao.current * 0.9 + (performance.now() - ini) * 0.1 : performance.now() - ini;
          const taxa = tempoDeteccao.current > 220 ? 0.25 : tempoDeteccao.current > 110 ? 0.5 : 1;
          if (v.playbackRate !== taxa) {
            v.playbackRate = taxa;
            setVelocidadeReproducao(taxa);
          }
          const t = v.currentTime * 1000;
          if (t + 200 < ultimoT.current) {
            rastreador.current.limpar();
            passada.current += 1;
          }
          ultimoT.current = t;
          const { ativos, novos } = processarQuadro(rastreador.current, preds, v.videoWidth, v.videoHeight, t, camRef.current.visao);
          if (passada.current === 0) contabilizar(ativos, novos);
          desenhar(ativos);
        } catch {
          /* quadro perdido; segue no próximo */
        }
      }
      requestAnimationFrame(() => void laco(gen));
    },
    [contabilizar, desenhar],
  );

  const reiniciarContagemDoClipe = useCallback(() => {
    const v = videoRef.current;
    if (v) v.currentTime = 0;
    rastreador.current.limpar();
    passada.current = 0;
    ultimoT.current = 0;
  }, []);

  const trocarClipe = useCallback(
    (url: string, modificado: string) => {
      const v = videoRef.current!;
      if (urlClipe.current) URL.revokeObjectURL(urlClipe.current);
      urlClipe.current = url;
      modificadoRef.current = modificado;
      v.src = url;
      reiniciarContagemDoClipe();
      setClipeEm(modificado);
    },
    [reiniciarContagemDoClipe],
  );

  /* ---------- câmera com troca automática se o clipe falhar ---------- */
  const abrirCamera = useCallback(
    async (inicio: number) => {
      const v = videoRef.current;
      if (!v) return;
      setFase("video");
      for (let k = 0; k < CAMERAS_DEMO.length; k++) {
        const idx = (inicio + k) % CAMERAS_DEMO.length;
        const c = CAMERAS_DEMO[idx]!;
        try {
          const clipe = await baixarClipe(c);
          if (!montado.current) {
            URL.revokeObjectURL(clipe.url);
            return;
          }
          const pronto = aguardarQuadro(v);
          camRef.current = c;
          trocarClipe(clipe.url, clipe.modificado);
          await pronto;
          if (v.videoWidth && v.videoHeight) setProporcao(`${v.videoWidth} / ${v.videoHeight}`);
          setCamIdx(idx);
          setFase("pronto");
          desenhar([]);
          return;
        } catch {
          /* tenta a próxima câmera da lista */
        }
      }
      if (montado.current) setFase("erro");
    },
    [trocarClipe, desenhar],
  );

  const prepararModelo = useCallback(async () => {
    setModelo("carregando");
    try {
      /* download travado conta como erro, com ação de tentar de novo (o download segue e é reaproveitado) */
      const { modelo: m } = await Promise.race([
        carregarModelo(),
        new Promise<never>((_, falha) => setTimeout(() => falha(new Error("tempo esgotado")), LIMITE_MODELO)),
      ]);
      if (!montado.current) return;
      modeloRef.current = m;
      /* o clipe tocou enquanto o modelo baixava: volta ao início para contar a passada inteira */
      reiniciarContagemDoClipe();
      setModelo("pronto");
    } catch {
      if (montado.current) setModelo("erro");
    }
  }, [reiniciarContagemDoClipe]);

  const atualizarClipe = useCallback(async () => {
    try {
      const clipe = await baixarClipe(camRef.current);
      if (!montado.current || clipe.modificado === modificadoRef.current) {
        URL.revokeObjectURL(clipe.url);
        return;
      }
      trocarClipe(clipe.url, clipe.modificado);
      void videoRef.current?.play().catch(() => undefined);
    } catch {
      /* mantém o clipe atual */
    }
  }, [trocarClipe]);

  /* ---------- ciclo de vida ---------- */
  useEffect(() => {
    montado.current = true;
    setPausado(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const visibilidade = () => setAbaVisivel(document.visibilityState === "visible");
    visibilidade();
    document.addEventListener("visibilitychange", visibilidade);
    const el = secaoRef.current;
    const io = el ? new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting), { threshold: 0.15 }) : null;
    if (el) io?.observe(el);
    return () => {
      montado.current = false;
      geracao.current += 1;
      document.removeEventListener("visibilitychange", visibilidade);
      io?.disconnect();
      videoRef.current?.pause();
      if (urlClipe.current) URL.revokeObjectURL(urlClipe.current);
      urlClipe.current = null;
    };
  }, []);

  /* carregamento preguiçoso: só quando o bloco aparece e o visitante não pediu para pausar */
  useEffect(() => {
    if (visivel && pausado === false && fase === "aguardando") void abrirCamera(0);
  }, [visivel, pausado, fase, abrirCamera]);

  useEffect(() => {
    if (visivel && pausado === false && fase === "pronto" && modelo === "ocioso") void prepararModelo();
  }, [visivel, pausado, fase, modelo, prepararModelo]);

  const ativo = fase === "pronto" && visivel && abaVisivel && pausado === false;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!ativo) {
      v.pause();
      return;
    }
    void v.play().catch(() => undefined);
    if (modelo === "pronto") {
      geracao.current += 1;
      void laco(geracao.current);
    }
    const idClipe = setInterval(() => void atualizarClipe(), INTERVALO_CLIPE);
    const idPainel = setInterval(() => {
      const m = medidasRef.current;
      setMedidas((atual) =>
        atual.veiculos === m.veiculos && atual.invasoes === m.invasoes && atual.velocidades.length === m.velocidades.length
          ? atual
          : { veiculos: m.veiculos, invasoes: m.invasoes, velocidades: [...m.velocidades] },
      );
    }, 1000);
    return () => {
      geracao.current += 1;
      clearInterval(idClipe);
      clearInterval(idPainel);
    };
  }, [ativo, modelo, laco, atualizarClipe]);

  /* resumo discreto para leitores de tela, no máximo a cada 20 s */
  const medidasAnuncio = useRef(medidas);
  medidasAnuncio.current = medidas;
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      const m = medidasAnuncio.current;
      const c = cenarioComAlerta(m.velocidades, limiteRef.current, 1);
      setAnuncio(
        `Demonstração: ${m.veiculos} veículos analisados, ${c.acima} acima do limite, ${m.invasoes} invasões da área simulada` +
          (c.n ? `, velocidade média ${num(c.v0, 0)} km/h.` : "."),
      );
    }, INTERVALO_ANUNCIO);
    return () => clearInterval(id);
  }, [ativo]);

  /* clima real no ponto da câmera */
  useEffect(() => {
    let vivo = true;
    setClima((c) => (c.situacao === "ok" ? c : { situacao: "carregando" }));
    const consultar = () =>
      buscarClimaPonto(cam.lat, cam.lon, "Europe/London")
        .then((atual) => {
          if (vivo) setClima({ situacao: "ok", dados: avaliarClima(cam.id, cam.limiteObra, atual), dia: atual.is_day !== 0, em: Date.now() });
        })
        .catch(() => vivo && setClima({ situacao: "erro" }));
    void consultar();
    const id = setInterval(consultar, 10 * 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [cam.id, cam.lat, cam.lon, cam.limiteObra, tentativaClima]);

  function alternarPausa() {
    setPausado((p) => !p);
  }

  function trocarCamera() {
    void abrirCamera((camIdx + 1) % CAMERAS_DEMO.length);
  }

  /* até a câmera medir MIN_MEDICOES velocidades, o risco e a projeção usam o cenário de referência simulado */
  const medido = cenarioComAlerta(medidas.velocidades, limite, adesao / 100);
  const referencia = medido.n < MIN_MEDICOES;
  const limiteCenario = referencia ? LIMITE_REFERENCIA : limite;
  const cenario = referencia ? cenarioComAlerta([...AMOSTRA_REFERENCIA], LIMITE_REFERENCIA, adesao / 100) : medido;
  const iniciado = fase !== "aguardando";

  return (
    <section ref={secaoRef} className={`caixa ${s.demo}`} aria-labelledby="t-demo">
      <div className="caixa__cabeca">
        <h2 id="t-demo">Demonstração ao vivo: câmera real, obra simulada</h2>
        <Link className="btn btn-claro btn-sm" href="/tempo-real/#publicas">
          Ver todas as câmeras
        </Link>
      </div>
      <p className={s.intro}>
        Uma câmera de trânsito de Londres, publicada pela Transport for London como dado aberto. O seu navegador detecta os
        veículos, mede a velocidade entre duas linhas e confere uma área de obra fictícia desenhada sobre a pista. O painel cruza
        essas medições com estudos sobre velocidade e risco de acidente.
      </p>

      <div className={s.grade}>
        <div className={s.colunaVideo}>
          <div className={s.palco} style={{ aspectRatio: proporcao }}>
            <video
              ref={videoRef}
              className={s.video}
              muted
              playsInline
              loop
              poster={cam.imagem}
              aria-label={`Clipe da câmera ${cam.nome} (TfL, Londres) com marcações de detecção`}
            />
            <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
            <p className={s.rotulo}>
              <span className={s.rotuloReal}>Câmera real (TfL, Londres)</span>
              <span className={s.rotuloSimulado}>área de obra simulada</span>
            </p>
            {fase === "video" && (
              <div className={s.sobreposicao} role="status">
                <span className="girador" aria-hidden="true" /> Buscando o clipe mais recente da câmera...
              </div>
            )}
            {fase === "pronto" && modelo === "carregando" && (
              <div className={s.sobreposicao} role="status">
                <span className="girador" aria-hidden="true" /> Carregando o modelo de detecção (cerca de 5 MB)...
              </div>
            )}
            {pausado && !iniciado && (
              <div className={s.inicio}>
                <p>Animações reduzidas neste aparelho: a demonstração começa quando você pedir.</p>
                <button type="button" className="btn btn-primario" onClick={alternarPausa}>
                  Iniciar demonstração
                </button>
              </div>
            )}
          </div>
          {fase === "aguardando" && pausado === false && <div className="esqueleto" style={{ height: 8, marginBottom: 8 }} aria-hidden="true" />}

          {fase === "erro" && (
            <div className="erro-bloco" role="alert">
              <p>Nenhuma das câmeras da demonstração respondeu agora. A TfL pode estar trocando os clipes.</p>
              <button type="button" className="btn btn-primario btn-sm" onClick={() => void abrirCamera(camIdx)}>
                Tentar de novo
              </button>
            </div>
          )}
          {modelo === "erro" && (
            <div className="erro-bloco" role="alert">
              <p>Não foi possível baixar o modelo de detecção. Verifique a conexão; o vídeo continua sem a detecção.</p>
              <button type="button" className="btn btn-primario btn-sm" onClick={() => void prepararModelo()}>
                Tentar de novo
              </button>
            </div>
          )}

          <div className={s.barra}>
            {(iniciado || pausado === false) && (
              <button type="button" className="btn btn-claro btn-sm" onClick={alternarPausa} aria-pressed={!!pausado}>
                {pausado ? "Retomar demonstração" : "Pausar demonstração"}
              </button>
            )}
            <button type="button" className="btn btn-claro btn-sm" onClick={trocarCamera} disabled={fase === "video" || !iniciado}>
              Trocar câmera
            </button>
          </div>
          <p className={s.meta}>
            <strong>{cam.nome}</strong> ({cam.via}) · clipe de cerca de 10 s
            {clipeEm ? `, publicado às ${horaCurta(new Date(clipeEm))} no horário do seu aparelho` : ""} · limite da obra simulada{" "}
            {cam.limiteObra} km/h
            {velocidadeReproducao < 1 ? ` · reprodução a ${num(velocidadeReproducao, 2)}x para o aparelho acompanhar a detecção` : ""}
          </p>
          <p className={s.meta}>
            {TFL.atribuicao.texto} (
            <a href={TFL.atribuicao.link} target="_blank" rel="noreferrer">
              {TFL.atribuicao.rotuloLink}
            </a>
            ). A detecção roda no seu navegador; nenhuma imagem é enviada.
          </p>
        </div>

        <PainelImpacto medidas={medidas} medido={medido} cenario={cenario} referencia={referencia} limiteCenario={limiteCenario} limite={limite} limiteObra={cam.limiteObra} adesao={adesao} clima={clima} recarregarClima={() => setTentativaClima((n) => n + 1)} />
      </div>

      <ProjecaoImpacto
        cenario={cenario}
        referencia={referencia}
        medidos={medido.n}
        limite={limiteCenario}
        adesao={adesao}
        setAdesao={setAdesao}
        cobertura={cobertura}
        setCobertura={setCobertura}
        ano={ano}
        setAno={setAno}
      />

      <p className="sr" role="status" aria-live="polite">
        {anuncio}
      </p>
    </section>
  );
}
