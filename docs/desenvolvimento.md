# Desenvolvimento, testes e deploy

Como rodar web, app e servidor de voz na máquina, quais variáveis de ambiente
existem, como testar e como publicar. Para entender **o que** cada peça faz,
ver [arquitetura.md](arquitetura.md).

## Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Node.js | 22.x | tudo |
| npm | 10.x | workspaces (não use yarn/pnpm: o lock é do npm) |
| PowerShell | 5.1+ | scripts em `scripts/` (o projeto é desenvolvido no Windows) |
| Android Studio / SDK | — | só para compilar o app localmente (`expo run:android`) |
| `eas-cli` | ≥ 12 | builds e OTA do app (`npx eas-cli ...`) |

## Instalação

```bash
npm install
```

Instala os três workspaces (`apps/web`, `apps/mobile`, `packages/shared`) e
roda o `prepare` de `packages/shared`, que compila o pacote para
`packages/shared/dist/`. **Web e app importam o `dist/`**, não o `src/`.
Depois de mudar algo em `packages/shared/src`, recompile:

```bash
npm run build --workspace @motorede/shared
```

## Comandos

Todos a partir da raiz:

| Comando | O que faz |
|---|---|
| `npm run dev:web` | Vite em `http://localhost:3000` (também exposto na rede, `--host 0.0.0.0`) |
| `npm run build:web` | build de produção da web em `apps/web/dist/` |
| `npm run lint` | `tsc --noEmit` em shared, web e mobile — é o "lint" do projeto |
| `npm run test:socorro` | 5 testes da rede de socorro, contra um Redis falso |
| `npm run test:plugins` | testes do protocolo de plugins, contra um Redis falso |
| `npm run livekit` | servidor LiveKit local (Windows, ver abaixo) |
| `npm run start --workspace @motorede/mobile` | Metro para o *development build* do app (aponta para produção) |
| `npm run start:local --workspace @motorede/mobile` | Metro apontando o app para o servidor local |
| `npm run android --workspace @motorede/mobile` | compila e instala o app num Android conectado |

Não há ESLint nem Prettier configurados. Não há `npm test` na raiz: os testes
são os dois scripts `test:*`.

## Web local

```bash
npm run dev:web
```

O que funciona em `vite dev`:

- Toda a interface.
- **`/api/livekit-token`**, servido por um middleware do próprio Vite
  (`apps/web/vite/livekit-token-plugin.ts`). Sem variáveis, ele assina com o
  par de desenvolvimento (`devkey` / `devsecret_local_somente_desenvolvimento`)
  e manda o cliente para `ws://<host>:7880` — ou seja, o LiveKit local. Com
  `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` no ambiente, usa o
  servidor indicado.

O que **não** funciona em `vite dev`: `/api/comboios`, `/api/presenca`,
`/api/socorro` e `/api/plugins`. Eles são funções da Vercel e não existem no
Vite. As telas que dependem deles mostram o erro de rede. Para exercitá-los:

- os testes (`npm run test:socorro`, `npm run test:plugins`) chamam os
  handlers diretamente, sem servidor;
- ou `npx vercel dev` dentro de `apps/web`, com o projeto vinculado à Vercel e
  as variáveis em `apps/web/.env.local`.

**Login:** sem `VITE_GOOGLE_CLIENT_ID`, a web abre direto, sem tela de login.
Com ela, o login do Google é exigido para entrar no app.

**Microfone pelo IP da rede:** navegadores só liberam o microfone em
`https://` ou `localhost`. Para testar a voz no celular pelo
`http://192.168.x.x:3000`, libere a origem em
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` (ver ideia 10 em
[ideias.md](ideias.md)).

## Servidor de voz local (LiveKit)

Opcional: sem ele, aponte web e app para o LiveKit Cloud. Útil para não gastar
a cota gratuita da nuvem.

```powershell
npm run livekit                       # baixa o binário na 1ª vez para tools/ e sobe
.\scripts\firewall-dev.ps1            # uma vez, como Administrador: libera 3000, 8081, 7880-7881, UDP 50000-50100
```

- Sem Docker: é o binário estático do LiveKit (`config/livekit.dev.yaml`).
- Chaves vêm de `LIVEKIT_KEYS`; sem ela, o par de desenvolvimento acima.
- O script fixa `--node-ip` no IP do Wi-Fi. Sem isso o LiveKit pode anunciar
  o IP de uma VPN e o sintoma é "conecta, mas não sai áudio".
- `tools/` é ignorado pelo git.

## App nativo (apps/mobile)

O app usa módulos nativos (LiveKit/WebRTC, serviço em primeiro plano), então
**não roda no Expo Go**. É preciso um *development build* instalado no aparelho.

1. Gerar e instalar o development build (uma vez, ou quando mudar algo nativo):
   ```bash
   cd apps/mobile
   npx eas-cli build --profile development --platform android
   ```
   Alternativa local: `npm run android --workspace @motorede/mobile`
   (gera `apps/mobile/android/` via prebuild; a pasta é ignorada pelo git).
2. Subir o Metro:
   ```bash
   npm run start --workspace @motorede/mobile        # app falando com a produção
   npm run start:local --workspace @motorede/mobile  # app falando com o PC
   ```
   `start:local` fixa `EXPO_PUBLIC_TOKEN_ENDPOINT=http://192.168.1.108:3000/api/livekit-token`.
   Troque o IP para o da sua máquina (também em `DEV_HOST`, `src/config.ts`).

Para onde o app aponta é decidido em `apps/mobile/src/config.ts`:

| Constante | Origem | Padrão |
|---|---|---|
| `WEB_APP_URL` | `EXPO_PUBLIC_WEB_APP_URL` | `https://motorede-web.vercel.app` |
| `TOKEN_ENDPOINT` | `EXPO_PUBLIC_TOKEN_ENDPOINT` | `${WEB_APP_URL}/api/livekit-token` |
| `API_BASE` | derivado de `TOKEN_ENDPOINT` | presença, socorro e plugins vão para o mesmo servidor do token |
| `CONVOYS_ENDPOINT` | derivado de `WEB_APP_URL` | `/api/comboios` |
| `GOOGLE_CLIENT_ID_WEB` / `_ANDROID` | constantes (Client ID é público) | — |

O padrão é **produção de propósito**: app num servidor e web em outro mostram
"Ao vivo" e não se ouvem, sem erro visível.

Leia `apps/mobile/AGENTS.md`: o Expo 57 mudou APIs, e a documentação certa é a
versionada (<https://docs.expo.dev/versions/v57.0.0/>).

## Variáveis de ambiente (web + API)

Em produção, todas ficam na Vercel. Localmente, em `apps/web/.env.local`
(arquivos `.env*` são ignorados pelo git, exceto `.env.example`).

| Variável | Usada por | Obrigatória | Descrição |
|---|---|---|---|
| `LIVEKIT_URL` | token, comboios, plugins | sim | `wss://...livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | token, comboios, plugins | sim | credenciais do projeto LiveKit |
| `GOOGLE_CLIENT_ID` | API | para login | verifica o `id_token` do Google |
| `VITE_GOOGLE_CLIENT_ID` | cliente web (build) | para login | embutida no bundle no build; sem ela, sem tela de login |
| `REQUIRE_AUTH` | token, comboios | não | `"true"` recusa quem não fez login. Hoje desligada |
| `ADMIN_EMAILS` | token | não | e-mails, separados por vírgula, com as vagas extras de admin |
| `PHONE_FINGERPRINT_SECRET` | token, comboios | não | segredo do HMAC do telefone; cai em `LIVEKIT_API_SECRET` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | socorro, plugins | para socorro/plugins | qualquer par `*_REST_API_URL` / `*_REST_API_TOKEN` também serve; `KV_URL` é ignorada |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | socorro (push web) | para push web | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | socorro | não | padrão `mailto:contato@motorede.app` |
| `EXPO_PUSH_URL` | socorro | não | só para testes; padrão é o serviço do Expo |
| `MOTOREDE_PLUGINS` | plugins | para plugins | JSON com o registro dos plugins ([plugins.md](plugins.md)) |

Variáveis do app (`EXPO_PUBLIC_*`) são embutidas no build; as de preview estão
em `apps/mobile/eas.json`.

**Nenhuma chave de Gemini/IA é usada.** O `apps/web/.env.example` deve listar
exatamente as variáveis da tabela acima.

## Testes

```bash
npm run test:socorro
npm run test:plugins
```

- Escritos em TypeScript (`.test.mts`) e executados com `tsx`, sem framework:
  cada arquivo imprime `ok`/`FALHOU` e termina com código ≠ 0 se algo falhar.
- Sobem `tests/socorro/fake-redis.mjs`, um servidor HTTP que imita a API REST
  do Upstash, e chamam os handlers de `apps/web/api` diretamente.
- Não tocam rede externa nem precisam de credenciais.
- Não há testes de interface (web ou app). A verificação de UI é manual.

Antes de commitar: `npm run lint`, `npm run build:web` e os dois `test:*`.

## Deploy

### Web + API (Vercel)

- Projeto Vercel com raiz em `apps/web` (`apps/web/vercel.json`): instala os
  workspaces a partir da raiz, roda `vite build` e publica `dist/`.
- Cada arquivo em `apps/web/api/` vira uma função serverless; arquivos com
  prefixo `_` são módulos internos e não viram endpoint.
- Push no `main` publica. Mudou variável na Vercel? É preciso redeploy para
  ela entrar no ambiente.
- `GET /api/presenca` mostra projeto, ambiente, commit e quais variáveis de
  Redis/VAPID existem (só nomes e tamanhos) — use para diagnosticar deploy.

### App (EAS)

| Perfil (`eas.json`) | Saída | Canal OTA | Uso |
|---|---|---|---|
| `development` | APK com dev client | `development` | desenvolvimento com Metro |
| `preview` | APK | `preview` | o app que os pilotos usam hoje (distribuído por download direto, não pela Play Store) |
| `production` | AAB | — | reservado para loja |

```bash
cd apps/mobile

# Mudança só de JavaScript/TypeScript → atualização pela internet (OTA)
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli update --channel preview --environment preview --message "descrição"

# Mudança nativa (dependência nativa, app.json, plugins/, permissões) → APK novo
npx eas-cli build --profile preview --platform android
```

- `runtimeVersion` segue a versão do app (`appVersion`): ao mudar algo nativo,
  suba `version` em `app.json` **e** em `apps/mobile/package.json`, senão a OTA
  pode chegar num APK incompatível.
- Sem `EAS_SKIP_AUTO_FINGERPRINT=1` o `eas update` chegou a travar por mais de
  10 minutos neste repositório.
- `eas init --force` reescreve o `app.json` e devolve a `permissions` o que
  está em `blockedPermissions`. Confira o arquivo depois.

### Marca e ícones

`scripts/gerar-marca.ps1` gera todos os ícones (app, PWA, favicons) a partir de
`docs/marca/motorede-logo.png`.
