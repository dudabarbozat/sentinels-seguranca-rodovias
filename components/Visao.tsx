"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";
import { carregarModelo as baixarModelo, comCacheBuster, deteccoesVeiculo, desenharCena, processarQuadro } from "@/lib/deteccao";
import { num } from "@/lib/formato";
import { CLASSES_VEICULO, Rastreador, dentroPoligono, type Trilha } from "@/lib/rastreador";
import type { ConfigVisao, Ponto2D } from "@/lib/tipos";
import { useSentinels } from "./Provedor";
import s from "./Visao.module.css";

type Modo = "detectar" | "linhaA" | "linhaB" | "area";
type TipoFonte = "webcam" | "video" | "publica-video" | "publica-imagem";
type Fonte = { tipo: TipoFonte; nome: string } | null;

/* Câmera de órgão de trânsito com dados abertos (ver lib/cameras.ts). */
export interface FontePublica {
  chave: string;
  nome: string;
  tipo: "video" | "imagem";
  url: string;
  intervaloSeg: number;
  atribuicao: ReactNode;
}

const PADRAO: ConfigVisao = {
  linhaA: [{ x: 0.05, y: 0.55 }, { x: 0.95, y: 0.55 }],
  linhaB: [{ x: 0.05, y: 0.78 }, { x: 0.95, y: 0.78 }],
  distancia: 20,
  area: [{ x: 0.55, y: 0.45 }, { x: 0.8, y: 0.45 }, { x: 0.98, y: 0.98 }, { x: 0.6, y: 0.98 }],
};

function mensagemCamera(e: unknown): string {
  const nome = e instanceof DOMException ? e.name : "";
  if (nome === "NotAllowedError") return "A permissão da câmera foi negada. Libere o acesso nas configurações do navegador ou envie um vídeo.";
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return "Nenhuma câmera encontrada neste aparelho. Envie um vídeo gravado da via.";
  if (nome === "NotReadableError") return "A câmera está em uso por outro aplicativo. Feche-o e tente de novo.";
  return "Não foi possível abrir a câmera. Tente enviar um vídeo.";
}

export default function Visao({ publica }: { publica?: FontePublica | null }) {
  const modoPublico = publica !== undefined;
  const { estado, atualizar, registrarAlerta } = useSentinels();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeloRef = useRef<ObjectDetection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const rodando = useRef(false);
  const rastreador = useRef(new Rastreador());
  const ultimoT = useRef(0);
  const ultimoUI = useRef(0);
  const temp = useRef<Ponto2D[]>([]);
  const geracao = useRef(0);
  const fonteRefAtual = useRef<TipoFonte | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const timerFonte = useRef<ReturnType<typeof setInterval> | null>(null);
  const semCorsRef = useRef(false);

  const [fonte, setFonte] = useState<Fonte>(null);
  const [modelo, setModelo] = useState<"ocioso" | "carregando" | "pronto" | "erro">("ocioso");
  const [backend, setBackend] = useState("");
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<Modo>("detectar");
  const [pontosTemp, setPontosTemp] = useState(0);
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [total, setTotal] = useState(0);
  const [limite, setLimite] = useState(60);
  const [semDeteccao, setSemDeteccao] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(0);

  fonteRefAtual.current = fonte?.tipo ?? null;
  const cfg = estado.visao;
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const modoRef = useRef(modo);
  modoRef.current = modo;
  const limiteRef = useRef(limite);
  limiteRef.current = limite;

  const salvarVisao = useCallback((f: (v: ConfigVisao) => ConfigVisao) => atualizar((e) => ({ ...e, visao: f(e.visao) })), [atualizar]);

  /* ---------- desenho ---------- */
  const midia = useCallback((): { W: number; H: number } | null => {
    if (fonteRefAtual.current === "publica-imagem") {
      const i = imgRef.current;
      return i && i.naturalWidth ? { W: i.naturalWidth, H: i.naturalHeight } : null;
    }
    const v = videoRef.current;
    return v && v.videoWidth ? { W: v.videoWidth, H: v.videoHeight } : null;
  }, []);

  const desenhar = useCallback((ativos: Trilha[]) => {
    const c = canvasRef.current;
    const m = midia();
    if (!c || !m) return;
    const conf = cfgRef.current;
    const marcando = modoRef.current;
    desenharCena(
      c,
      m.W,
      m.H,
      {
        area: marcando === "area" ? temp.current : conf.area,
        fecharArea: marcando !== "area",
        linhas: [
          ["A", marcando === "linhaA" ? temp.current : conf.linhaA],
          ["B", marcando === "linhaB" ? temp.current : conf.linhaB],
        ],
      },
      ativos,
      limiteRef.current,
    );
  }, [midia]);

  /* ---------- laço de detecção ---------- */
  const laco = useCallback(async (gen: number) => {
    if (!rodando.current || gen !== geracao.current) return;
    const v = videoRef.current;
    const m = modeloRef.current;
    if (v && m && v.readyState >= 2 && !v.paused && v.videoWidth) {
      try {
        const preds = await m.detect(v, 20, 0.4);
        const t = fonteRefAtual.current === "webcam" ? performance.now() : v.currentTime * 1000;
        if (t < ultimoT.current) rastreador.current.limpar();
        ultimoT.current = t;
        const { ativos, novos } = processarQuadro(rastreador.current, preds, v.videoWidth, v.videoHeight, t, cfgRef.current);
        if (novos) setTotal((n) => n + novos);

        for (const tr of ativos) {
          const tipo = CLASSES_VEICULO[tr.classe] ?? "Veículo";
          if (tr.dentroArea && !tr.alertouInvasao) {
            tr.alertouInvasao = true;
            registrarAlerta({ tipo: "invasao", prioridade: "critica", origem: "camera", titulo: "Invasão da área de obra", detalhe: `${tipo} #${tr.id} entrou na área marcada no vídeo`, local: "camera" });
          }
          if (tr.velocidade !== undefined && tr.velocidade > limiteRef.current && !tr.alertouVelocidade) {
            tr.alertouVelocidade = true;
            const exc = tr.velocidade - limiteRef.current;
            registrarAlerta({
              tipo: "velocidade",
              prioridade: exc >= 20 ? "alta" : "media",
              origem: "camera",
              titulo: "Excesso de velocidade (estimado)",
              detalhe: `${tipo} #${tr.id} a cerca de ${num(tr.velocidade, 0)} km/h em trecho de ${limiteRef.current}`,
              local: "camera",
            });
          }
        }
        desenhar(ativos);
        const agora = performance.now();
        if (agora - ultimoUI.current > 300) {
          ultimoUI.current = agora;
          setTrilhas(ativos.map((x) => ({ ...x })));
        }
      } catch (e) {
        /* vídeo de outra origem sem CORS: o navegador bloqueia a leitura dos pixels */
        if (e instanceof DOMException && e.name === "SecurityError") {
          setSemDeteccao(true);
          rodando.current = false;
          return;
        }
      }
    } else {
      desenhar([]);
    }
    requestAnimationFrame(() => void laco(gen));
  }, [desenhar, registrarAlerta]);

  const carregarModelo = useCallback(async () => {
    if (modeloRef.current) return true;
    setModelo("carregando");
    try {
      const { modelo: m, backend: b } = await baixarModelo();
      modeloRef.current = m;
      setBackend(b);
      setModelo("pronto");
      return true;
    } catch {
      setModelo("erro");
      setErro("Não foi possível baixar o modelo de detecção. Verifique a conexão e tente de novo.");
      return false;
    }
  }, []);

  const pararFonte = useCallback(() => {
    rodando.current = false;
    geracao.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    if (timerFonte.current) clearInterval(timerFonte.current);
    timerFonte.current = null;
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.srcObject = null;
      v.removeAttribute("src");
      v.removeAttribute("crossorigin");
      v.load();
    }
    const i = imgRef.current;
    if (i) {
      i.onload = null;
      i.onerror = null;
      i.removeAttribute("src");
    }
    semCorsRef.current = false;
    setSemDeteccao(false);
    rastreador.current.limpar();
    setTrilhas([]);
    setFonte(null);
  }, []);

  const iniciarLaco = useCallback(async () => {
    const ok = await carregarModelo();
    if (!ok) return;
    rodando.current = true;
    geracao.current += 1;
    void laco(geracao.current);
  }, [carregarModelo, laco]);

  async function usarCamera() {
    setErro("");
    pararFonte();
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro("Este navegador não oferece acesso à câmera. Envie um vídeo.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setFonte({ tipo: "webcam", nome: "Câmera do aparelho" });
      await iniciarLaco();
    } catch (e) {
      setErro(mensagemCamera(e));
    }
  }

  async function usarVideo(arq: File | undefined) {
    if (!arq) return;
    setErro("");
    if (!arq.type.startsWith("video/")) {
      setErro("Escolha um arquivo de vídeo (MP4, WebM ou MOV).");
      return;
    }
    if (arq.size > 300 * 1024 * 1024) {
      setErro("O vídeo passa de 300 MB. Envie um trecho menor.");
      return;
    }
    pararFonte();
    const url = URL.createObjectURL(arq);
    urlRef.current = url;
    const v = videoRef.current!;
    v.src = url;
    v.loop = true;
    try {
      await v.play();
      setFonte({ tipo: "video", nome: arq.name });
      await iniciarLaco();
    } catch {
      setErro("Não foi possível reproduzir este vídeo neste navegador. Tente outro formato (MP4 H.264).");
    }
  }

  /* ---------- câmeras públicas ---------- */
  const detectarImagem = useCallback(async (fp: FontePublica) => {
    const i = imgRef.current;
    const m = modeloRef.current;
    if (!i || !m || !i.naturalWidth) return;
    try {
      const preds = await m.detect(i, 30, 0.35);
      const W = i.naturalWidth;
      const H = i.naturalHeight;
      const area = cfgRef.current.area.map((p) => ({ x: p.x * W, y: p.y * H }));
      const ativos: Trilha[] = deteccoesVeiculo(preds).map((d, k) => {
          const [x, y, w, h] = d.caixa;
          const base = { x: x + w / 2, y: y + h };
          return {
            id: k + 1, classe: d.classe, caixa: d.caixa, x: base.x, y: base.y, visto: 0,
            ladoA: 0, ladoB: 0, dentroArea: dentroPoligono(base, area), alertouInvasao: false, alertouVelocidade: false,
          };
        });
      const dentro = ativos.filter((a) => a.dentroArea);
      if (dentro.length) {
        registrarAlerta({
          chave: `camera-publica:${fp.chave}:invasao`,
          tipo: "invasao",
          prioridade: "critica",
          origem: "camera",
          titulo: "Veículo na área de obra marcada",
          detalhe: `${dentro.length} veículo(s) dentro da área na câmera ${fp.nome}`,
          local: "camera",
        });
      }
      desenhar(ativos);
      setTrilhas(ativos);
      setAtualizadoEm(Date.now());
    } catch (e) {
      if (e instanceof DOMException && e.name === "SecurityError") setSemDeteccao(true);
    }
  }, [desenhar, registrarAlerta]);

  const carregarImagem = useCallback((fp: FontePublica, comCors: boolean) => {
    const i = imgRef.current;
    if (!i) return;
    if (comCors) i.crossOrigin = "anonymous";
    else i.removeAttribute("crossorigin");
    i.onload = () => {
      setAtualizadoEm(Date.now());
      desenhar([]);
      if (comCors) void detectarImagem(fp);
    };
    i.onerror = () => {
      if (comCors) {
        /* sem CORS a imagem ainda pode ser exibida, mas o canvas não pode ler os pixels */
        semCorsRef.current = true;
        setSemDeteccao(true);
        carregarImagem(fp, false);
      } else {
        setErro("A imagem desta câmera não carregou agora. Tente outra câmera.");
      }
    };
    i.src = comCacheBuster(fp.url);
  }, [desenhar, detectarImagem]);

  const usarPublica = useCallback(async (fp: FontePublica) => {
    setErro("");
    pararFonte();
    if (fp.tipo === "video") {
      const v = videoRef.current!;
      v.crossOrigin = "anonymous";
      v.loop = true;
      v.src = comCacheBuster(fp.url);
      try {
        await v.play();
        setFonte({ tipo: "publica-video", nome: fp.nome });
        setAtualizadoEm(Date.now());
        await iniciarLaco();
      } catch {
        setErro("Não foi possível reproduzir o vídeo desta câmera agora. Tente outra câmera.");
        return;
      }
      timerFonte.current = setInterval(() => {
        const vv = videoRef.current;
        if (!vv) return;
        vv.src = comCacheBuster(fp.url);
        rastreador.current.limpar();
        void vv.play().then(() => setAtualizadoEm(Date.now())).catch(() => undefined);
      }, fp.intervaloSeg * 1000);
    } else {
      setFonte({ tipo: "publica-imagem", nome: fp.nome });
      fonteRefAtual.current = "publica-imagem";
      await carregarModelo();
      carregarImagem(fp, true);
      timerFonte.current = setInterval(() => carregarImagem(fp, !semCorsRef.current), fp.intervaloSeg * 1000);
    }
  }, [pararFonte, iniciarLaco, carregarModelo, carregarImagem]);

  const chavePublica = publica?.chave;
  useEffect(() => {
    if (!modoPublico) return;
    if (publica) void usarPublica(publica);
    else pararFonte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavePublica, modoPublico]);

  useEffect(() => () => pararFonte(), [pararFonte]);

  /* ---------- marcação no vídeo ---------- */
  function clique(e: React.PointerEvent<HTMLCanvasElement>) {
    if (modo === "detectar") return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    temp.current = [...temp.current, p];
    setPontosTemp(temp.current.length);
    if ((modo === "linhaA" || modo === "linhaB") && temp.current.length === 2) {
      const linha = [temp.current[0]!, temp.current[1]!] as [Ponto2D, Ponto2D];
      salvarVisao((v) => ({ ...v, [modo]: linha }));
      temp.current = [];
      setPontosTemp(0);
      setModo(modo === "linhaA" ? "linhaB" : "detectar");
      rastreador.current.limpar();
    }
    if (!rodando.current) desenhar(fonteRefAtual.current === "publica-imagem" ? trilhas : []);
  }

  function comecar(m: Modo) {
    temp.current = [];
    setPontosTemp(0);
    setModo(m);
  }

  function concluirArea() {
    if (temp.current.length >= 3) salvarVisao((v) => ({ ...v, area: temp.current }));
    temp.current = [];
    setPontosTemp(0);
    setModo("detectar");
    rastreador.current.limpar();
  }

  const instrucao =
    modo === "linhaA"
      ? `Clique em dois pontos na pista para marcar a linha A (${pontosTemp}/2).`
      : modo === "linhaB"
        ? `Agora marque a linha B, mais à frente na pista (${pontosTemp}/2).`
        : modo === "area"
          ? `Clique nos cantos da área de obra (${pontosTemp} pontos). Conclua com pelo menos 3.`
          : "";

  const calibrado = !!cfg.linhaA && !!cfg.linhaB && cfg.distancia > 0;

  return (
    <section className="caixa" aria-labelledby="t-visao">
      <h2 id="t-visao">{modoPublico ? publica ? publica.nome : "Câmera pública" : "Câmera ou vídeo da via"}</h2>
      <p className={s.intro}>
        {modoPublico
          ? "Detecção de carros, caminhões, ônibus e motos com o modelo COCO-SSD, no seu navegador, sobre a imagem publicada pelo órgão de trânsito."
          : "Detecta carros, caminhões, ônibus e motos com o modelo COCO-SSD, rodando no próprio navegador. Nenhuma imagem sai do seu aparelho."}
      </p>

      <ol className={s.passos}>
        <li className={fonte ? s.feito : s.atual}>1. Fonte de vídeo</li>
        {fonte?.tipo !== "publica-imagem" && <li className={calibrado ? s.feito : fonte ? s.atual : ""}>2. Calibrar velocidade</li>}
        <li className={cfg.area.length >= 3 ? s.feito : fonte ? s.atual : ""}>{fonte?.tipo === "publica-imagem" ? "2" : "3"}. Marcar área de obra</li>
      </ol>

      <div className={s.fontes} hidden={modoPublico}>
        <button type="button" className="btn btn-primario" onClick={usarCamera}>
          {fonte?.tipo === "webcam" ? "Reiniciar câmera" : "Usar câmera"}
        </button>
        <label className="btn btn-claro">
          Enviar vídeo
          <input type="file" accept="video/*" className="sr" onChange={(e) => void usarVideo(e.target.files?.[0])} />
        </label>
        {fonte && (
          <button type="button" className="btn btn-claro" onClick={pararFonte}>
            Parar
          </button>
        )}
      </div>

      {erro && (
        <div className="erro-bloco" role="alert">
          <p>{erro}</p>
          {modelo === "erro" && (
            <button type="button" className="btn btn-primario btn-sm" onClick={() => { setErro(""); void iniciarLaco(); }}>
              Tentar de novo
            </button>
          )}
        </div>
      )}

      <div className={s.palco} hidden={!fonte}>
        <video ref={videoRef} className={s.video} muted playsInline aria-label="Vídeo da via" hidden={fonte?.tipo === "publica-imagem"} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} className={s.video} alt={publica ? `Imagem atual da câmera ${publica.nome}` : ""} hidden={fonte?.tipo !== "publica-imagem"} />
        <canvas
          ref={canvasRef}
          className={`${s.canvas} ${modo !== "detectar" ? s.marcando : ""}`}
          onPointerDown={clique}
          aria-label="Marcações sobre o vídeo"
          role="img"
        />
        {modelo === "carregando" && (
          <div className={s.carregando} role="status">
            <span className="girador" aria-hidden="true" /> Carregando o modelo de detecção (cerca de 5 MB)...
          </div>
        )}
      </div>

      {fonte && modoPublico && publica && (
        <p className={s.atribuicao}>
          {publica.atribuicao}
          {atualizadoEm ? ` · atualizada às ${new Date(atualizadoEm).toLocaleTimeString("pt-BR")}` : ""}
        </p>
      )}

      {semDeteccao && (
        <p className="aviso-demo" role="status">
          Esta fonte não libera CORS para leitura dos pixels, então a câmera é exibida mas a detecção não roda nela.
        </p>
      )}

      {!fonte && !erro && (
        <div className="vazio-bloco">
          <p>
            {modoPublico
              ? "Escolha uma câmera na lista ou no mapa."
              : "Use a câmera do aparelho apontada para a pista ou envie um vídeo gravado. Sem vídeo, a aba Simulação continua gerando leituras."}
          </p>
        </div>
      )}

      {fonte && (
        <>
          {instrucao && (
            <p className={s.instrucao} role="status">
              {instrucao}
            </p>
          )}
          <div className={s.ferramentas}>
            <div className={s.grupoFerr} hidden={fonte.tipo === "publica-imagem"}>
              <h3>Velocidade</h3>
              <div className="linha-botoes">
                <button type="button" className="btn btn-claro btn-sm" onClick={() => comecar("linhaA")}>
                  Marcar linhas A e B
                </button>
                <div className="grupo">
                  <label htmlFor="dist">Distância entre as linhas (m)</label>
                  <input
                    id="dist"
                    className="campo campo--curto"
                    type="number"
                    min={1}
                    max={500}
                    step={0.5}
                    value={cfg.distancia}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      if (d > 0 && d <= 500) salvarVisao((v) => ({ ...v, distancia: d }));
                    }}
                  />
                </div>
                <div className="grupo">
                  <label htmlFor="lim-cam">Limite no trecho (km/h)</label>
                  <input id="lim-cam" className="campo campo--curto" type="number" min={20} max={120} step={10} value={limite} onChange={(e) => setLimite(Math.min(120, Math.max(20, Number(e.target.value) || 60)))} />
                </div>
              </div>
            </div>
            <div className={s.grupoFerr}>
              <h3>Área de obra</h3>
              <div className="linha-botoes">
                {modo === "area" ? (
                  <>
                    <button type="button" className="btn btn-primario btn-sm" onClick={concluirArea} disabled={pontosTemp < 3}>
                      Concluir área
                    </button>
                    <button type="button" className="btn btn-claro btn-sm" onClick={() => comecar("detectar")}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-claro btn-sm" onClick={() => comecar("area")}>
                      Desenhar área
                    </button>
                    {cfg.area.length > 0 && (
                      <button type="button" className="btn btn-claro btn-sm" onClick={() => salvarVisao((v) => ({ ...v, area: [] }))}>
                        Apagar área
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={s.grupoFerr}>
              <h3>Sem mouse?</h3>
              <button type="button" className="btn btn-claro btn-sm" onClick={() => { salvarVisao((v) => ({ ...PADRAO, distancia: v.distancia })); comecar("detectar"); }}>
                Usar marcações padrão
              </button>
            </div>
          </div>

          {fonte.tipo === "publica-imagem" && (
            <p className="texto-mudo">
              Imagem estática atualizada a cada {Math.round((publica?.intervaloSeg ?? 60) / 60)} min: só contagem de veículos e área de
              obra. Velocidade precisa de vídeo contínuo.
            </p>
          )}
          <p className="texto-mudo">
            A velocidade é uma estimativa: tempo que a base do veículo leva entre as linhas A e B, dividido pela distância
            informada. A precisão depende do ângulo da câmera e da medida real na pista.
            {backend && ` Processamento local (${backend}).`}
          </p>

          <div className={s.resumo}>
            <p>
              <strong>{trilhas.length}</strong> veículos na imagem
              {fonte.tipo !== "publica-imagem" && (
                <>
                  {" "}
                  · <strong>{total}</strong> rastreados desde o início
                </>
              )}
            </p>
          </div>
          {trilhas.length > 0 && (
            <div className="tabela-rolagem">
              <table className="tabela">
                <caption className="sr">Veículos rastreados agora</caption>
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Velocidade estimada</th>
                    <th scope="col">Área de obra</th>
                  </tr>
                </thead>
                <tbody>
                  {trilhas.map((t) => (
                    <tr key={t.id}>
                      <td data-rotulo="ID">#{t.id}</td>
                      <td data-rotulo="Tipo">{CLASSES_VEICULO[t.classe] ?? t.classe}</td>
                      <td data-rotulo="Velocidade estimada" className={t.velocidade !== undefined && t.velocidade > limite ? s.vermelho : undefined}>
                        {t.velocidade !== undefined ? `≈ ${num(t.velocidade, 1)} km/h` : calibrado ? "aguardando cruzar A e B" : "calibre as linhas"}
                      </td>
                      <td data-rotulo="Área de obra" className={t.dentroArea ? s.vermelho : undefined}>
                        {t.dentroArea ? "Dentro" : "Fora"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
