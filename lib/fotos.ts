/* Fotos do Wikimedia Commons usadas nos cartões "O que o sistema faz". Autor, licença e página vêm da API do Commons. */
export interface Foto {
  id: string;
  arquivo: string;
  alt: string;
  uso: string;
  titulo: string;
  autor: string;
  licenca: string;
  licencaUrl: string;
  pagina: string;
  largura: number;
  altura: number;
}

export const fotos: Foto[] = [
  {
    id: "temperatura-pneus",
    arquivo: "temperatura-pneus.webp",
    alt: "Câmera térmica apontada para o pneu de um caminhão, com a imagem infravermelha da roda na tela",
    uso: "Coleta de Dados de Temperatura dos Pneus",
    titulo: "Thermal imaging tire.jpg",
    autor: "Jonathan Clemens (Jclemens)",
    licenca: "CC BY-SA 3.0",
    licencaUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Thermal_imaging_tire.jpg",
    largura: 800,
    altura: 453,
  },
  {
    id: "velocidade-imagens",
    arquivo: "velocidade-imagens.webp",
    alt: "Caminhão passando por um medidor eletrônico de velocidade de 60 km/h numa rodovia de Santa Catarina",
    uso: "Medição de Velocidade por Meio de Imagens",
    titulo: "Rural speed control Santa Catarina 01 2008 Brazil.jpg",
    autor: "Mariordo",
    licenca: "Domínio público",
    licencaUrl: "",
    pagina: "https://commons.wikimedia.org/wiki/File:Rural_speed_control_Santa_Catarina_01_2008_Brazil.jpg",
    largura: 800,
    altura: 453,
  },
  {
    id: "qualidade-pneus",
    arquivo: "qualidade-pneus.webp",
    alt: "Banda de rodagem de um pneu gasto, com rachaduras e sulcos rasos",
    uso: "Identificação da Qualidade dos Pneus",
    titulo: "Close view of worn tire showing tread patterns and dirt in a garage setting.jpg",
    autor: "Shixart1985",
    licenca: "CC BY 2.0",
    licencaUrl: "https://creativecommons.org/licenses/by/2.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Close_view_of_worn_tire_showing_tread_patterns_and_dirt_in_a_garage_setting.jpg",
    largura: 800,
    altura: 453,
  },
];

export function foto(id: string): Foto {
  const f = fotos.find((x) => x.id === id);
  if (!f) throw new Error(`Foto não cadastrada: ${id}`);
  return f;
}
