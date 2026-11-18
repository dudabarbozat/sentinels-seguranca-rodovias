import CentralAlertas from "@/components/CentralAlertas";
import ClimaObras from "@/components/ClimaObras";
import DemoAoVivo from "@/components/DemoAoVivo";
import Indicadores from "@/components/Indicadores";
import Orientacao from "@/components/Orientacao";
import Recursos from "@/components/Recursos";
import RelatorioTurno from "@/components/RelatorioTurno";
import ResumoTurno from "@/components/ResumoTurno";

export default function PaginaInicial() {
  return (
    <>
      <section className="caixa">
        <h1 className="titulo-boas-vindas">Bem-vindo ao Sistema de Segurança Avançado Sentinels</h1>
        <hr />
        <ResumoTurno />
      </section>

      <DemoAoVivo />

      <Orientacao id="inicio">
        Os alertas que põem a equipe em risco chegam à central abaixo. Reconheça para assumir o caso e encerre quando a
        situação estiver resolvida.
      </Orientacao>

      <div className="grade-principal">
        <CentralAlertas />
        <div className="coluna-lateral">
          <ClimaObras compacto />
          <Indicadores />
        </div>
      </div>

      <RelatorioTurno />

      <section className="caixa" aria-labelledby="t-recursos">
        <h2 id="t-recursos">O que o sistema faz</h2>
        <p className="lead">
          O nosso sistema é projetado para oferecer uma solução completa de segurança para ambientes de trabalho em rodovias e
          áreas de construção. Aqui está o que o sistema pode fazer:
        </p>
        <Recursos />
      </section>
    </>
  );
}
