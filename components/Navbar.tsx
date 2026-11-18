"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { asset } from "@/lib/caminho";
import { useSentinels } from "./Provedor";
import s from "./Navbar.module.css";

const ITENS = [
  { href: "/", rotulo: "Página Inicial" },
  { href: "/tempo-real/", rotulo: "Coletar Dados em Tempo Real" },
  { href: "/graficos/", rotulo: "Gráfico de Dados" },
  { href: "/mapa/", rotulo: "Mapa de Vias" },
  { href: "/feedback/", rotulo: "Feedback dos Colaboradores" },
];

function ativo(caminho: string, href: string): boolean {
  const c = caminho.endsWith("/") ? caminho : caminho + "/";
  return href === "/" ? c === "/" : c.startsWith(href);
}

export default function Navbar() {
  const caminho = usePathname();
  const { estado, pronto } = useSentinels();
  const [aberto, setAberto] = useState(false);
  const abertos = pronto ? estado.alertas.filter((a) => a.status === "aberto").length : 0;

  useEffect(() => setAberto(false), [caminho]);

  return (
    <header className={s.navbar}>
      <div className={s.interno}>
        <Link className={s.marca} href="/" aria-label="Sentinels, página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/img/sentinels-logo-branco.png")} width={876} height={284} alt="Sentinels, sistema de segurança avançado" />
        </Link>
        <div className={s.direita}>
          <button
            type="button"
            className={s.botaoMenu}
            aria-expanded={aberto}
            aria-controls="menu-principal"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            onClick={() => setAberto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav id="menu-principal" className={`${s.menu} ${aberto ? s.aberto : ""}`} aria-label="Seções">
          {ITENS.map((i) => (
            <Link key={i.href} href={i.href} aria-current={ativo(caminho, i.href) ? "page" : undefined}>
              {i.rotulo}
              {i.href === "/" && abertos > 0 && (
                <span className={s.contador} aria-label={`${abertos} alertas abertos`}>
                  {abertos > 99 ? "99+" : abertos}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
