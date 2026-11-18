# sentinels-seguranca-rodovias

Centro de operações para proteger equipes de obra em rodovias: detecção de veículos no navegador (câmera do aparelho, vídeo enviado ou câmeras públicas de órgãos de trânsito), estimativa de velocidade por calibração, alerta de invasão da área de obra, clima real nas obras, central de alertas com prioridade e relatório de turno.

Demo: https://dudabarbozat.github.io/sentinels-seguranca-rodovias/

Portfólio pessoal. Projeto apresentado no Hackarteris em 21/10/2023 e reimplementado em 2026 com Next.js e APIs públicas.

## Contexto

- Evento: Hackarteris, hackathon da concessionária de rodovias Arteris, 21/10/2023.
- Problema: acidentes nas rodovias que colocam em risco os trabalhadores de obras na pista.
- Proposta original (Sentinels): plataforma com câmeras e radares que transforma dados em alertas. Mede a velocidade dos veículos por imagem, coleta a temperatura dos pneus, classifica a qualidade do pneu e o tamanho do veículo, avisa quando um veículo invade a área de trabalho e envia alertas em tempo real a motoristas e colaboradores, com aprendizado de máquina profundo. Complementos: mapa de vias, gráficos, indicadores personalizáveis e feedback dos colaboradores. Para viabilizar, a equipe pedia câmeras e radares, um banco de imagens e acesso às câmeras via API.
- Equipe:
  - Eduarda Barboza (design UX/UI)
  - João Filho (engenharia e desenvolvimento fullstack)
  - Rafael da Silva (técnico em logística)
  - Gabriel Eduardo (farmácia)
- Números citados no pitch (fonte: DENATRAN):

| Ano  | Acidentes | Resultando em mortes |
|------|-----------|----------------------|
| 2021 | +500.000  | 11.479               |
| 2022 | 595.572   | 12.201               |

## Funcionalidades

A navegação segue o protótipo do evento (Página Inicial, Coletar Dados em Tempo Real, Gráfico de Dados, Mapa de Vias, Feedback dos Colaboradores). Por cima dela:

- Demonstração ao vivo na página inicial: ao abrir o site, uma câmera real da TfL (Londres) toca em laço com a detecção rodando, uma área de obra simulada e linhas de calibração pré-configuradas. Um painel cruza as medições com o modelo de potência de Nilsson, o clima real no ponto da câmera e os números do DENATRAN. Ver a seção "Demonstração ao vivo".
- Visão computacional real: COCO-SSD (TensorFlow.js) detecta carros, caminhões, ônibus e motos na câmera do aparelho, num vídeo enviado ou em câmeras públicas de trânsito. Rastreamento por centroide, velocidade estimada entre duas linhas marcadas sobre a imagem com a distância informada em metros, e área de obra desenhada como polígono. Veículo dentro da área gera alerta crítico; acima do limite, alerta de velocidade. Tudo roda no navegador; nenhuma imagem é enviada.
- Clima real nas obras (Open-Meteo): chuva, visibilidade e rajadas no ponto médio de cada obra reduzem o limite recomendado e geram alerta.
- Central de alertas com prioridade (crítica, alta, média, baixa), reconhecer, encerrar, reabrir e histórico.
- Câmeras públicas: câmeras reais da Transport for London e da Caltrans, escolhidas numa lista ou no mapa, como teste da detecção.
- Relatório de turno e triagem das ocorrências por regras fixas sobre os dados do turno (alertas, clima e relatos).
- Estados de carregando, vazio, erro e sucesso; orientação curta na primeira visita; validação inline e máscara de matrícula; diálogo acessível; menu recolhível no celular.

## Telas

- `/` Página inicial: situação do turno, demonstração ao vivo com impacto estimado, central de alertas, clima nas obras, indicadores personalizáveis, relatório de turno e os três recursos do sistema.
- `/tempo-real/` Coletar dados em tempo real, em duas abas:
  - Simulação: uma leitura a cada 1,5 s com carro, temperatura e classificação dos pneus (0 a 5), velocidade, tamanho, ponto e situação; limite da via configurável; classificação de pneu simulada com "Ligar Câmera" e "Desligar Câmera".
  - Câmera ou vídeo: detecção real com calibração de velocidade e área de obra.
  - Câmeras públicas: lista e mapa de câmeras oficiais; a mesma detecção e as mesmas marcações rodam sobre a imagem do órgão. `/tempo-real/#publicas` abre direto nesta aba (também `#simulacao` e `#camera`).
- `/graficos/` Gráfico de dados: velocidade média por hora, alertas por tipo e notas de pneu.
- `/mapa/` Mapa de vias: trecho da BR-116/SP com pontos de coleta, obras e clima de cada obra.
- `/feedback/` Feedback dos colaboradores: formulário, lista com filtro e troca de status, triagem.
- `/creditos/` Créditos das imagens: autor, licença e link de cada foto usada.

## APIs e bibliotecas

| Serviço | Para quê | Chave |
|---------|----------|-------|
| [Open-Meteo](https://open-meteo.com/en/docs) | Clima atual (precipitação, visibilidade, vento, rajadas, dia ou noite) nas obras e no ponto da câmera da demonstração, consultado a cada 10 min | Não |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) via [Leaflet](https://leafletjs.com/) | Mapa do trecho e mapa das câmeras públicas | Não |
| [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) em [TensorFlow.js](https://www.tensorflow.org/js) | Detecção de veículos; os pesos do modelo (cerca de 5 MB) vêm do Google Cloud Storage na primeira vez | Não |
| [TfL Unified API, JamCams](https://api.tfl.gov.uk/) | Lista de câmeras de Londres e clipes MP4 de cerca de 10 s por câmera | Não |
| [Caltrans CWWP2, CCTV](https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm) | Lista de câmeras por distrito (CSV) e foto atual de cada câmera | Não |

Todas aceitam chamadas do navegador (CORS). Não há backend nem proxy.

## Demonstração ao vivo

Bloco no topo da página inicial (`components/DemoAoVivo.tsx` e `components/PainelImpacto.tsx`).

- Câmera: clipe MP4 de cerca de 10 s da TfL, baixado como blob e tocado em laço. Lista curta em `lib/cameras.ts` (`CAMERAS_DEMO`), em ordem de preferência: A2 Eltham West, A406 North Circular / Great Central Way, A12 Gants Hill e A406 Ace Cafe. Estão entre as que tiveram mais detecções num teste com clipes reais, com veículos grandes no quadro. Se o clipe de uma falhar (rede, câmera fora do ar, arquivo vazio), a próxima é usada. A cada 60 s o app procura um clipe novo pelo `Last-Modified`; a TfL renova a cada poucos minutos.
- Contagem: só a primeira passada de cada clipe conta. As repetições do laço continuam desenhando as caixas, mas não somam veículos nem geram alertas.
- Camada simulada: cada câmera tem duas linhas de lado a lado do quadro, com distância estimada pela perspectiva e pelas marcações da pista (20 a 25 m), e uma área de obra fictícia sobre uma faixa, com limite de 40 km/h. A imagem traz o rótulo "Câmera real (TfL, Londres) · área de obra simulada".
- Alertas: veículo dentro da área ou acima do limite entra na central de alertas com origem "Demonstração", no máximo um de cada tipo a cada 30 s.
- Desempenho e acessibilidade: o modelo só é baixado quando o bloco aparece na tela. A detecção pausa quando a aba fica oculta ou o bloco sai da tela (IntersectionObserver). Com `prefers-reduced-motion`, nada toca até o visitante clicar em "Iniciar demonstração"; há sempre um botão de pausa. Em aparelho lento a reprodução cai para 0,5x ou 0,25x, e o tempo usado no cálculo é o do vídeo, então a velocidade medida não muda. Os contadores são anunciados a leitores de tela no máximo a cada 20 s.
- Clima: Open-Meteo no ponto da câmera. A mesma regra das obras (`avaliarClima` em `lib/clima.ts`) reduz o limite da obra simulada com chuva a partir de 0,5 mm ou visibilidade abaixo de 2 km (10 a 20 km/h, mínimo de 30). É regra do protótipo, não dado científico. À noite em Londres o painel avisa que a detecção perde veículos.

### Impacto estimado: fórmula e hipóteses

Modelo de potência (Nilsson, 2004): a variação no número de acidentes acompanha a variação da velocidade média do tráfego elevada a um expoente.

```
acidentes depois / acidentes antes = (v1 / v0) ^ k
redução do risco = 1 - (v1 / v0) ^ k
k = 4 (acidentes fatais), 3 (fatais ou graves), 2 (acidentes com feridos)
```

- v0: média das velocidades medidas na câmera.
- v1: média no cenário com alerta. Cada veículo acima do limite reduz uma fração `a` do excesso: `v' = v - a * (v - limite)`. `a` é a adesão ao alerta, escolhida pelo visitante (padrão 50%). Com `a = 100%`, todos os que estavam acima passam no limite.
- Leitura conservadora: Elvik (2009) revisou os expoentes com 115 estudos e separou por ambiente. Para vias urbanas, onde estão as câmeras: 2,6 para acidentes fatais e 1,2 para todos os acidentes com feridos (tabela S1). Para vias rurais e rodovias: 4,1 e 1,6. O painel mostra Nilsson e, ao lado, Elvik urbano.
- Cenário de referência (simulado): enquanto a câmera não mediu 3 velocidades (à noite ou no trânsito parado isso pode demorar), a redução de risco e a projeção usam uma amostra fixa de 30 velocidades fictícias numa obra com limite de 40 km/h, 14 delas acima do limite (média 42,6 km/h): 30, 32, 34, 35, 36, 36, 37, 38, 38, 39, 39, 39, 40, 40, 40, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 52, 53, 55, 58, 62 km/h (`AMOSTRA_REFERENCIA` em `lib/impacto.ts`). O painel mostra o selo SIMULADO e a linha "Cenário de referência (simulado) até a câmera medir 3 velocidades · n de 3 medidas". Com 3 medições reais, passa a usar as velocidades medidas, com o selo ESTIMATIVA/MEDIDA, sem mudar o layout. Os controles de adesão, cobertura e ano valem nos dois modos. Com a amostra de referência, 50% de adesão e 10% das vias, o resultado é cerca de 18,3% menos risco fatal e 223 mortes por ano (2022).
- Projeção ilustrativa: `mortes evitadas por ano = mortes no ano (DENATRAN) × % das vias com o sistema × redução do risco fatal`. O ano (2022: 12.201 mortes; 2021: 11.479) e a cobertura (padrão 10%) são escolhidos pelo visitante. O cálculo completo aparece em "Como chegamos nesse número".
- Limites: aplicar a redução de acidentes fatais ao número de mortes é uma simplificação; as velocidades vêm de poucos segundos de vídeo urbano de Londres com distância estimada; rodovias brasileiras têm outro perfil. O painel marca cada número como real, simulado ou estimativa e não promete resultado.

Referências:

- Nilsson, G. (2004). Traffic safety dimensions and the Power Model to describe the effect of speed on safety. Lund Institute of Technology, Bulletin 221. https://lup.lub.lu.se/record/21612
- Elvik, R. (2009). The Power Model of the relationship between speed and road safety: update and new analyses. TØI report 1034/2009. https://www.toi.no/publications/the-power-model-of-the-relationship-between-speed-and-road-safety-update-and-new-analyses-article27943-29.html
- Cameron, M. H.; Elvik, R. (2010). Nilsson's Power Model connecting speed and road trauma: applicability by road type and alternative models for urban roads. Accident Analysis & Prevention. https://pubmed.ncbi.nlm.nih.gov/20728642/ (resume os expoentes 4, 3 e 2 de Nilsson).

## Câmeras públicas: fontes testadas

Critério: órgão oficial, dados abertos, sem chave e CORS liberado tanto na lista quanto na imagem ou no vídeo. Sem CORS na mídia, o navegador marca o canvas como "tainted" e o TensorFlow.js não lê os pixels. Teste feito em 18/11/2026 com o cabeçalho `Origin` de `dudabarbozat.github.io`.

| Fonte | Lista | Mídia | Resultado |
|-------|-------|-------|-----------|
| Transport for London, JamCams (`api.tfl.gov.uk/Place/Type/JamCam`) | JSON com `Access-Control-Allow-Origin: *` | MP4 e JPG no S3 (`jamcams.tfl.gov.uk`) com `Access-Control-Allow-Origin: *` | Usada. Cerca de 830 câmeras disponíveis; o clipe permite rastrear e estimar velocidade. Atribuição: "Powered by TfL Open Data". |
| Caltrans CWWP2, distritos 7 (Los Angeles) e 4 (Baía de São Francisco) | CSV e JSON com `Access-Control-Allow-Origin: *` | JPG em `cwwp2.dot.ca.gov` com `Access-Control-Allow-Origin: *` | Usada. Foto renovada a cada poucos minutos: contagem e área de obra, sem velocidade. O servidor é lento (a lista do distrito leva de 8 a 30 s) e não comprime, por isso o app baixa o CSV, que tem metade do tamanho do JSON. Uso sem custo, conforme as condições da Caltrans. |
| Caltrans, vídeo HLS (`wzmedia.dot.ca.gov`) | a mesma | `.m3u8` com CORS liberado | Não usada: o Chrome no desktop não toca HLS sem uma biblioteca extra (hls.js). Seria o caminho para estimar velocidade nas câmeras da Califórnia. |
| NYC DOT (`webcams.nyctmc.org/api/cameras`) | sem resposta | sem resposta | Não usada: o servidor recusou a conexão a partir do Brasil durante o teste. |
| Ontario 511 (`511on.ca/api/v2/get/cameras`) | respondeu "Invalid Key" | não testada | Não usada: exige chave. |
| WSDOT (Washington) | a API de câmeras exige `AccessCode` | não testada | Não usada: exige chave. |
| Fontes brasileiras (CET-SP, CET-Rio, COR, portais de dados abertos) | não há API oficial e aberta com imagens de câmeras | - | Não usada. Os portais publicam contagens e indicadores, não imagens. |

Câmeras privadas ou expostas sem autorização (agregadores como o Insecam) ficaram de fora por princípio. Se uma fonte deixar de enviar CORS, a câmera continua aparecendo, com o aviso de que a detecção não roda nela.

## O que é simulado

- A aba Simulação: leituras de um gerador pseudoaleatório com semente fixa (mesma semente e mesmo número de leitura geram o mesmo veículo), incluindo temperatura e nota do pneu, que dependem de sensores que o navegador não tem.
- O histórico de 24 h dos gráficos.
- O envio de alertas ao painel da via e aos colaboradores.
- Pontos de coleta, obras, equipes, placas, matrículas e ocorrências são fictícios. O traçado no mapa é aproximado.
- Na demonstração da página inicial: o cenário de referência usado até a câmera medir 3 velocidades, a área de obra, o limite de 40 km/h, a distância entre as linhas (estimada, não medida), o efeito do alerta sobre os motoristas e a cobertura da projeção. São reais o clipe da TfL, as detecções, as velocidades medidas com essa calibração e o clima. A redução de risco e as mortes evitadas são estimativas ilustrativas do modelo de potência. As câmeras da TfL podem ser giradas pelos operadores; nesse caso a área de obra deixa de coincidir com a faixa até a câmera voltar.
- A velocidade estimada na câmera é geométrica e simples; depende do ângulo da câmera e da distância informada. Nas câmeras públicas a distância real entre as linhas não é conhecida, então o número serve para testar a detecção, não para fiscalizar.
- O relatório de turno e a triagem seguem regras fixas; não há modelo de linguagem.

## Visual

- Cores: `#343a40`, `#f7f7f7`, `#0abfbc`, `#c92244` das capturas do protótipo do evento; `#03509d`, `#12a238`, `#75b62a`, `#ff7800` dos slides.
- Tipografia: Clear Sans (`@fontsource/clear-sans`). Codec Pro e Mister Giacco, usadas nos slides, não têm distribuição aberta.
- Logo extraído do PDF do pitch, em `public/img/`.
- Fotos reais do [Wikimedia Commons](https://commons.wikimedia.org/) (domínio público, CC BY e CC BY-SA) nos três cartões de recursos da página inicial, em WebP, em `public/img/recursos/`. Autor, licença e link de cada uma em [CREDITOS.md](CREDITOS.md), em `lib/fotos.ts` e na rota `/creditos/` (link no rodapé).

## Stack

Next.js 15 (App Router, exportação estática), React 19, TypeScript estrito, CSS Modules. Dependências: `leaflet`, `chart.js`, `@tensorflow/tfjs`, `@tensorflow-models/coco-ssd`, `@fontsource/clear-sans`. Estado em `localStorage`; o rodapé tem "Restaurar dados de exemplo".

## Como rodar

```
npm ci
npm run dev
```

Acesse http://localhost:3000. A câmera exige `localhost` ou HTTPS.

Build estático igual ao de produção:

```
NEXT_PUBLIC_BASE_PATH=/sentinels-seguranca-rodovias npm run build
```

A saída fica em `out/`.

## Publicação

`.github/workflows/pages.yml` roda a cada push na `main`: `npm ci`, build com `NEXT_PUBLIC_BASE_PATH=/sentinels-seguranca-rodovias` e deploy da pasta `out` no GitHub Pages. No repositório, em Settings > Pages, a fonte deve ser "GitHub Actions".

## Estrutura

```
app/                  rotas (layout, página inicial, tempo-real, graficos, mapa, feedback, creditos) e globals.css
components/           telas e componentes (central de alertas, visão, câmeras públicas, mapa, gráficos...)
lib/dados.ts          trecho, pontos, obras e ocorrências fictícios
lib/simulador.ts      gerador com semente, regras de alerta e histórico
lib/rastreador.ts     rastreamento por centroide, cruzamento de linhas e polígono
lib/deteccao.ts       modelo COCO-SSD compartilhado, passo do rastreador e desenho da cena
lib/impacto.ts        modelo de potência, cenário com alerta e projeção com números do DENATRAN
lib/clima.ts          Open-Meteo e regras de limite recomendado
lib/cameras.ts        câmeras públicas (TfL e Caltrans) e câmeras da demonstração
lib/regras.ts         relatório de turno e triagem por regras
lib/armazenamento.ts  estado no localStorage
lib/fotos.ts          fotos do Wikimedia Commons e seus créditos
public/img/           logo, favicon e recursos/ com as fotos dos cartões
```

## Licença

MIT. Ver [LICENSE](LICENSE).
