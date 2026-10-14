# Catálogo de rotas do MotoRede

O catálogo está disponível na aba **Rotas** do app e em **Mais → Rotas** na web.
As duas telas usam o domínio puro `packages/shared/src/domain/rotas.ts` e o
mesmo conjunto de dados. A navegação é aberta no Google Maps ou Waze.

## O que foi integrado

- Navegação **Explorar / Salvas**, com favoritos locais por aparelho ou navegador
  (sem sincronização entre dispositivos).
- Cards compactos e detalhes em tela própria, preservando busca, filtros, lote
  e posição da lista ao voltar. Planejamento de gastos fica nos detalhes.
- Filtros separados com rascunho, contagem de resultados e aplicação explícita:
  região, extensão, pavimento e curvas. Cancelar não modifica a busca.
- Atalhos **Perto de mim**, **Até 100 km** e **Asfalto**; ordenação por nome,
  menor percurso ou proximidade. Proximidade exige localização disponível.
- Resultados em lotes de 20; lista virtualizada no app e grade adaptável na web.
  O catálogo continua sendo um snapshot local, sem paginação de servidor.

- Busca por nome, cidade ou estado, filtros de pavimento e curvas.
- Ordenação por proximidade ao início, em linha reta, quando há localização.
  No app a consulta é manual, apenas em primeiro plano, e não registra presença
  na rede de socorro.
- Combustível por distância ÷ consumo × preço informado pelo piloto.
- Pedágios do catálogo e custo do trecho de ida ou do mesmo trecho nos dois
  sentidos. Ida e volta duplica distância e tarifas; não representa a volta
  calculada por um serviço de roteamento.
- Comparação com orçamento e autonomia planejados, pontos de apoio,
  observações e fontes disponíveis na origem.
- **Montar viagem · Google Maps** abre origem atual (ou informada no Maps) →
  início como parada → final como destino, numa única solicitação. Há também
  links distintos para somente chegar ao início e consultar início → fim.
  O Waze recebe somente o início. Pontos de apoio não viram paradas automáticas:
  podem ser desvios ou locais sem acesso de moto.
  O navegador decide o percurso; esses links não garantem passagem pela estrada
  catalogada. Alguns produtos Google Maps ignoram paradas intermediárias;
  confira os pontos e o trajeto antes de iniciar.
- A tela de comboio permanece montada durante a consulta a outras abas para
  preservar a sessão de voz. Um aviso informa o estado do microfone e permite
  voltar ao comboio. Sair da conta desmonta a sessão. Tela bloqueada
  no navegador continua sujeita às limitações documentadas da plataforma.

Os cálculos não incluem aproximação, retorno por outro caminho, desvios ou
pedágios fora do trecho cadastrado. Sem consumo, preço ou tarifa conhecidos,
o custo total aparece como não calculado. Zero sem detalhamento explícito na
origem é tratado como tarifa desconhecida.

### Restrições e correções locais

`packages/shared/src/data/revisoesRotas.ts` aplica correções após importar o
snapshot, preservando-as numa nova importação. O Caminho do Mar tem restrição
de circulação de veículos particulares no trecho de serra; sua ficha informa
essa condição e não oferece viagem completa, travessia ou cálculo do trecho
como passeio de moto. O link de aproximação vai somente ao início cadastrado,
sem prometer acesso ao parque. Consulte o [operador](https://caminhosdomar.com.br/sua-visita).

Os links do Google Maps não devolvem quilômetros, tempo ou tarifas ao MotoRede.
Para estimar o total dentro do app é necessária uma integração de roteamento
rodoviário; não se deve somar a distância em linha reta aos quilômetros do catálogo.

## Pontos de carimbo da Rota Biker

A aba **Rota Biker** lista os Monumentos ao Cumprimento Biker, onde se carimba
o passaporte da [Rota Biker](https://monumentobikers.com.br/), em cards próprios
(número, local, cidade, situação, "Como chegar" e Instagram). Nos detalhes de
cada rota, a seção **Carimbo da Rota Biker por perto** mostra monumentos em
cidades a até 20 km, em linha reta, do início, do fim ou de um ponto de apoio.

- Dados: `packages/shared/src/data/monumentosRotaBiker.ts`; regras:
  `packages/shared/src/domain/rotaBiker.ts`; testes em
  `tests/rotas/rotaBiker.test.mts` (rodam com `npm run test:rotas`).
- Fonte: site oficial, consultado em 2026-10-13 (nº 1 a 44; o nº 2 está "em
  atualização" e ficou fora; 40 a 44 estão em construção; o nº 30 fica no Paraguai).
- Coordenadas são do centro da cidade (OpenStreetMap), não do estabelecimento.
  "Como chegar" pesquisa o nome do local no Google Maps.
- Para atualizar, edite o arquivo de dados à mão conferindo o site oficial; o
  importador de rotas não se aplica a monumentos.

## Origem e como adicionar rotas

As 15 rotas iniciais vieram de um projeto usado só como referência e foram
copiadas uma única vez; o MotoRede não depende dele. O catálogo é mantido
aqui, no formato `RotaCatalogo`. Esses registros **não foram auditados pelo
MotoRede**: datas, serviços e tarifas não foram confirmados, e nenhum ponto
é anunciado como homologado.

O app não pesquisa rotas. A pesquisa é feita fora dele (por exemplo, pelo
Codex com busca na web) e entregue num arquivo JSON, que o importador valida
e **acrescenta** ao fim do catálogo. Rotas existentes nunca são alteradas
pelo importador; correções locais ficam em `revisoesRotas.ts`.

```powershell
npm run rotas:importar -- rotas-novas.json --verificar   # só valida
npm run rotas:importar -- rotas-novas.json               # valida e acrescenta
npm run test:rotas
```

Se houver qualquer erro, nada é gravado e todos os problemas são listados.
O arquivo de rotas novas é temporário e não fica no repositório.

### Base JSON de uma rota

O arquivo é um array com uma ou mais rotas:

```json
[
  {
    "id": "nome-da-rota-uf",
    "nome": "Nome da Rota (BR-000)",
    "regiao": "UF, Brasil",
    "inicio": { "cidade": "Cidade de início", "lat": 0, "lng": 0 },
    "fim":    { "cidade": "Cidade de fim",    "lat": 0, "lng": 0 },
    "distanciaKm": 0,
    "pavimento": "asfalto",
    "curvas": "medio",
    "trechoSemPostoKm": 0,
    "pedagioIda": 0,
    "pedagios": [
      { "nome": "Praça X (km 00)", "valorMoto": 0, "sistema": "fisica", "fonte": "https://..." }
    ],
    "pontosApoio": [
      { "nome": "Posto Y", "tipo": "posto_gasolina", "descricao": "Por que importa para o motociclista.", "lat": 0, "lng": 0 }
    ],
    "revisao": "AAAA-MM-DD",
    "descricao": "Texto de 1 a 3 parágrafos, voz de motociclista.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Meses bons e o que evitar.",
    "observacoes": ["Risco específico e onde ocorre."],
    "fontes": ["https://...", "https://..."]
  }
]
```

| Campo | Regra |
|---|---|
| `id` | Único, kebab-case, termina com a sigla do estado (`serra-x-sc`). |
| `nome` | Inclui a rodovia entre parênteses. |
| `regiao` | `"SC, Brasil"` ou estados na ordem do trajeto: `"MG/SP, Brasil"`. |
| `inicio`, `fim` | Cidade e coordenadas reais (OpenStreetMap ou Google Maps), dentro do Brasil. Nunca inventar. |
| `distanciaKm` | Pelo menos 20 km, conferida no Google Maps. |
| `pavimento` | `asfalto`, `misto` ou `terra` (terra só com justificativa na descrição). |
| `curvas` | `baixo`, `medio` ou `alto`. |
| `trechoSemPostoKm` | Maior distância seguida sem posto aberto, sem passar de `distanciaKm`. Na dúvida, errar para mais. |
| `pedagioIda` | Valor de moto de uma passagem só; o app dobra para ida e volta. `null` se não confirmado (e então sem `pedagios`). |
| `pedagios` | Uma entrada por praça ou pórtico (`fisica` ou `free_flow`). `[]` quando conferido e sem pedágio. A soma tem de ser **exatamente** `pedagioIda`. |
| `pontosApoio` | De 1 a 12, com pelo menos um `posto_gasolina`. Tipos: `posto_gasolina`, `mirante`, `restaurante`, `ponto_historico`, `hotel`. |
| `revisao` | Data da pesquisa, `AAAA-MM-DD`. |
| `dificuldade` | Opcional: `iniciante`, `intermediario` ou `avancado`. |
| `descricao`, `melhorEpoca` | Opcionais. Tom de motociclista, sem texto de agência de turismo. |
| `observacoes` | Riscos verificáveis (neblina, animais, trecho sem sinal); pode ser vazia. |
| `fontes` | Pelo menos 2 links `https` realmente consultados. Pedágio: concessionária, ANTT/ARTESP ou notícia datada do último reajuste. |

Campos fora dessa lista são recusados, para pegar nome digitado errado.
O importador confere formato e coerência, não a verdade dos dados: revise
coordenadas, pedágios e distância sem posto antes de publicar.

### Publicar rotas novas

O JSON não é enviado a nenhum servidor. O catálogo faz parte do código
(`packages/shared/src/data/catalogoRotas.ts`) e web e app o leem localmente,
então rotas novas sobem como qualquer mudança de código:

1. **Importar e testar**
   ```powershell
   npm run rotas:importar -- rotas-novas.json
   npm run build --workspace @motorede/shared
   npm run test:rotas
   ```
   Depois, apague o `rotas-novas.json`.
2. **Web:** commit e push no `main`. A Vercel publica sozinha em
   `motorede-web.vercel.app`.
3. **App:** é só JavaScript, então basta OTA (sem APK novo):
   ```powershell
   cd apps/mobile
   $env:EAS_SKIP_AUTO_FINGERPRINT=1; npx eas-cli update --channel preview --environment preview --message "Rotas novas: <região>"
   ```
   O piloto recebe ao reabrir o app (às vezes na segunda abertura).

Cada lote exige esse ciclo. A evolução para o app baixar o catálogo da API,
sem nova publicação, está descrita na ideia 34 de [ideias.md](ideias.md).

Referências dos links externos:
[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
e [Waze Deep Links](https://developers.google.com/waze/deeplinks).
