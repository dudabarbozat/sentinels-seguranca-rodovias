"use client";

import Link from "next/link";
import { asset } from "@/lib/caminho";
import { useSentinels } from "./Provedor";

export default function Rodape() {
  const { restaurar } = useSentinels();
  return (
    <footer className="rodape">
      <div className="rodape__faixa" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="rodape__interno">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/img/sentinels-logo-azul.png")} width={876} height={284} alt="Sentinels" />
        <p>Portfólio pessoal com dados fictícios. Projeto apresentado no Hackarteris em 21/10/2023 e reimplementado em 2026.</p>
        <Link className="rodape__link" href="/creditos/">
          Créditos das imagens
        </Link>
        <button
          className="link-botao"
          type="button"
          onClick={() => {
            if (window.confirm("Restaurar os dados de exemplo? Alertas, ocorrências registradas e ajustes serão apagados.")) restaurar();
          }}
        >
          Restaurar dados de exemplo
        </button>
      </div>
    </footer>
  );
}
