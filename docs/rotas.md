# Rotas do BikerWay no MotoRede

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
- Links distintos para chegar ao início e consultar início → fim. O navegador
  decide o percurso; esses links não garantem passagem pela estrada catalogada.
- A tela de comboio permanece montada durante a consulta a outras abas para
  preservar a sessão de voz. Um aviso informa o estado do microfone e permite
  voltar ao comboio. Sair da conta desmonta a sessão. Tela bloqueada
  no navegador continua sujeita às limitações documentadas da plataforma.

Os cálculos não incluem aproximação, retorno por outro caminho, desvios ou
pedágios fora do trecho cadastrado. Sem consumo, preço ou tarifa conhecidos,
o custo total aparece como não calculado. Zero sem detalhamento explícito na
origem é tratado como tarifa desconhecida.

## Origem e curadoria externa

O conjunto inicial tem 15 rotas do repositório
<https://github.com/Nerodowble/BikerWay>, commit `245e5e5`. Esses registros
foram importados, **não auditados pelo MotoRede**. As datas são as declaradas
no BikerWay; disponibilidade de estradas, descrições, serviços e tarifas não
foram confirmadas. Nenhum ponto é anunciado como homologado pelo MotoRede.

A pesquisa e a ampliação podem ocorrer em um projeto externo, que publica
um catálogo versionado. O MotoRede mantém um snapshot local para consulta
sem rede; não executa pesquisa, raspagem ou cálculo de mapas. O contrato
`RotaCatalogo` separa esses dados das telas. Não foi criado um novo serviço de
curadoria nesta integração.

Para reproduzir a importação manual do formato atual do BikerWay:

```powershell
node scripts/importar-catalogo-bikerway.mjs <caminho-do-routes.json> <commit>
npm run build --workspace @motorede/shared
npm run test:rotas
```

O importador valida IDs, coordenadas, características e soma das praças de
pedágio antes de escrever `packages/shared/src/data/catalogoRotas.ts`.
Atualizações devem ser revisadas antes de publicar; a importação não certifica
a exatidão das fontes.

Referências dos links externos:
[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
e [Waze Deep Links](https://developers.google.com/waze/deeplinks).
