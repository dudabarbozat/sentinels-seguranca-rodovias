"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chart as TChart } from "chart.js";
import { historico } from "@/lib/simulador";
import { num } from "@/lib/formato";
import { useSentinels } from "./Provedor";
import s from "./Graficos.module.css";

const COR = { texto: "#495057", grade: "#e9ecef", laranja: "#ff7800", azul: "#03509d", vermelho: "#c92244", verde: "#12a238", verdeClaro: "#75b62a" };

export default function Graficos() {
  const { pronto, estado } = useSentinels();
  const refVel = useRef<HTMLCanvasElement>(null);
  const refAl = useRef<HTMLCanvasElement>(null);
  const refPn = useRef<HTMLCanvasElement>(null);
  const charts = useRef<TChart[]>([]);
  const [erro, setErro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  const h = useMemo(() => historico(estado.semente, estado.limite), [estado.semente, estado.limite]);
  const sessao = estado.sessao;
  const alertas = useMemo(() => {
    const doTurno = estado.alertas.filter((a) => a.criadoEm >= estado.inicioTurno);
    const c = (t: string) => doTurno.filter((a) => a.tipo === t).length;
    return { velocidade: h.contagem.velocidade + c("velocidade"), pneu: h.contagem.pneu + c("pneu"), invasao: h.contagem.invasao + c("invasao"), clima: c("clima") };
  }, [h, estado.alertas, estado.inicioTurno]);

  const alertasRef = useRef(alertas);
  alertasRef.current = alertas;

  useEffect(() => {
    const c = charts.current[1];
    if (!c) return;
    c.data.datasets[0]!.data = [alertas.velocidade, alertas.pneu, alertas.invasao, alertas.clima];
    c.update("none");
  }, [alertas]);

  useEffect(() => {
    if (!pronto) return;
    let cancelado = false;
    const alertas = alertasRef.current;
    (async () => {
      try {
        const { Chart, registerables } = await import("chart.js");
        if (cancelado) return;
        Chart.register(...registerables);
        Chart.defaults.color = COR.texto;
        Chart.defaults.font.family = "'Clear Sans', 'Segoe UI', Roboto, Arial, sans-serif";
        Chart.defaults.borderColor = COR.grade;
        const animar = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const base = { responsive: true, maintainAspectRatio: false, animation: animar ? { duration: 400 } : (false as const), plugins: { legend: { display: false }, tooltip: { backgroundColor: "#343a40" } } };
        const horas = h.porHora.map((p) => String(p.hora).padStart(2, "0") + "h");
        charts.current.forEach((c) => c.destroy());
        charts.current = [
          new Chart(refVel.current!, {
            type: "line",
            data: {
              labels: horas,
              datasets: [
                { label: "Velocidade média (km/h)", data: h.porHora.map((p) => p.media), borderColor: COR.azul, backgroundColor: "rgba(3,80,157,0.10)", fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2 },
                { label: "Limite (km/h)", data: horas.map(() => estado.limite), borderColor: COR.vermelho, borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, fill: false },
              ],
            },
            options: {
              ...base,
              interaction: { mode: "index", intersect: false },
              plugins: { ...base.plugins, legend: { display: true, position: "bottom", labels: { boxWidth: 12, boxHeight: 2 } } },
              scales: { y: { suggestedMin: 40, suggestedMax: 110, title: { display: true, text: "km/h" } }, x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } } },
            },
          }),
          new Chart(refAl.current!, {
            type: "bar",
            data: {
              labels: ["Velocidade", "Pneu", "Invasão", "Clima"],
              datasets: [{ label: "Alertas", data: [alertas.velocidade, alertas.pneu, alertas.invasao, alertas.clima], backgroundColor: [COR.laranja, COR.azul, COR.vermelho, COR.verdeClaro], borderRadius: 4, maxBarThickness: 34 }],
            },
            options: { ...base, indexAxis: "y", scales: { x: { beginAtZero: true } } },
          }),
          new Chart(refPn.current!, {
            type: "bar",
            data: {
              labels: ["0 a 1", "1 a 2", "2 a 3", "3 a 4", "4 a 5"],
              datasets: [{ label: "Leituras", data: h.classes, backgroundColor: [COR.vermelho, COR.laranja, COR.verdeClaro, COR.verde, COR.azul], borderRadius: 4, maxBarThickness: 40 }],
            },
            options: { ...base, scales: { y: { beginAtZero: true }, x: { title: { display: true, text: "Nota do pneu" } } } },
          }),
        ];
        setCarregado(true);
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pronto, h, estado.limite]);

  useEffect(() => () => charts.current.forEach((c) => c.destroy()), []);

  const pico = h.porHora.reduce((a, b) => (b.media > a.media ? b : a));
  const vale = h.porHora.reduce((a, b) => (b.media < a.media ? b : a));
  const totalPn = h.classes.reduce((a, b) => a + b, 0);
  const ruins = (h.classes[0]! + h.classes[1]!) / totalPn;
  const totalAl = alertas.velocidade + alertas.pneu + alertas.invasao + alertas.clima;

  return (
    <>
      {erro && (
        <div className="erro-bloco" role="alert">
          <p>Não foi possível carregar os gráficos. Recarregue a página.</p>
        </div>
      )}
      <section className="caixa" aria-labelledby="t-g1">
        <h2 id="t-g1">Velocidade média por hora</h2>
        <div className={s.grafico} aria-busy={!carregado}>
          {!carregado && <div className={`esqueleto ${s.esq}`} />}
          <canvas ref={refVel} role="img" aria-label={`Linha da velocidade média por hora. Maior média às ${pico.hora}h, ${pico.media} km/h; menor às ${vale.hora}h, ${vale.media} km/h.`} />
        </div>
        <p className={s.resumo}>
          Maior média às {pico.hora}h ({pico.media} km/h); menor às {vale.hora}h ({vale.media} km/h), no horário de pico de volume.
        </p>
      </section>
      <div className="duas-colunas">
        <section className="caixa" aria-labelledby="t-g2">
          <h2 id="t-g2">Alertas por tipo</h2>
          <div className={`${s.grafico} ${s.baixo}`} aria-busy={!carregado}>
            {!carregado && <div className={`esqueleto ${s.esq}`} />}
            <canvas ref={refAl} role="img" aria-label={`Barras de alertas por tipo: ${alertas.velocidade} velocidade, ${alertas.pneu} pneu, ${alertas.invasao} invasão, ${alertas.clima} clima.`} />
          </div>
          <p className={s.resumo}>
            {totalAl} alertas: histórico de 24 h somado aos do turno atual ({sessao.clima} de clima real nesta sessão).
          </p>
        </section>
        <section className="caixa" aria-labelledby="t-g3">
          <h2 id="t-g3">Classificação dos pneus (0-5)</h2>
          <div className={`${s.grafico} ${s.baixo}`} aria-busy={!carregado}>
            {!carregado && <div className={`esqueleto ${s.esq}`} />}
            <canvas ref={refPn} role="img" aria-label="Barras da distribuição das notas de pneu" />
          </div>
          <p className={s.resumo}>{num(ruins * 100, 1)}% das leituras com nota de pneu abaixo de 2.</p>
        </section>
      </div>
    </>
  );
}
