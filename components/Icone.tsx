const CAMINHOS: Record<string, React.ReactNode> = {
  alerta: (
    <>
      <path d="M12 3 2 20.5h20L12 3Z" fill="currentColor" />
      <path d="M12 9.5v5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17.4" r="1.25" fill="#fff" />
    </>
  ),
  velocidade: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m12 17 4.5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  pneu: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  invasao: (
    <>
      <path d="M10 4h4l5 15H5L10 4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.3 10h7.4M6.9 14.5h10.2M3 19.5h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  clima: (
    <>
      <path d="M7 16a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1.4A3.3 3.3 0 0 1 17 16H7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 19-1 2M13 19l-1 2M17 19l-1 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  camera: <path d="M3 7.5h12v9H3zM15 10.5l6-3v9l-6-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  recarregar: (
    <path d="M19 12a7 7 0 1 1-2.1-5M19 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

export default function Icone({ nome, tamanho = 18 }: { nome: keyof typeof CAMINHOS | string; tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false" className="icone">
      {CAMINHOS[nome] ?? null}
    </svg>
  );
}
