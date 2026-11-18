/*
 * Rastreamento simples por centroide e geometria da calibração.
 * Coordenadas em pixels do vídeo; o ponto de referência é a base da caixa (contato com a pista).
 */
export interface Deteccao {
  classe: string;
  score: number;
  caixa: [number, number, number, number]; // x, y, largura, altura
}

export interface Trilha {
  id: number;
  classe: string;
  caixa: [number, number, number, number];
  x: number;
  y: number;
  visto: number;
  ladoA: number;
  ladoB: number;
  tA?: number;
  tB?: number;
  velocidade?: number;
  dentroArea: boolean;
  alertouInvasao: boolean;
  alertouVelocidade: boolean;
}

export interface P {
  x: number;
  y: number;
}

export function lado(a: P, b: P, c: P): number {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/* Projeção do ponto no segmento (0 = em a, 1 = em b). */
function projecao(a: P, b: P, c: P): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  return ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2;
}

export function dentroPoligono(p: P, poli: P[]): boolean {
  if (poli.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i]!;
    const b = poli[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-9) + a.x) dentro = !dentro;
  }
  return dentro;
}

export interface Calibracao {
  a: [P, P] | null;
  b: [P, P] | null;
  distancia: number;
}

export class Rastreador {
  trilhas: Trilha[] = [];
  private proximo = 1;

  limpar(): void {
    this.trilhas = [];
  }

  atualizar(dets: Deteccao[], t: number, cal: Calibracao, area: P[], distMax: number): Trilha[] {
    const livres = new Set(this.trilhas.map((x) => x.id));
    const atualizadas: Trilha[] = [];

    for (const d of dets) {
      const [x, y, w, h] = d.caixa;
      const px = x + w / 2;
      const py = y + h;
      let melhor: Trilha | null = null;
      let melhorD = distMax;
      for (const tr of this.trilhas) {
        if (!livres.has(tr.id)) continue;
        const dist = Math.hypot(tr.x - px, tr.y - py);
        if (dist < melhorD) {
          melhorD = dist;
          melhor = tr;
        }
      }
      const p = { x: px, y: py };
      if (melhor) {
        livres.delete(melhor.id);
        this.cruzamentos(melhor, p, t, cal);
        melhor.x = px;
        melhor.y = py;
        melhor.caixa = d.caixa;
        melhor.classe = d.classe;
        melhor.visto = t;
        melhor.dentroArea = dentroPoligono(p, area);
        atualizadas.push(melhor);
      } else {
        atualizadas.push({
          id: this.proximo++,
          classe: d.classe,
          caixa: d.caixa,
          x: px,
          y: py,
          visto: t,
          ladoA: cal.a ? lado(cal.a[0], cal.a[1], p) : 0,
          ladoB: cal.b ? lado(cal.b[0], cal.b[1], p) : 0,
          dentroArea: dentroPoligono(p, area),
          alertouInvasao: false,
          alertouVelocidade: false,
        });
      }
    }
    /* mantém por 1 s as trilhas que sumiram (oclusão rápida) */
    for (const tr of this.trilhas) if (livres.has(tr.id) && t - tr.visto < 1000) atualizadas.push(tr);
    this.trilhas = atualizadas;
    return atualizadas.filter((tr) => tr.visto === t);
  }

  private cruzamentos(tr: Trilha, p: P, t: number, cal: Calibracao): void {
    if (cal.a) {
      const s = lado(cal.a[0], cal.a[1], p);
      const k = projecao(cal.a[0], cal.a[1], p);
      if (s !== 0 && tr.ladoA !== 0 && s !== tr.ladoA && k > -0.25 && k < 1.25 && tr.tA === undefined) tr.tA = t;
      if (s !== 0) tr.ladoA = s;
    }
    if (cal.b) {
      const s = lado(cal.b[0], cal.b[1], p);
      const k = projecao(cal.b[0], cal.b[1], p);
      if (s !== 0 && tr.ladoB !== 0 && s !== tr.ladoB && k > -0.25 && k < 1.25 && tr.tB === undefined) tr.tB = t;
      if (s !== 0) tr.ladoB = s;
    }
    if (tr.velocidade === undefined && tr.tA !== undefined && tr.tB !== undefined && cal.distancia > 0) {
      const dt = Math.abs(tr.tB - tr.tA) / 1000;
      if (dt > 0.05) {
        const v = (cal.distancia / dt) * 3.6;
        if (v < 250) tr.velocidade = Math.round(v * 10) / 10;
      }
    }
  }
}

export const CLASSES_VEICULO: Record<string, string> = {
  car: "Carro",
  truck: "Caminhão",
  bus: "Ônibus",
  motorcycle: "Moto",
};
