import { asset } from "@/lib/caminho";
import { foto } from "@/lib/fotos";
import s from "./Recursos.module.css";

const recursos = [
  {
    foto: foto("temperatura-pneus"),
    titulo: "Coleta de Dados de Temperatura dos Pneus",
    texto:
      "Utilizamos sensores avançados para coletar dados de temperatura dos pneus de veículos em tempo real. Isso nos permite monitorar o desgaste e a condição dos pneus.",
  },
  {
    foto: foto("velocidade-imagens"),
    titulo: "Medição de Velocidade por Meio de Imagens",
    texto:
      "Nossa tecnologia de visão computacional é capaz de medir a velocidade dos veículos utilizando imagens capturadas no local. Isso ajuda a manter um controle preciso da velocidade dos veículos na área de trabalho.",
  },
  {
    foto: foto("qualidade-pneus"),
    titulo: "Identificação da Qualidade dos Pneus",
    texto:
      "Utilizamos algoritmos de aprendizado de máquina para identificar a qualidade dos pneus dos veículos. Qualquer problema, como pneus desgastados, é identificado e relatado imediatamente.",
  },
];

/* Os três cartões turquesa do protótipo original, com fotos reais do Wikimedia Commons (créditos em /creditos/). */
export default function Recursos() {
  return (
    <div className={s.recursos}>
      {recursos.map((r) => (
        <article key={r.foto.id} className={s.recurso}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={s.img}
            src={asset(`/img/recursos/${r.foto.arquivo}`)}
            alt={r.foto.alt}
            width={r.foto.largura}
            height={r.foto.altura}
            loading="lazy"
            decoding="async"
          />
          <div className={s.corpo}>
            <h3>{r.titulo}</h3>
            <p>{r.texto}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
