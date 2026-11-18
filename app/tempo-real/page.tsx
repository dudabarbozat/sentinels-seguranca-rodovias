import type { Metadata } from "next";
import TelaTempoReal from "@/components/TelaTempoReal";

export const metadata: Metadata = { title: "Coletar Dados em Tempo Real" };

export default function Pagina() {
  return <TelaTempoReal />;
}
