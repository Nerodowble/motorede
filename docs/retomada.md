# Retomada rápida — 12/10/2026

## Estado e orientação do usuário

- O usuário pediu encerrar o trabalho para economizar o limite do Codex. Esta
  nota registra o estado; aguarde uma nova solicitação antes de continuar.
- Web e app nativo são desenvolvidos juntos. Não criar mapa próprio; usar
  navegação externa. Não mostrar referências ao BikerWay na interface.
- O catálogo inicial tem 15 rotas não auditadas. O BikerWay foi só
  referência: o MotoRede não depende dele. Rotas novas entram por
  `npm run rotas:importar`, a partir de um JSON pesquisado fora do app.
- As imagens de redesign foram rejeitadas. O catálogo atual mantém o tema
  do MotoRede, com Explorar/Salvas, filtros, cards compactos e detalhes separados.

## Entregas e publicações

| Commit | Entrega |
|---|---|
| `e50d199` | Configuração FCM do push Android; versão nativa 0.3.1. |
| `20f75a8` | Remoção das referências ao projeto de origem na interface. |
| `3faa989` | Catálogo com favoritos locais, filtros, ordenação, lotes de 20 e lista virtualizada no app. |
| `3a227ec` | Viagem com aproximação no Google Maps e restrição do Caminho do Mar. |

Todos esses commits foram enviados ao `main`. O site em produção confirmou
`3a227ec` em `https://motorede-web.vercel.app/api/presenca`.

- Conta Expo: `willianvidallima`; projeto `motorede`.
- Android instalado: versão **0.3.1**, versionCode **2**, canal **preview**.
- Última OTA Android publicada com sucesso: grupo
  `b960d870-09c8-4fb6-bc00-f769c958605c`, runtime `0.3.1`, commit `3a227ec`.
- Essa alteração não exige APK novo. APK 0.3.1 disponível localmente em
  `C:\Users\willi\Downloads\MotoRede-0.3.1.apk`.
- Mudanças nativas exigem novo APK; JS/TS compatível pode seguir por OTA.

## Pedido mais recente: viagem completa

O usuário percebeu que a navegação só levava até o início do passeio. Agora,
nas rotas sem restrição, o botão principal monta **posição atual → início
como parada → final como destino** no Google Maps. A origem é resolvida pelo
Maps; o endereço particular informado na conversa não foi gravado no código.
Links somente até o início continuam disponíveis, inclusive no Waze.

O link não garante passar por cada estrada do catálogo; o Maps escolhe o
trajeto e alguns clientes podem ignorar paradas. Validar no aparelho.

**Pendente:** cálculo de distância, tempo e gastos da viagem inteira dentro
do MotoRede. O cálculo atual cobre somente o trecho cadastrado. Maps URLs não
retorna esses dados; será necessária integração de roteamento rodoviário.
Foi perguntado ao usuário se também deseja essas estimativas internas; não
houve resposta. Não assumir aprovação de provedor, cobrança ou novas chaves.

### Caminho do Mar

A própria rota consultada tem acesso restrito a veículos particulares no
trecho de serra. A ficha mostra o aviso, fonte oficial e somente aproximação
ao início cadastrado. Não oferece travessia completa ou gastos como passeio
de moto. Um desvio até Cubatão não representa o passeio histórico.
Fonte: <https://caminhosdomar.com.br/sua-visita>.

## Arquivos para continuar

- `packages/shared/src/domain/rotas.ts`: filtros, custos e links externos.
- `packages/shared/src/data/revisoesRotas.ts`: correções após importar o catálogo.
- `packages/shared/src/data/catalogoRotas.ts`: snapshot de rotas.
- `scripts/importar-rotas.mts` (`npm run rotas:importar`): valida e acrescenta
  rotas novas; base JSON e regras em `docs/rotas.md`.
- `apps/mobile/src/screens/RoutesScreen.tsx` e
  `apps/web/src/views/RoutesView.tsx`: catálogo e detalhes.
- `apps/*/src/hooks/useRotasSalvas.ts`: favoritos locais.
- `tests/rotas/rotas.test.mts`: testes relacionados.
- `docs/rotas.md` e decisões 26–28 de `docs/ideias.md`: detalhes e limites.

## Verificação e pendências

No commit `3a227ec`, passaram: build do shared, 15 testes de rotas, lint,
build web, testes de socorro e plugins, e exportação/publicação OTA Android.
A reimportação do catálogo foi conferida e preserva as correções locais.
Ainda falta validar a viagem completa no Google Maps em aparelho real.

Rotas novas: pesquisa fora do app → `npm run rotas:importar` → commit/push
(Vercel) → OTA do app. Passo a passo em `docs/rotas.md` ("Publicar rotas
novas"). Pendente para avaliar e implementar: catálogo servido pela API, sem
nova publicação a cada lote (ideia 34 de `docs/ideias.md`).

Firebase é usado somente como transporte FCM para Expo Push Android.
`google-services.json` público está configurado e a credencial privada está
no EAS, nunca no repositório. O usuário conseguiu abrir/entrar na rede SOS;
entrega de notificação entre dois aparelhos ainda não foi validada.

`output/` contém imagens locais não versionadas; não incluir em commits.
Recompilar shared após mudanças nele. Executar lint e build web em sequência
para evitar corrida nos arquivos gerados. Não repetir a investigação ou os
testes anteriores sem mudanças que os justifiquem.
