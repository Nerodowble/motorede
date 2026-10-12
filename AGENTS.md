# AGENTS.md — guia para agentes de código

Instruções para Codex, Claude e outros agentes que trabalham neste
repositório. Leia antes de mudar qualquer coisa. Visão de produto no
[README.md](README.md); detalhes em [docs/](docs).

Para retomar o trabalho recente, leia primeiro [docs/retomada.md](docs/retomada.md).

## O que é o projeto

MotoRede: comboio por voz para motociclistas (LiveKit), rede de socorro por
proximidade, manutenção da moto e plugins de áudio. **Duas frentes em
desenvolvimento ativo, ao mesmo tempo:**

- `apps/mobile` — app nativo **Expo 57 / React Native 0.86** (Android
  primeiro; iOS configurado).
- `apps/web` — **PWA Vite 6 + React 19 + Tailwind 4**, mais a **API
  serverless** em `apps/web/api` (Vercel), usada pelos dois clientes.
- `packages/shared` — domínio puro em TypeScript, usado por app, web e API.

Os dois clientes são interoperáveis (mesmas salas, mesma API, mesma rede de
socorro). **Mudou um contrato da API? Atualize os dois clientes.**

## O que NÃO existe aqui (contexto legado)

- **Nada de Gemini, Google AI Studio, `GEMINI_API_KEY` ou qualquer IA.** O
  repositório nasceu de um modelo do AI Studio; isso foi removido. Se encontrar
  um resto, apague.
- **Firebase só como transporte FCM para o push do Android**, via Expo Push.
  Nenhum outro serviço do Firebase é usado. `google-services.json` contém a
  configuração pública do app; a chave privada da conta de serviço fica no EAS,
  nunca no git. O nome da pasta local (`Projetos_Firebase/...`) é só o lugar
  onde o mantenedor guarda projetos.
- **Nada de Supabase em uso** (há um projeto criado, reservado para quando
  houver banco). **Não há banco de dados**: estado temporário vai no Redis
  (Upstash) com TTL; dados do piloto ficam no aparelho.
- Nada de Docker: o LiveKit local é um binário estático.

## Comandos

Rode da raiz. Node 22, npm 10 (não use yarn/pnpm).

```bash
npm install                                  # também compila packages/shared → dist/
npm run build --workspace @motorede/shared   # após mudar packages/shared/src
npm run lint                                 # tsc --noEmit em shared, web e mobile
npm run build:web                            # build de produção da web
npm run test:socorro                         # testes da API de socorro
npm run test:plugins                         # testes da API de plugins
npm run dev:web                              # web em http://localhost:3000
```

**Verificação obrigatória antes de concluir uma mudança:** `npm run lint`,
`npm run build:web`, `npm run test:socorro` e `npm run test:plugins`. Todos
devem passar. Não há ESLint/Prettier nem `npm test` na raiz.

O app nativo não roda no Expo Go nem em CI sem dispositivo; mudanças em
`apps/mobile` são verificadas com `npm run lint`. Detalhes de execução e
deploy em [docs/desenvolvimento.md](docs/desenvolvimento.md).

## Mapa rápido

| Preciso mexer em… | Onde |
|---|---|
| Regras de negócio (lotação, códigos, socorro, manutenção, plugins) | `packages/shared/src/domain/*.ts` |
| Endpoints HTTP | `apps/web/api/*.ts` (prefixo `_` = interno) — referência em [docs/api.md](docs/api.md) |
| Voz na web | `apps/web/src/hooks/useVoiceConnection.ts`, `views/ConvoyVoiceView.tsx` |
| Voz no app | `apps/mobile/src/hooks/useVoiceConnection.ts`, `screens/ConvoyScreen.tsx`, `services/foregroundService.ts` |
| Socorro | web: `services/socorroRede.ts`, `hooks/useSocorroRede.ts`, `views/SOSRescueView.tsx` · app: `services/socorro.ts`, `hooks/useSocorro.ts`, `screens/SocorroScreen.tsx` |
| Plugins de áudio | `hooks/usePluginAudio.ts` (nos dois), `apps/web/api/plugins.ts`, `_plugins.ts`, [docs/plugins.md](docs/plugins.md) |
| Moto e manutenção | web: `views/MyMotorcycleView.tsx` · app: `screens/MyMotorcycleScreen.tsx` · domínio: `maintenance.ts` |
| Endereços da API no app | `apps/mobile/src/config.ts` |
| Configuração nativa do app | `apps/mobile/app.json`, `eas.json`, `plugins/withVoiceForegroundService.js` |
| Cores/tema | web: `apps/web/src/index.css` · app: `apps/mobile/src/theme.ts` |

Arquitetura completa: [docs/arquitetura.md](docs/arquitetura.md).

## Convenções

- **Idioma:** interface, comentários, mensagens de erro, commits e docs em
  **português do Brasil**. Muitos identificadores também são em português
  (`acao`, `pedidoId`, `registrarPresenca`); siga o idioma do arquivo que está
  editando.
- **Comentários explicam o porquê**, com frequência contando o bug que motivou
  a decisão. Mantenha esse padrão e não apague essas explicações.
- **TypeScript estrito.** `packages/shared` e o app usam `strict`; a web usa
  `strictNullChecks`.
- **Imports ESM nas funções da API usam extensão `.js`** (`from './_sos.js'`),
  mesmo importando arquivos `.ts`. Sem ela o deploy na Vercel quebra.
- **Handlers da API** usam a assinatura Node `(req, res)`. Não use o formato
  Web/Edge (`Request`/`Response`): na Vercel a requisição fica pendurada.
- **`packages/shared` é puro:** sem rede, DOM, storage ou dependência de
  LiveKit. Tipos de plataforma entram por interface estrutural.
- **Honestidade na interface:** não exibir dado fictício como real (contagens,
  posições, "alerta enviado" sem número). O projeto removeu várias dessas
  ficções; não reintroduza.
- **Segredos:** nunca no código nem no git. Client IDs do Google são públicos e
  podem ficar no código; Client Secret, chaves do LiveKit, VAPID privada e
  chaves de plugin, nunca. Arquivos `.env*` são ignorados (exceto
  `.env.example`).
- Arquivos novos: código em `apps/*/src` ou `packages/shared/src`, testes em
  `tests/`, documentação em `docs/`, scripts em `scripts/`.
- Decisões de produto e arquitetura são registradas em
  [docs/ideias.md](docs/ideias.md) (status, data e motivo).

## Armadilhas conhecidas

- **`packages/shared` é consumido pelo `dist/`.** Mudou o `src/` e não
  recompilou? Web, app e API continuam vendo a versão antiga.
- **Só `/api/livekit-token` existe no `vite dev`** (via plugin do Vite, sem
  login nem lotação). Comboios, presença, socorro e plugins só rodam na Vercel
  (ou `vercel dev`) — e nos testes, que chamam os handlers direto.
- **`VITE_*` é embutida no build.** Se faltar, o Vite escreve `undefined` e o
  código dependente some do bundle sem erro. Por isso a chave VAPID pública é
  servida por `GET /api/presenca`, não por `VITE_*`.
- **Redis:** o código aceita qualquer par `*_REST_API_URL` /
  `*_REST_API_TOKEN`; `KV_URL` (string `redis://`) é ignorada de propósito.
- **App aponta para produção por padrão** (`src/config.ts`). Misturar app em
  um servidor e web em outro faz os dois mostrarem "Ao vivo" sem se ouvirem.
- **Expo 57 mudou APIs:** consulte a documentação versionada
  (<https://docs.expo.dev/versions/v57.0.0/>), não a memória. Ver
  `apps/mobile/AGENTS.md`.
- **Mudança nativa no app** (dependência nativa, `app.json`, `plugins/`)
  exige APK novo; só JS/TS vai por OTA. `runtimeVersion` segue a versão do app.
- **Serviço em primeiro plano** no Android precisa iniciar *antes* de conectar
  a voz, com o app visível, e com `ServiceType: 'microphone'` (ausente da
  tipagem do pacote).
- **Plugins não ouvem o comboio** (`canSubscribe: false`) e são reconhecidos
  pela identidade `plugin-<id>`, nunca por metadado. Não afrouxe essas regras.
- **Socorro nunca expõe o ponto exato** a quem não foi aceito: o servidor
  arredonda para a célula de ~1 km mesmo que o cliente já mande arredondado.
- `apps/web/scripts/generate-icons.js` é legado; ícones vêm de
  `scripts/gerar-marca.ps1`.
- Arquivos vazios com nomes estranhos na raiz ou em `apps/*` (ex.: `tsc`,
  `{const`) são lixo criado por hooks locais do mantenedor; não versione.
