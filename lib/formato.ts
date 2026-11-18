export function num(n: number, casas = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function km(n: number): string {
  return "km " + num(n, 1);
}

export function hora(t: number | Date): string {
  const d = typeof t === "number" ? new Date(t) : t;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function horaCurta(t: number | Date): string {
  const d = typeof t === "number" ? new Date(t) : t;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

export function haQuanto(t: number, agora: number): string {
  const s = Math.max(0, Math.round((agora - t) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h} h ${m % 60} min`;
}

/* Máscara da matrícula do colaborador: COL-0000 */
export function mascaraMatricula(v: string): string {
  const digitos = v.replace(/\D/g, "").slice(0, 4);
  return digitos ? "COL-" + digitos : "";
}
