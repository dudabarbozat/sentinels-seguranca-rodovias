import type { Metadata } from "next";
import MapaVias from "@/components/MapaVias";

export const metadata: Metadata = { title: "Mapa de Vias" };

export default function Pagina() {
  return (
    <>
      <div className="caixa">
        <h1 className="titulo-secao">Mapa de Vias</h1>
        <p className="texto-mudo">
          BR-116/SP, km 335 ao 390. Mapa OpenStreetMap; traçado aproximado, pontos de coleta e obras fictícios; clima real da
          Open-Meteo nas obras.
        </p>
      </div>
      <MapaVias />
    </>
  );
}
