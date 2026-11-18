/*
 * Câmeras de trânsito de órgãos oficiais com dados abertos e sem chave, testadas com CORS a partir do navegador:
 * - Transport for London, JamCams: lista em api.tfl.gov.uk e clipes MP4/JPG no S3, ambos com Access-Control-Allow-Origin: *.
 * - Caltrans CWWP2: lista CSV por distrito e JPG em cwwp2.dot.ca.gov, ambos com Access-Control-Allow-Origin: *.
 */

import type { ConfigVisao, Ponto2D } from "./tipos";

export type IdFonte = "tfl" | "caltrans-d7" | "caltrans-d4";

export interface CameraPublica {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  tipo: "video" | "imagem";
  url: string;
  intervaloSeg: number;
}

export interface FonteCameras {
  id: IdFonte;
  rotulo: string;
  cidade: string;
  centro: [number, number];
  atribuicao: { texto: string; link: string; rotuloLink: string };
}

export const FONTES: FonteCameras[] = [
  {
    id: "tfl",
    rotulo: "Londres · Transport for London (JamCams)",
    cidade: "Londres",
    centro: [51.507, -0.128],
    atribuicao: { texto: "Powered by TfL Open Data. Imagens: Transport for London JamCams", link: "https://tfl.gov.uk/info-for/open-data-users/", rotuloLink: "termos" },
  },
  {
    id: "caltrans-d7",
    rotulo: "Los Angeles · Caltrans distrito 7",
    cidade: "Los Angeles",
    centro: [34.05, -118.25],
    atribuicao: { texto: "Imagens e dados: California Department of Transportation (Caltrans), CWWP2", link: "https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm", rotuloLink: "documentação" },
  },
  {
    id: "caltrans-d4",
    rotulo: "Baía de São Francisco · Caltrans distrito 4",
    cidade: "São Francisco",
    centro: [37.77, -122.27],
    atribuicao: { texto: "Imagens e dados: California Department of Transportation (Caltrans), CWWP2", link: "https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm", rotuloLink: "documentação" },
  },
];

async function buscarTexto(url: string, limiteMs = 60000): Promise<string> {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), limiteMs);
  try {
    const r = await fetch(url, { signal: controle.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(tempo);
  }
}

interface TflPlace {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  additionalProperties: { key: string; value: string }[];
}

async function camerasTfl(): Promise<CameraPublica[]> {
  const lista = JSON.parse(await buscarTexto("https://api.tfl.gov.uk/Place/Type/JamCam", 30000)) as TflPlace[];
  const saida: CameraPublica[] = [];
  for (const c of lista) {
    const prop = (k: string) => c.additionalProperties.find((p) => p.key === k)?.value ?? "";
    if (prop("available") !== "true") continue;
    const video = prop("videoUrl");
    const imagem = prop("imageUrl");
    if (!video && !imagem) continue;
    /* o clipe MP4 (cerca de 10 s) permite rastrear e estimar velocidade; a TfL renova a cada poucos minutos */
    saida.push({ id: c.id, nome: c.commonName, lat: c.lat, lon: c.lon, tipo: video ? "video" : "imagem", url: video || imagem, intervaloSeg: 180 });
  }
  return saida.sort((a, b) => a.nome.localeCompare(b.nome));
}

/* CSV com aspas simples (o JSON da Caltrans tem o dobro do tamanho e o servidor não comprime). */
function linhasCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.length > 1) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

async function camerasCaltrans(distrito: number): Promise<CameraPublica[]> {
  const d = String(distrito).padStart(2, "0");
  const texto = await buscarTexto(`https://cwwp2.dot.ca.gov/data/d${distrito}/cctv/cctvStatusD${d}.csv`);
  const [cab, ...dados] = linhasCsv(texto);
  if (!cab) return [];
  const col = (n: string) => cab.indexOf(n);
  const iIdx = col("index"), iNome = col("locationName"), iPerto = col("nearbyPlace"), iLat = col("latitude"), iLon = col("longitude");
  const iServ = col("inService"), iUrl = col("currentImageURL"), iFreq = col("currentImageUpdateFrequency");
  const saida: CameraPublica[] = [];
  for (const l of dados) {
    const url = l[iUrl] ?? "";
    const lat = Number(l[iLat]);
    const lon = Number(l[iLon]);
    if (l[iServ] !== "true" || !url.startsWith("https://") || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const perto = l[iPerto] ?? "";
    saida.push({
      id: `D${d}-${l[iIdx]}`,
      nome: `${l[iNome] ?? "Câmera"}${perto ? ` (${perto})` : ""}`,
      lat,
      lon,
      tipo: "imagem",
      url,
      intervaloSeg: Math.max(60, (Number(l[iFreq]) || 5) * 60),
    });
  }
  return saida.sort((a, b) => a.nome.localeCompare(b.nome));
}

const cache = new Map<IdFonte, Promise<CameraPublica[]>>();

export function listarCameras(fonte: IdFonte): Promise<CameraPublica[]> {
  let p = cache.get(fonte);
  if (!p) {
    p = fonte === "tfl" ? camerasTfl() : camerasCaltrans(fonte === "caltrans-d7" ? 7 : 4);
    p.catch(() => cache.delete(fonte));
    cache.set(fonte, p);
  }
  return p;
}

/*
 * Câmeras da demonstração da página inicial: vias de tráfego intenso da TfL com veículos grandes no quadro (as
 * que tiveram mais detecções num teste com clipes reais em 18/11/2026), em ordem de preferência (se o clipe de uma falhar, a próxima é usada). As marcações são fixas por câmera: duas linhas de
 * calibração e uma área de obra fictícia sobre uma faixa. A distância entre as linhas foi estimada pela perspectiva e
 * pelo espaçamento das marcações da pista, não medida no local. As câmeras da TfL podem girar; nesse caso as
 * marcações da área de obra deixam de coincidir com a faixa até a câmera voltar à posição habitual.
 */
const S3_TFL = "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk";

export interface CameraDemo {
  id: string;
  nome: string;
  via: string;
  lat: number;
  lon: number;
  video: string;
  imagem: string;
  limiteObra: number; // km/h na área de obra simulada
  visao: ConfigVisao;
}

function camDemo(id: string, nome: string, via: string, lat: number, lon: number, visao: ConfigVisao): CameraDemo {
  return { id, nome, via, lat, lon, video: `${S3_TFL}/${id}.mp4`, imagem: `${S3_TFL}/${id}.jpg`, limiteObra: 40, visao };
}

/* Linhas de lado a lado do quadro: continuam valendo se o operador mexer um pouco na câmera. */
const linhas = (ya: number, yb: number, distancia: number) => ({
  linhaA: [{ x: 0, y: ya }, { x: 1, y: ya }] as [Ponto2D, Ponto2D],
  linhaB: [{ x: 0, y: yb }, { x: 1, y: yb }] as [Ponto2D, Ponto2D],
  distancia,
});

export const CAMERAS_DEMO: CameraDemo[] = [
  camDemo("00002.00252", "A2 Eltham West, sentido leste", "A2, Eltham", 51.45533, 0.04847, {
    ...linhas(0.5, 0.8, 20),
    area: [{ x: 0.33, y: 0.4 }, { x: 0.45, y: 0.4 }, { x: 0.32, y: 0.98 }, { x: 0.12, y: 0.98 }],
  }),
  camDemo("00001.08009", "A406 North Circular / Great Central Way", "A406 North Circular, Wembley", 51.5527, -0.25521, {
    ...linhas(0.5, 0.75, 25),
    area: [{ x: 0.42, y: 0.45 }, { x: 0.48, y: 0.45 }, { x: 0.52, y: 0.98 }, { x: 0.38, y: 0.98 }],
  }),
  camDemo("00002.00840", "A12 Gants Hill, acesso oeste", "A12, Redbridge", 51.57394, 0.02384, {
    ...linhas(0.5, 0.78, 25),
    area: [{ x: 0.4, y: 0.45 }, { x: 0.47, y: 0.45 }, { x: 0.62, y: 0.98 }, { x: 0.5, y: 0.98 }],
  }),
  camDemo("00002.00114", "A406 Ace Cafe", "A406 North Circular, Stonebridge", 51.53981, -0.27846, {
    ...linhas(0.55, 0.8, 25),
    area: [{ x: 0.2, y: 0.42 }, { x: 0.28, y: 0.42 }, { x: 0.62, y: 0.98 }, { x: 0.5, y: 0.98 }],
  }),
];
