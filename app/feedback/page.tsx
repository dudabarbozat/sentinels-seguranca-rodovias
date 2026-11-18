import type { Metadata } from "next";
import Feedback from "@/components/Feedback";
import Orientacao from "@/components/Orientacao";

export const metadata: Metadata = { title: "Feedback dos Colaboradores" };

export default function Pagina() {
  return (
    <>
      <div className="caixa">
        <h1 className="titulo-secao">Feedback dos Colaboradores</h1>
        <p className="texto-mudo">Relatos da equipe em campo sobre quase acidentes, sinalização e equipamentos.</p>
      </div>
      <Orientacao id="feedback">
        Registre o relato em menos de um minuto. A triagem ordena os pendentes por risco e sugere a próxima ação.
      </Orientacao>
      <Feedback />
    </>
  );
}
