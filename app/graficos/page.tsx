import type { Metadata } from "next";
import Graficos from "@/components/Graficos";

export const metadata: Metadata = { title: "Gráfico de Dados" };

export default function Pagina() {
  return (
    <>
      <div className="caixa">
        <h1 className="titulo-secao">Gráfico de Dados</h1>
        <p className="texto-mudo">Últimas 24 horas no trecho (histórico simulado) somadas aos alertas do turno atual.</p>
      </div>
      <Graficos />
    </>
  );
}
