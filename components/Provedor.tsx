"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { apagarEstado, carregarEstado, estadoPadrao, salvarEstado } from "@/lib/armazenamento";
import { VALIDADE_CLIMA, buscarClimaObras, gravarCacheClima, lerCacheClima } from "@/lib/clima";
import { avaliar, gerarLeitura } from "@/lib/simulador";
import { nomeLocal } from "@/lib/dados";
import type { Alerta, ClimaObra, Estado, Leitura } from "@/lib/tipos";
import Icone from "./Icone";

export const INTERVALO = 1500;
const JANELA = 30;
const MAX_ALERTAS = 300;

type NovoAlerta = Omit<Alerta, "id" | "status" | "criadoEm">;

interface EstadoClima {
  situacao: "carregando" | "ok" | "erro";
  dados: ClimaObra[];
  erro?: string;
  atualizadoEm?: number;
}

interface Contexto {
  pronto: boolean;
  estado: Estado;
  leituras: Leitura[];
  clima: EstadoClima;
  limitesClima: Record<string, number>;
  atualizar: (f: (e: Estado) => Estado) => void;
  registrarAlerta: (a: NovoAlerta) => void;
  mudarStatus: (id: string, status: Alerta["status"]) => void;
  reconhecerTodos: () => void;
  recarregarClima: () => void;
  restaurar: () => void;
}

const Ctx = createContext<Contexto | null>(null);

export function useSentinels(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSentinels fora do Provedor");
  return c;
}

function janela(e: Estado): Leitura[] {
  const agora = Date.now();
  const lista: Leitura[] = [];
  for (let n = e.seq - 1; n >= Math.max(0, e.seq - JANELA); n--) {
    lista.push(gerarLeitura(e.semente, n, 0, agora - (e.seq - 1 - n) * INTERVALO));
  }
  return lista;
}

function inserirAlerta(e: Estado, a: NovoAlerta): Estado {
  if (a.chave && e.alertas.some((x) => x.chave === a.chave && x.status !== "encerrado")) return e;
  const novo: Alerta = { ...a, id: `AL-${String(e.proximoAlerta).padStart(4, "0")}`, status: "aberto", criadoEm: Date.now() };
  let alertas = [novo, ...e.alertas];
  if (alertas.length > MAX_ALERTAS) {
    const encerrados = alertas.filter((x) => x.status === "encerrado");
    const remover = new Set(encerrados.slice(-(alertas.length - MAX_ALERTAS)).map((x) => x.id));
    alertas = alertas.filter((x) => !remover.has(x.id)).slice(0, MAX_ALERTAS);
  }
  return { ...e, alertas, proximoAlerta: e.proximoAlerta + 1, sessao: { ...e.sessao, [a.tipo]: e.sessao[a.tipo] + 1 } };
}

/* Bipe curto via Web Audio, só quando o usuário liga o som. */
let audio: AudioContext | null = null;
function bipe(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime;
    [0, 0.18].forEach((atraso, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "square";
      o.frequency.value = i ? 520 : 660;
      g.gain.setValueAtTime(0.0001, t + atraso);
      g.gain.exponentialRampToValueAtTime(0.06, t + atraso + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + atraso + 0.14);
      o.connect(g).connect(audio!.destination);
      o.start(t + atraso);
      o.stop(t + atraso + 0.16);
    });
  } catch {
    /* sem áudio */
  }
}

export default function Provedor({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoPadrao);
  const [pronto, setPronto] = useState(false);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [clima, setClima] = useState<EstadoClima>({ situacao: "carregando", dados: [] });
  const [aviso, setAviso] = useState<Alerta | null>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const caminho = usePathname();

  useEffect(() => {
    const e = carregarEstado();
    setEstado(e);
    setLeituras(janela(e));
    setPronto(true);
  }, []);

  useEffect(() => {
    if (pronto) salvarEstado(estado);
  }, [estado, pronto]);

  const limitesClima = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of clima.dados) m[c.obra] = c.limiteRecomendado;
    return m;
  }, [clima.dados]);
  const limitesRef = useRef(limitesClima);
  limitesRef.current = limitesClima;

  const notificar = useCallback(
    (a: NovoAlerta) => {
      if (estadoRef.current.som && (a.prioridade === "critica" || a.prioridade === "alta")) bipe();
      if (a.prioridade === "critica") {
        setAviso({ ...a, id: "aviso", status: "aberto", criadoEm: Date.now() });
      }
    },
    [],
  );

  const registrarAlerta = useCallback(
    (a: NovoAlerta) => {
      setEstado((e) => inserirAlerta(e, a));
      notificar(a);
    },
    [notificar],
  );

  /* fluxo simulado: uma leitura a cada 1,5 s */
  useEffect(() => {
    if (!pronto) return;
    const id = setInterval(() => {
      const e = estadoRef.current;
      if (e.pausado || document.visibilityState !== "visible") return;
      const l = gerarLeitura(e.semente, e.seq, 0, Date.now());
      setLeituras((ls) => [l, ...ls].slice(0, JANELA));
      const filas = avaliar(l, e.limite, limitesRef.current).alertas.filter((x) => x.fila);
      setEstado((atual) => {
        let prox: Estado = { ...atual, seq: atual.seq + 1 };
        for (const x of filas) {
          prox = inserirAlerta(prox, {
            tipo: x.tipo,
            prioridade: x.prioridade,
            origem: "simulacao",
            titulo: x.tipo === "invasao" ? "Invasão da área de obra" : x.tipo === "velocidade" ? "Excesso de velocidade na obra" : "Pneu crítico perto da obra",
            detalhe: `${l.tipo} ${l.placa} · ${x.texto}`,
            local: l.obra ?? l.ponto,
          });
        }
        return prox;
      });
      for (const x of filas) notificar({ tipo: x.tipo, prioridade: x.prioridade, origem: "simulacao", titulo: "Invasão da área de obra", detalhe: `${l.tipo} ${l.placa} · ${x.texto}`, local: l.obra ?? l.ponto });
    }, INTERVALO);
    return () => clearInterval(id);
  }, [pronto, notificar]);

  /* clima real nas obras, atualizado a cada 10 min */
  const aplicarClima = useCallback(
    (dados: ClimaObra[], quando: number) => {
      setClima({ situacao: "ok", dados, atualizadoEm: quando });
      for (const c of dados) {
          for (const cond of c.condicoes) {
            registrarAlerta({
              chave: `clima:${c.obra}:${cond.tipo}`,
              tipo: "clima",
              prioridade: cond.prioridade,
              origem: "clima",
              titulo: "Condição de clima na obra",
              detalhe: `${cond.texto}. Limite recomendado: ${c.limiteRecomendado} km/h`,
              local: c.obra,
            });
          }
        }
    },
    [registrarAlerta],
  );

  const recarregarClima = useCallback(() => {
    setClima((c) => ({ ...c, situacao: "carregando", erro: undefined }));
    buscarClimaObras()
      .then((dados) => {
        gravarCacheClima(dados);
        aplicarClima(dados, Date.now());
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error && e.name === "AbortError" ? "O serviço de clima demorou a responder." : "Não foi possível consultar o clima agora.";
        setClima((c) => ({ ...c, situacao: "erro", erro: msg }));
      });
  }, [aplicarClima]);

  useEffect(() => {
    if (!pronto) return;
    const cache = lerCacheClima();
    if (cache) aplicarClima(cache.dados, cache.t);
    else recarregarClima();
    const id = setInterval(recarregarClima, VALIDADE_CLIMA);
    return () => clearInterval(id);
  }, [pronto, recarregarClima, aplicarClima]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 7000);
    return () => clearTimeout(id);
  }, [aviso]);

  const valor = useMemo<Contexto>(
    () => ({
      pronto,
      estado,
      leituras,
      clima,
      limitesClima,
      atualizar: (f) => setEstado(f),
      registrarAlerta,
      mudarStatus: (id, status) =>
        setEstado((e) => ({
          ...e,
          alertas: e.alertas.map((a) =>
            a.id !== id
              ? a
              : {
                  ...a,
                  status,
                  reconhecidoEm: status === "reconhecido" ? Date.now() : a.reconhecidoEm,
                  encerradoEm: status === "encerrado" ? Date.now() : a.encerradoEm,
                },
          ),
        })),
      reconhecerTodos: () =>
        setEstado((e) => ({
          ...e,
          alertas: e.alertas.map((a) => (a.status === "aberto" ? { ...a, status: "reconhecido", reconhecidoEm: Date.now() } : a)),
        })),
      recarregarClima,
      restaurar: () => {
        apagarEstado();
        const e = estadoPadrao();
        setEstado(e);
        setLeituras(janela(e));
        recarregarClima();
      },
    }),
    [pronto, estado, leituras, clima, limitesClima, registrarAlerta, recarregarClima],
  );

  const mostrarAviso = aviso && caminho !== "/";

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="aviso-flutuante" role="status" aria-live="polite" hidden={!mostrarAviso}>
        {mostrarAviso && (
          <>
            <Icone nome="alerta" />
            <div>
              <strong>{aviso.titulo}</strong>
              <span>
                {aviso.detalhe} · {nomeLocal(aviso.local)}
              </span>
            </div>
            <Link href="/">Ver central</Link>
          </>
        )}
      </div>
    </Ctx.Provider>
  );
}
