import type { Metadata } from "next";
import { asset } from "@/lib/caminho";
import { fotos } from "@/lib/fotos";

export const metadata: Metadata = { title: "Créditos das imagens" };

export default function Pagina() {
  return (
    <section className="caixa" aria-labelledby="t-creditos">
      <h1 className="titulo-secao" id="t-creditos">
        Créditos das imagens
      </h1>
      <p className="texto-mudo">
        Fotos do{" "}
        <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
          Wikimedia Commons
        </a>
        , recortadas na proporção dos cartões e convertidas para WebP. Ilustram os recursos da página inicial e não mostram
        obras, veículos ou equipes do projeto.
      </p>
      <ul className="creditos">
        {fotos.map((f) => (
          <li key={f.id} className="creditos__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(`/img/recursos/${f.arquivo}`)} alt="" width={96} height={54} loading="lazy" />
            <div>
              <p className="creditos__uso">{f.uso}</p>
              <p>
                <a href={f.pagina} target="_blank" rel="noreferrer">
                  {f.titulo}
                </a>
              </p>
              <p className="texto-mudo">
                {f.autor} ·{" "}
                {f.licencaUrl ? (
                  <a href={f.licencaUrl} target="_blank" rel="noreferrer">
                    {f.licenca}
                  </a>
                ) : (
                  f.licenca
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
