"use client";

import type { ReactNode } from "react";
import { useSentinels } from "./Provedor";

/* Dica curta de primeira visita, uma por tela. */
export default function Orientacao({ id, children }: { id: string; children: ReactNode }) {
  const { pronto, estado, atualizar } = useSentinels();
  if (!pronto || estado.orientacaoVista[id]) return null;
  return (
    <div className="orientacao" role="note">
      <p>{children}</p>
      <button
        type="button"
        className="btn btn-claro btn-sm"
        onClick={() => atualizar((e) => ({ ...e, orientacaoVista: { ...e.orientacaoVista, [id]: true } }))}
      >
        Entendi
      </button>
    </div>
  );
}
