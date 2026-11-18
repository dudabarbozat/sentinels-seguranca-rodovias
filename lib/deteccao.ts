/*
 * Peças da detecção compartilhadas entre a aba "Câmera ou vídeo", as câmeras públicas e a demonstração da página
 * inicial: carregamento único do modelo COCO-SSD, conversão das predições, um passo do rastreador e o desenho da cena.
 * O TensorFlow.js só é baixado quando carregarModelo() é chamado.
 */
import type { DetectedObject, ObjectDetection } from "@tensorflow-models/coco-ssd";
import { num } from "./formato";
import { CLASSES_VEICULO, Rastreador, type Calibracao, type Deteccao, type P, type Trilha } from "./rastreador";
import type { ConfigVisao, Ponto2D } from "./tipos";

export const COR = { area: "#ff7800", linha: "#75b62a", normal: "#0abfbc", alerta: "#c92244" };

export function comCacheBuster(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

export interface ModeloCarregado {
  modelo: ObjectDetection;
  backend: string;
}

let promessa: Promise<ModeloCarregado> | null = null;

/* Uma única cópia do modelo por aba do navegador; se o download falhar, a próxima chamada tenta de novo. */
export function carregarModelo(): Promise<ModeloCarregado> {
  if (!promessa) {
    promessa = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const coco = await import("@tensorflow-models/coco-ssd");
      const modelo = await coco.load({ base: "lite_mobilenet_v2" });
      return { modelo, backend: tf.getBackend() };
    })();
    promessa.catch(() => {
      promessa = null;
    });
  }
  return promessa;
}

export function deteccoesVeiculo(preds: DetectedObject[]): Deteccao[] {
  return preds
    .filter((p) => p.class in CLASSES_VEICULO)
    .map((p) => ({ classe: p.class, score: p.score, caixa: p.bbox as [number, number, number, number] }));
}

/* Converte as marcações normalizadas (0..1) em pixels do quadro. */
export function marcacoesEmPixels(cfg: ConfigVisao, W: number, H: number): { cal: Calibracao; area: P[] } {
  const toPx = (p: Ponto2D): P => ({ x: p.x * W, y: p.y * H });
  return {
    cal: {
      a: cfg.linhaA ? [toPx(cfg.linhaA[0]), toPx(cfg.linhaA[1])] : null,
      b: cfg.linhaB ? [toPx(cfg.linhaB[0]), toPx(cfg.linhaB[1])] : null,
      distancia: cfg.distancia,
    },
    area: cfg.area.map(toPx),
  };
}

/* Um quadro: predições do modelo -> trilhas ativas e quantas trilhas novas surgiram. */
export function processarQuadro(
  rastreador: Rastreador,
  preds: DetectedObject[],
  W: number,
  H: number,
  t: number,
  cfg: ConfigVisao,
): { ativos: Trilha[]; novos: number } {
  const { cal, area } = marcacoesEmPixels(cfg, W, H);
  const antes = rastreador.trilhas.length ? Math.max(...rastreador.trilhas.map((x) => x.id)) : 0;
  const ativos = rastreador.atualizar(deteccoesVeiculo(preds), t, cal, area, Math.max(W, H) * 0.12);
  return { ativos, novos: ativos.filter((x) => x.id > antes).length };
}

export interface Cena {
  area: Ponto2D[];
  fecharArea: boolean;
  linhas: [string, Ponto2D[] | null][];
  rotuloArea?: string;
}

export function desenharCena(c: HTMLCanvasElement, W: number, H: number, cena: Cena, ativos: Trilha[], limite: number): void {
  if (c.width !== W) c.width = W;
  if (c.height !== H) c.height = H;
  const g = c.getContext("2d");
  if (!g) return;
  const lw = Math.max(2, W / 320);
  const fonteTam = Math.max(12, W / 50);
  g.clearRect(0, 0, W, H);
  g.font = `600 ${fonteTam}px "Clear Sans", sans-serif`;
  const px = (p: Ponto2D) => ({ x: p.x * W, y: p.y * H });

  const { area } = cena;
  if (area.length) {
    g.beginPath();
    area.forEach((p, i) => (i ? g.lineTo(px(p).x, px(p).y) : g.moveTo(px(p).x, px(p).y)));
    if (cena.fecharArea) g.closePath();
    g.fillStyle = "rgba(255,120,0,0.22)";
    if (area.length > 2) g.fill();
    g.strokeStyle = COR.area;
    g.lineWidth = lw;
    g.stroke();
    area.forEach((p) => {
      g.beginPath();
      g.arc(px(p).x, px(p).y, lw * 2, 0, Math.PI * 2);
      g.fillStyle = COR.area;
      g.fill();
    });
    if (cena.rotuloArea && area.length > 2) {
      const topo = area.reduce((m, p) => (p.y < m.y ? p : m), area[0]!);
      const larg = g.measureText(cena.rotuloArea).width + 10;
      const x = Math.min(Math.max(0, px(topo).x - larg / 2), W - larg);
      const y = Math.max(0, px(topo).y - fonteTam - 10);
      g.fillStyle = COR.area;
      g.fillRect(x, y, larg, fonteTam + 8);
      g.fillStyle = "#1d1100";
      g.fillText(cena.rotuloArea, x + 5, y + fonteTam + 2);
    }
  }

  for (const [nome, l] of cena.linhas) {
    if (!l || !l.length) continue;
    const a = px(l[0]!);
    g.strokeStyle = COR.linha;
    g.fillStyle = COR.linha;
    g.lineWidth = lw;
    g.setLineDash([lw * 4, lw * 3]);
    if (l[1]) {
      const b = px(l[1]);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.setLineDash([]);
    g.beginPath();
    g.arc(a.x, a.y, lw * 2, 0, Math.PI * 2);
    g.fill();
    g.fillText(`Linha ${nome}`, a.x + lw * 3, a.y - lw * 3);
  }

  for (const t of ativos) {
    const [x, y, w, h] = t.caixa;
    const alerta = t.dentroArea || (t.velocidade !== undefined && t.velocidade > limite);
    const cor = alerta ? COR.alerta : COR.normal;
    g.strokeStyle = cor;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
    const rotulo = `#${t.id} ${CLASSES_VEICULO[t.classe] ?? t.classe}${t.velocidade !== undefined ? ` · ${num(t.velocidade, 0)} km/h` : ""}${t.dentroArea ? " · NA ÁREA" : ""}`;
    const larg = g.measureText(rotulo).width + 10;
    g.fillStyle = cor;
    g.fillRect(x, Math.max(0, y - fonteTam - 8), larg, fonteTam + 8);
    g.fillStyle = alerta ? "#fff" : "#062b2a";
    g.fillText(rotulo, x + 5, Math.max(fonteTam, y - 6));
  }
}
