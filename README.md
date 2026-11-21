# Sentinels — segurança em obras nas rodovias

Centro de operações que protege equipes de obra em rodovias: detecta veículos por câmera, estima a velocidade, alerta quando alguém invade a área de obra e cruza tudo com o clima no local.

**Demo:** https://dudabarbozat.github.io/sentinels-seguranca-rodovias/

Projeto apresentado no Hackarteris (hackathon da concessionária Arteris, 21/10/2023) e reconstruído em 2026 como protótipo navegável.

## Para quem

Concessionárias de rodovias e equipes de segurança que precisam monitorar obras na pista e reagir a riscos em tempo real.

## Funcionalidades

- **Visão computacional no navegador** (TensorFlow.js + COCO-SSD): carros, caminhões, ônibus e motos na câmera do aparelho, em vídeo enviado ou em câmeras públicas de trânsito. Nenhuma imagem é enviada.
- **Velocidade estimada** por calibração entre duas linhas e **área de obra** desenhada sobre a imagem, com alerta de invasão e de excesso de velocidade.
- **Demonstração ao vivo** com câmera real de Londres e painel de impacto estimado pelo modelo de potência de Nilsson e pelos números do DENATRAN.
- **Clima real nas obras** (Open-Meteo), que reduz o limite recomendado com chuva ou baixa visibilidade.
- **Central de alertas** com prioridade, relatório de turno, gráficos, mapa de vias e feedback dos colaboradores.

## Stack

Next.js 15 (exportação estática) · React 19 · TypeScript · TensorFlow.js · Chart.js · Leaflet

| Serviço | Uso |
|---------|-----|
| [Open-Meteo](https://open-meteo.com/) | Clima nas obras |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Mapas |
| [TfL JamCams](https://api.tfl.gov.uk/) e [Caltrans CCTV](https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm) | Câmeras públicas de trânsito |

Sem backend e sem chaves de API.

## Como rodar

```bash
npm ci
npm run dev
```

A câmera exige `localhost` ou HTTPS.

## Limitações do protótipo

Pontos de coleta, obras, equipes e ocorrências são fictícios. Sensores de pneu, envio de alertas aos motoristas e a área de obra da demonstração são simulados; a velocidade nas câmeras públicas serve para testar a detecção, não para fiscalizar. O impacto é uma estimativa ilustrativa.

## Equipe

- Eduarda Barboza — design UX/UI
- João Filho — engenharia e desenvolvimento fullstack
- Rafael da Silva — logística
- Gabriel Eduardo — farmácia

## Licença

Código sob [MIT](LICENSE). Câmeras: "Powered by TfL Open Data" e Caltrans. Créditos das fotos em [CREDITOS.md](CREDITOS.md).
