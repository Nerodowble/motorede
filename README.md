# MotoRede

Plataforma para motociclistas. O centro do produto é o **comboio por voz**:
um grupo de até 8 pilotos conversando em tempo real durante a rota, pelo fone
Bluetooth do capacete, com a tela do celular bloqueada. Em volta disso há uma
**rede de socorro** por proximidade, o registro de **manutenção da moto** e
**plugins de áudio** que entram no comboio.

O MotoRede é desenvolvido em **duas frentes ao mesmo tempo**, que compartilham
o mesmo servidor e o mesmo domínio:

| Frente | Pasta | Tecnologia | Onde roda |
|---|---|---|---|
| **App nativo** (Android/iOS) | [`apps/mobile`](apps/mobile) | Expo 57 + React Native 0.86 | Instalado no celular (APK por download direto, atualizações OTA pelo EAS) |
| **Web** (PWA) | [`apps/web`](apps/web) | Vite 6 + React 19 + Tailwind 4 | <https://motorede-web.vercel.app> |
| **API** (serverless) | [`apps/web/api`](apps/web/api) | Funções Node da Vercel | Mesmo deploy da web, em `/api/*` |
| **Domínio compartilhado** | [`packages/shared`](packages/shared) | TypeScript puro | Usado por app, web e API |

App e web falam com a **mesma API** e entram nas **mesmas salas de voz**: um
piloto no app e outro no navegador conversam no mesmo comboio, e um pedido de
socorro feito na web chega a quem está com o app, e vice-versa.

**Para compartilhar com os amigos:** <https://motorede-web.vercel.app/baixar/> (página de divulgação com o APK e o caminho do iPhone; ver [docs/desenvolvimento.md](docs/desenvolvimento.md#página-de-divulgação-baixar)).

> **Não há IA, Gemini, Firebase nem banco de dados neste projeto.** O
> repositório nasceu de um modelo do Google AI Studio e o nome da pasta ainda
> carrega "Firebase", mas nada disso é usado. Nenhuma chave de Gemini é
> necessária.

## Funcionalidades

| Módulo | App | Web | Servidor |
|---|---|---|---|
| Comboio por voz (LiveKit) | ✅ inclusive com a tela bloqueada | ✅ com a tela ligada; com a tela bloqueada, o iPhone mantém a conversa e o Android fecha o microfone (por isso o app Android) | `/api/livekit-token`, `/api/comboios` |
| Lista de comboios ativos e busca de piloto por telefone | ✅ | ✅ | `/api/comboios` |
| Rede de socorro (push por raio, endereço exato só para quem for aceito) | ✅ push pelo Expo | ✅ Web Push (VAPID) | `/api/presenca`, `/api/socorro` + Redis |
| Plugins de áudio no comboio (pareados por código) | ✅ | ✅ | `/api/plugins` + Redis |
| Minha moto (ficha + manutenção derivada do histórico) | ✅ local (AsyncStorage) | ✅ local (localStorage) | — |
| Login com Google | ✅ (ou perfil local) | ✅ | verificação do `id_token` no servidor |
| Diagnóstico de beira de estrada, painel de oficina/cupons, painel admin | — | protótipo local, sem servidor | — |

## Começo rápido

Pré-requisitos: **Node.js 22** e npm 10. Para o app nativo, também Android
Studio/SDK (ou um aparelho com o *development build* instalado).

```bash
npm install                # instala todos os workspaces e compila packages/shared
npm run dev:web            # web em http://localhost:3000
npm run lint               # typecheck de shared, web e mobile
npm run test:socorro       # testes da rede de socorro
npm run test:plugins       # testes dos plugins
```

O app nativo, o servidor de voz local, as variáveis de ambiente e o deploy
estão em **[docs/desenvolvimento.md](docs/desenvolvimento.md)**.

## Documentação

| Documento | Conteúdo |
|---|---|
| [AGENTS.md](AGENTS.md) | Guia para agentes de código (Codex, Claude): mapa do repo, comandos, convenções e armadilhas |
| [docs/arquitetura.md](docs/arquitetura.md) | Como as peças se encaixam: clientes, API, LiveKit, Redis, push, fluxos principais |
| [docs/api.md](docs/api.md) | Referência de todos os endpoints `/api/*` |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | Ambiente local (web e app), variáveis de ambiente, testes, deploy e OTA |
| [docs/plugins.md](docs/plugins.md) | Protocolo público dos plugins de áudio |
| [docs/contas-e-servicos.md](docs/contas-e-servicos.md) | Para o dono: cada serviço externo, se tem conta, limite gratuito e o que acontece ao estourar |
| [docs/ideias.md](docs/ideias.md) | Caderno de decisões: o que foi decidido, adiado ou descartado, e por quê |
| [docs/checklist-marca-e-interface.md](docs/checklist-marca-e-interface.md) | Paleta da marca e andamento do redesenho de web e app |

## Infraestrutura

| Serviço | Uso |
|---|---|
| GitHub | `Nerodowble/motorede` |
| Vercel | web + API (`motorede-web.vercel.app`) |
| LiveKit Cloud | servidor de voz (SFU) em produção |
| Upstash Redis (pela Vercel) | estado temporário de socorro e plugins — tudo com prazo de validade |
| ntfy.sh (sem conta) | acorda os plugins quando alguém os chama |
| Expo / EAS | builds do app e atualizações OTA (projeto `motorede`) |
| Google Cloud | credenciais OAuth do login |
