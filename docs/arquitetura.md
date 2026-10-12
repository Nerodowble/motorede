# Arquitetura

Visão de como o MotoRede funciona por dentro. Para rodar e publicar, ver
[desenvolvimento.md](desenvolvimento.md); para os contratos HTTP, ver
[api.md](api.md); para o histórico das decisões, ver [ideias.md](ideias.md).

## Visão geral

```
 ┌──────────────────────┐        ┌──────────────────────┐
 │  App nativo          │        │  Web (PWA)           │
 │  apps/mobile         │        │  apps/web/src        │
 │  Expo + React Native │        │  Vite + React        │
 └───┬──────────┬───────┘        └────┬──────────┬──────┘
     │ HTTPS    │ WebRTC              │ HTTPS    │ WebRTC
     │          │                     │          │
     ▼          │                     ▼          │
 ┌──────────────┴─────────────────────────────┐  │
 │  API serverless — apps/web/api (Vercel)    │  │
 │  livekit-token · comboios · presenca ·     │  │
 │  socorro · plugins                         │  │
 └───┬───────────────┬───────────────┬────────┘  │
     │ API servidor  │ REST          │ push      │
     ▼               ▼               ▼           ▼
 ┌─────────┐   ┌───────────┐   ┌──────────────────────┐
 │ LiveKit │◄──┤  Upstash  │   │ Expo Push (app)      │
 │ Cloud   │   │  Redis    │   │ Web Push/VAPID (web) │
 │ (SFU)   │   │ (com TTL) │   └──────────────────────┘
 └────▲────┘   └───────────┘
      │ WebRTC (só publica áudio)
 ┌────┴──────────────────┐
 │ Plugin de áudio       │  projeto de terceiros, fora deste repo
 └───────────────────────┘
```

Pontos que definem o desenho:

- **Não há banco de dados.** O LiveKit já sabe quais salas existem e quem está
  em cada uma; o Redis guarda só estado temporário (socorro, plugins), sempre
  com prazo de validade. Perfil, moto e manutenção ficam no aparelho.
- **Local-first.** O aparelho é a fonte da verdade dos dados do piloto. Só a
  voz e o socorro precisam de rede.
- **O código do comboio é a sala.** Não existe cadastro de comboio: entrar com
  um código cria a sala se ela não existir.
- **O servidor garante as regras**, nunca o cliente: lotação, identidade,
  permissões de plugin e arredondamento da posição no socorro são aplicados
  na API.

## Monorepo

npm workspaces (`apps/*`, `packages/*`):

```
apps/
  mobile/          app nativo (Expo 57, React Native 0.86, React 19)
    App.tsx        raiz: perfil → abas (Comboio · SOS · Moto · Ajustes)
    src/screens/   uma tela por aba + configuração de perfil
    src/hooks/     voz, áudio dos plugins, socorro, login Google, comboios
    src/services/  storage (AsyncStorage), socorro (push/GPS), foreground service
    src/components/ UI (ui/), comboio/, socorro/, cartões de plugin
    src/config.ts  endereços da API e Client IDs do Google
    plugins/       config plugin do Expo (serviço em primeiro plano no Android)
    app.json, eas.json
  web/
    src/           cliente web (PWA)
      App.tsx      raiz: login → abas (Início · Comboio · SOS · Moto · Mais)
      views/       uma tela por aba
      hooks/       voz, plugins, socorro, login Google, tema, PWA
      services/    storage (localStorage), audioEngine, geolocalização, socorroRede
    api/           funções serverless da Vercel (cada arquivo = endpoint;
                   prefixo _ = módulo interno)
    vite/          plugin do Vite que emite token do LiveKit em desenvolvimento
    public/        ícones, push-sw.js (push no service worker)
packages/
  shared/          domínio puro em TypeScript, sem rede/DOM/storage
    src/domain/    convoy, rooms, voice, plugins, sos, maintenance, profile, diagnostics
    src/types.ts   tipos do protótipo original (Motorcycle, UserProfile, ...)
tests/             testes dos endpoints (tsx + Redis falso)
scripts/           PowerShell: LiveKit local, firewall, geração de ícones
config/            livekit.dev.yaml
docs/              esta documentação
```

`@motorede/shared` é compilado para `dist/` (ESM + `.d.ts`) e importado pelos
três consumidores: app, web e API. No app, o `metro.config.js` observa a raiz
do monorepo para enxergar o pacote.

## Web e app: duas frentes ativas

As duas frentes estão em desenvolvimento e cobrem as mesmas funcionalidades
principais, com papéis diferentes:

| | App nativo | Web |
|---|---|---|
| Momento de uso | na moto: tela bloqueada, luva, fone Bluetooth | em casa ou para experimentar sem instalar |
| Voz com tela bloqueada | **sim** — serviço em primeiro plano (Android) / `UIBackgroundModes` (iOS) | **iPhone: sim** (confirmado em uso real); **Android: só ouvir** — o navegador fecha o microfone, por isso o app Android |
| Push de socorro | Expo Push (`ExponentPushToken[...]`) | Web Push com VAPID (inscrição JSON) |
| Dados locais | AsyncStorage | localStorage |
| Login | Google (`expo-auth-session`, `id_token`) ou perfil local | Google Identity Services, obrigatório quando `VITE_GOOGLE_CLIENT_ID` está definida |
| Distribuição | APK por download direto + OTA (EAS) | <https://motorede-web.vercel.app> (instalável como PWA) |
| Módulos só da web | — | diagnóstico, painel de oficina/cupons, painel admin (protótipos locais) |

Regras de produto que valem para as duas:

- **O comboio é a funcionalidade principal**; nada pode bloquear a voz (por
  exemplo, não ter moto cadastrada não impede entrar no comboio).
- App e web devem continuar **interoperáveis**: mesma API, mesmas salas, mesma
  rede de socorro, mesmo protocolo de plugin. Uma mudança de contrato precisa
  ser feita nos dois clientes.
- Código duplicado entre os clientes (hooks de voz, plugins, socorro) é
  intencional: as APIs de plataforma diferem. Regra de negócio vai para
  `packages/shared`.

## Comboio por voz

**Tecnologia:** LiveKit (SFU WebRTC). Produção no LiveKit Cloud; em
desenvolvimento, opcionalmente o binário local (`npm run livekit`).

**Entrar num comboio:**

1. O cliente gera ou recebe um código (`generateRoomCode`, alfabeto sem
   caracteres ambíguos, pensado para ser dito em voz alta; ex.: `SERRA-88`).
   Convite pela web: `https://motorede-web.vercel.app/?sala=CODIGO`.
2. Pede um token em `POST /api/livekit-token` com `{ room, identity, name,
   idToken?, phone? }`.
3. O servidor:
   - verifica o `idToken` do Google (se enviado); com login, a identidade é
     `g-<sub do Google>` e o cliente não escolhe;
   - recusa identidades que começam com `plugin-` (prefixo reservado);
   - consulta os participantes da sala e aplica a **lotação**:
     8 pilotos (`CONVOY_CAPACITY`) + 2 vagas de administrador
     (`CONVOY_ADMIN_SLOTS`, para e-mails em `ADMIN_EMAILS`); plugins não
     ocupam vaga;
   - grava nos metadados o HMAC do telefone (`ph`) — nunca o número — e a
     marca de admin (`adm`);
   - devolve `{ token, url }`, com validade de 1 h.
4. O cliente conecta no LiveKit com `VOICE_CAPTURE_DEFAULTS` /
   `VOICE_PUBLISH_DEFAULTS` (`packages/shared/src/domain/voice.ts`).

**Navegador de comboios e busca por telefone:** `POST /api/comboios` lista as
salas ativas pela API de servidor do LiveKit e, se receber um telefone, compara
o HMAC dele com o `ph` de cada participante.

**Segundo plano no Android** (o requisito central do app):

- `@supersami/rn-foreground-service` + o config plugin
  `apps/mobile/plugins/withVoiceForegroundService.js`, que declara o serviço
  com `foregroundServiceType="microphone|mediaPlayback"`.
- O serviço precisa ser iniciado **antes** de conectar, com o app visível
  (`src/services/foregroundService.ts`).
- `audioType: "communication"` no plugin do LiveKit (roteamento para o fone
  Bluetooth).
- Permissões de câmera/armazenamento/sobreposição são removidas via
  `blockedPermissions` no `app.json`.

**Modos de áudio do app** (`ModoAudio`, em Ajustes): `conversa` (modo ligação,
**padrão** — único em que o microfone de fone Bluetooth clássico abre),
`conversa-midia` e `musica` (estas duas em teste). Os usuários usam fones
Bluetooth baratos de capacete, não intercomunicadores.

**Web em segundo plano:** `services/audioEngine.ts` mantém a reprodução viva
com áudio silencioso + MediaSession, mas isso não sustenta a captura do
microfone. A interface avisa o piloto disso.

## Rede de socorro

Push para quem está perto, sem guardar o pedido além do necessário e sem
expor o endereço exato a desconhecidos. Regras de domínio em
`packages/shared/src/domain/sos.ts`; servidor em `apps/web/api/_sos.ts`.

**Push no Android:** o app obtém um Expo Push Token e a API envia pelo Expo
Push, que entrega via Firebase Cloud Messaging (FCM). O Firebase é usado só
para esse transporte, sem banco, autenticação ou Analytics. O build inclui
`apps/mobile/google-services.json` pelo `android.googleServicesFile`; a chave
privada FCM V1 da conta de serviço é cadastrada no EAS, nunca no repositório.
O Web Push com VAPID continua independente do Firebase.

**Presença:** enquanto o app/página está aberto e a pessoa está na rede, o
cliente chama `POST /api/presenca` com `{ deviceId, pushToken, position }`.
O servidor arredonda a posição para uma **célula de ~1 km**
(`coarsenLocation`) e grava:

| Chave Redis | Conteúdo | Validade |
|---|---|---|
| `mr:geo` | conjunto GEO: célula de cada `deviceId` | — (limpo durante as buscas) |
| `mr:tok:<deviceId>` | endereço de push (Expo token ou inscrição Web Push em JSON) | 45 min |

**Pedido:** `POST /api/socorro` `{ acao: 'pedir', ... }`:

1. Exige texto de referência (≥ 6 caracteres) e posição do GPS — sem GPS, recusa
   em vez de alertar o lugar errado.
2. Busca vizinhos no raio (1–50 km, padrão 15) no `mr:geo`.
3. Guarda o pedido (`mr:ped:<id>`, `mr:pedidos`, `mr:req:<id>`) por 2 h,
   **antes** do push, para quem abrir o app depois ainda encontrar.
4. Envia push com a **célula**, nunca o ponto. App via Expo, navegador via
   Web Push — o formato do token decide o canal (`ehInscricaoWeb`).
5. Responde com números reais: `encontrados`, `avisados`, `falhas`.

**Resposta e aceite:**

- Quem quer ajudar: `acao: 'responder'` → oferta guardada em `mr:of:<pedido>`
  e push para quem pediu.
- Quem pediu vê as ofertas (`GET /api/socorro?ofertas=<id>&deviceId=<dono>`) e
  aceita uma: `acao: 'aceitar'` com o ponto exato e o telefone. O servidor
  confere que é o dono do pedido e **repassa** esses dados só para aquela
  pessoa, sem gravar.
- `acao: 'encerrar'` apaga tudo do pedido.

**O que nunca vai para o servidor de forma persistente:** endereço exato,
telefone, conversa, histórico.

**Ainda não ligado:** `sos.ts` modela círculos de confiança com abertura
escalonada (`conhecido` → `comboio` → `comunidade`, `audienceAt`,
`trustTier`), mas os clientes e a API ainda avisam todos do raio de uma vez.

## Plugins de áudio

Protocolo completo em [plugins.md](plugins.md). Resumo da arquitetura:

- Plugin é um participante extra, de terceiros, rodando fora daqui. Identidade
  `plugin-<id>`, definida só pelo servidor.
- Registro na variável `MOTOREDE_PLUGINS` (JSON); vínculo com o comboio por
  **código de pareamento** (`ABC-1234`) digitado no app.
- O token do plugin sai com `canSubscribe: false` — **ele não ouve o comboio**.
- Comandos dos pilotos vão por mensagem de dados no tópico `motorede.plugin`;
  o estado do plugin volta nos atributos do participante
  (`encodePluginState` / `decodePluginState`).
- Como o plugin roda atrás de roteador doméstico, ele faz *polling*
  (`aguardar` a cada ~5 s) em vez de receber chamadas.
- Estado no Redis com prefixo `mr:plg*` (ver `apps/web/api/_plugins.ts`).
- Nos clientes, plugin é tratado como mais um participante: volume e mudo são
  locais a cada pessoa; não há abaixamento automático.

O plugin de música do mantenedor é um projeto separado
(`motorede-plugin-musica`) e **não** faz parte deste repositório.

## Minha moto e manutenção

Totalmente local, nos dois clientes. Domínio em
`packages/shared/src/domain/maintenance.ts`:

- O piloto registra **eventos** (troca de óleo aos X km, com produto e data),
  não estado.
- `summarizeMaintenance` deriva o status de cada categoria; o intervalo diz de
  onde veio: **medido** (3+ registros), **declarado** pelo piloto ou
  **padrão**. Categoria sem registro não vira número inventado.
- A moto é opcional (`Motorcycle | null`).

## Identidade e login

- **Perfil local** (`source: 'local'`): nome escolhido no aparelho; serve para
  ser reconhecido no comboio, **não** é autenticação.
- **Google** (`source: 'google'`): o cliente obtém um `id_token` e o envia à
  API, que o verifica com `GOOGLE_CLIENT_ID`. Só esse caminho tem valor de
  autenticação. Nenhum Client Secret é usado.
- `REQUIRE_AUTH=true` torna o login obrigatório para voz e lista de comboios.
  Hoje está desligado.
- Admin = e-mail verificado presente em `ADMIN_EMAILS`.

## Interface e marca

- Web: tokens de cor semânticos em `apps/web/src/index.css`, tema claro/escuro
  escolhido pelo usuário (aplicado antes da primeira pintura em `index.html`).
- App: paleta em `apps/mobile/src/theme.ts`, só tema escuro por enquanto.
- Paleta e regras (vermelho cheio = emergência; a marca vermelha nunca é
  fundo de botão) em [checklist-marca-e-interface.md](checklist-marca-e-interface.md).

## Limitações conhecidas

- Web: sair da aba Comboio derruba a chamada (a conexão vive dentro da tela).
- `/api/*` (exceto o token) não roda no `vite dev`.
- Diagnóstico, cupons/oficinas e painel admin da web são protótipos com dados
  em localStorage, sem servidor.
- Alguns arquivos passam de 500 linhas (`apps/web/src/services/storage.ts`,
  `AuthModal.tsx`, `SOSRescueView.tsx`, `ConvoyVoiceView.tsx`).
- `apps/web/scripts/generate-icons.js` é legado; os ícones atuais saem de
  `scripts/gerar-marca.ps1`.
