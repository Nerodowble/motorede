# Checklist — marca nova e interface (web e app)

Origem: análise de UX mobile e análise técnica de cores (2026-09-27), depois
da chegada da logo oficial (`docs/marca/motorede-logo.png`).

**Legenda:** `[ ]` a fazer · `[x]` feito · `[~]` em andamento

---

## Paleta decidida

| Papel | Escuro | Claro | Uso — e só isso |
|---|---|---|---|
| canvas (fundo) | `#0A0A0B` | `#F6F6F7` | fundo da página |
| surface (cartão) | `#141417` | `#FFFFFF` | cartões |
| elevated | `#1F1F23` | `#EDEDEF` | botão secundário, campo |
| line / line-strong | `#26262B` / `#3A3A41` | `#E4E4E7` / `#D4D4D8` | bordas (input ≥ 3:1) |
| ink / muted / faint | `#F4F4F5` / `#A1A1AA` / `#8B8B94` | `#18181B` / `#52525B` / `#6B6B75` | textos |
| **action** (botão principal) | fundo `#F4F4F5`, texto `#0A0A0B` | fundo `#18181B`, texto `#FFFFFF` | Entrar, Salvar |
| **brand** (marca) | `#FC0D0A` | `#E30B0B` | logo, aba ativa, foco — **nunca botão** |
| brand-text | `#FF4A3D` | `#D70A0A` | texto de marca ("REDE") |
| **speaking** | `#FBBF24` | `#B45309` | só "alguém falando" |
| **live** | `#22C55E` | `#15803D` | só microfone aberto / ao vivo |
| **sos** | `#DC2626` | `#B91C1C` | só botão SOS / chamado ativo |
| danger-text | `#F87171` | `#B91C1C` | erro e ação destrutiva, em texto |

Regra de ouro: **vermelho cheio e grande = emergência.** A marca vermelha entra
como traço, nunca como fundo de botão.

---

## App (`apps/mobile`) — com o especialista em app

- [x] Paleta nova em `src/theme.ts` (nomes alinhados à web) e fim das 11 cores soltas
- [x] Barra de abas com ícone, rótulo 13px, contraste AA; "Socorro" → "SOS"
- [x] Cabeçalho com selo + MOTO**REDE**; "Sair" vai para Ajustes
- [x] Tela do comboio conectada: estado → microfone grande → participantes → plugin → "Sair" com confirmação; sem "servidor: …"
- [x] Ícones de verdade no card/folha do plugin; "Desvincular" em danger-text
- [x] Moto, SOS, Ajustes e Perfil com a paleta e hierarquia de cartões
- [x] Cor da notificação: `app.json`, `foregroundService.ts:81`, `socorro.ts:96`
- [x] Revisar o que o especialista entregou, publicar (OTA) e **build do APK** com o ícone novo
- [ ] Tema claro no app (`useColorScheme`, duas paletas) — depois

## Web (`apps/web`)

### Etapa 1 — base, sem mudança visual
- [x] Tokens semânticos em `src/index.css`: `action`, `speaking`, `live`, `sos`, `danger`, `success`, `warning`, `info` (cada um com `-soft` / `on-`), nos dois temas; `brand` mantido como alias durante a transição
- [x] `line-strong` com contraste ≥ 3:1 para bordas de campo (feito junto com a Etapa 3: #6b6b74 no escuro, #8e8e96 no claro) — adiado para a Etapa 3: o token é usado em 105 bordas, clarear agora muda o visual inteiro
- [x] Trocar as ~231 classes de cor escritas direto (red/emerald/sky/blue) pelos tokens — 14 arquivos, maiores: `SOSRescueView`, `ConvoyVoiceView`, `AdminView`, `Navigation` — **feito: 206 trocas em 14 arquivos; tema escuro idêntico (conferido por print), tema claro passou a ler**
- [x] Tirar o sentido de estado de `brand` (~35 pontos) — **feito:** 28 botões principais → `action`; conectando/mudo/offline/lotado/atenção/manutenção/pendente → `warning`; avatar de quem fala → `speaking`; código do comboio → `code`. Barrinha da aba ativa e ícones de identidade seguem `brand`: conectando, falando, mudo, avisos, "lotado", código do comboio, papel "Piloto"

### Etapa 2 — correções de celular
- [x] Cabeçalho em até 3 alvos de 44px (logo · SOS · conta); tema, engrenagem e sair vão para "Mais"; tirar selo "PWA" e SOS duplicado — `components/Header.tsx`
- [x] `min-w-0` no bloco esquerdo do cabeçalho (transborda em ≤ 383px e esconde "Entrar")
- [x] Breakpoint `xs:` inexistente em `Header.tsx:136`
- [x] `min-w-0` nas grades do `AuthModal.tsx:495,540` (proteção para Safari)
- [x] Botão do Google respeitar o tema claro — `hooks/useGoogleAuth.ts:129`
- [x] `theme-color` unificado: `index.html:11`, `useTheme.ts:51`, `vite.config.ts:25-26`

### Etapa 3 — trocar para a marca
- [x] Valores novos dos tokens (tabela acima): fundo grafite, botão principal preto/branco, brand vermelho
- [x] Waze/Google Maps legíveis no tema claro — `views/ConvoyVoiceView.tsx`

### Etapa 4 — painel e navegação no celular
- [x] Painel inicial: "Entrar no comboio" conecta direto (1 toque), mostra estado e quem está no comboio; Convidar / Trocar comboio no próprio cartão; tirar botão "Ficha" — `views/DashboardView.tsx`, `App.tsx`
- [x] Navegação: Início · Comboio · **SOS** (centro) · **Moto** (era "Oficina") · Mais; rótulos 12px — `components/Navigation.tsx`
- [x] "Mais" sem duplicata ("Passaporte & Ficha") e sem o Simulador de Tela Bloqueada (só em modo desenvolvimento)
- [x] Conferir o destino "Serra do Mar" (era dado de exemplo semeado em storage.ts; removido, vira estado vazio) que aparece sem ninguém escolher — `views/ConvoyVoiceView.tsx`

### Etapa 5 — acabamento
- [ ] Fonte condensada itálica (parecida com a da logo) só no código do comboio e no nome da marca
- [ ] Script de contraste que falha abaixo de AA + capturas em 360/420px nos dois temas

---

## Achados que ficaram para depois

- [ ] **Web: sair da aba Comboio derruba a chamada** — a conexão de voz mora dentro da tela do comboio e desmonta com ela. Já era assim antes. Resolver = subir a conexão para o App.
- [ ] Cartão do painel mostra só a contagem de pilotos; nomes pedem API nova.
- [ ] `DEFAULT_VOICE_ROOM` (storage.ts) ainda tem participantes fictícios usados no simulador.
- [ ] `ConvoyVoiceView.tsx` (637 linhas) e `AuthModal.tsx` (675) acima de 500.

## Estimativa (análise técnica)

Web: ~4–5 dias no total; as etapas 1–2 vão para produção sem mudança visual.
App: tema claro soma ~1,5–2 dias depois do redesenho.
