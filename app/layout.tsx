import type { Metadata, Viewport } from "next";
import "@fontsource/clear-sans/300.css";
import "@fontsource/clear-sans/400.css";
import "@fontsource/clear-sans/500.css";
import "@fontsource/clear-sans/700.css";
import "./globals.css";
import Provedor from "@/components/Provedor";
import Navbar from "@/components/Navbar";
import Rodape from "@/components/Rodape";
import { asset } from "@/lib/caminho";

export const metadata: Metadata = {
  title: { default: "Sentinels · Sistema de Segurança Avançado", template: "%s · Sentinels" },
  description:
    "Centro de operações que protege equipes de obra em rodovias: detecção de veículos por câmera, alertas de velocidade, pneus e invasão da área de obra, clima nas obras e feedback dos colaboradores.",
  icons: { icon: asset("/img/favicon.png") },
};

export const viewport: Viewport = { themeColor: "#343a40", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Provedor>
          <Navbar />
          <main id="conteudo" tabIndex={-1}>
            {children}
          </main>
          <Rodape />
        </Provedor>
      </body>
    </html>
  );
}
