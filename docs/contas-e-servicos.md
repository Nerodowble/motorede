# Contas e serviços do MotoRede

Para o dono do projeto: todo serviço externo que o MotoRede usa, se exige
conta, em qual conta está, quanto o plano gratuito aguenta e o que acontece
quando estoura.

**Regra do projeto: tudo no plano gratuito.** Serviço novo só entra se tiver
plano gratuito que aguente o uso real, e entra nesta lista no mesmo dia.

> Este arquivo está num repositório **público**. Aqui vão só nomes de contas e
> limites, nunca senha, chave ou token. Os segredos ficam nas variáveis da
> Vercel e no `.env` do plugin.

## Com conta

| Serviço | Para quê | Conta | Plano | Se estourar / cair |
|---|---|---|---|---|
| **GitHub** | código (`Nerodowble/motorede`, público) e o projeto do plugin (privado) | Nerodowble (pessoal) | Free | — |
| **Vercel** | site + API (`motorede-web.vercel.app`) e as variáveis secretas | Nerodowble | Hobby (gratuito, uso não comercial) | site e API fora do ar até o mês virar |
| **Upstash Redis** | estado temporário: socorro, presença, plugins, cache da ficha da moto | criado **pela integração da Vercel** (entra pelo painel da Vercel → Storage) | Free: **500 mil comandos/mês** | SOS, plugins e ficha da moto param até o ciclo renovar. Foi o que aconteceu em out/2026 (ver abaixo) |
| **LiveKit Cloud** | a voz do comboio | projeto `motorede-ac8bq1q0` | Build (gratuito) — limite de minutos de participante/mês, confira no painel | comboio por voz para de conectar |
| **Expo / EAS** | builds do app Android e atualizações OTA (projeto `motorede`) | ⚠️ **willianvidallima (conta corporativa)**, diferente do resto | Free — número de builds/mês limitado, confira no painel | build novo só no mês seguinte; o app instalado continua funcionando |
| **Google Cloud** | credencial OAuth do "Entrar com Google" | — | gratuito | login para de funcionar |
| **Supabase** | projeto `motorede` criado, **ainda não usado** | — | Free — **pausa após 7 dias sem uso** | nada hoje |

## Sem conta (só usa)

| Serviço | Para quê | Limite / risco |
|---|---|---|
| **ntfy.sh** | acorda os plugins de casa quando alguém os chama | servidor público gratuito, com limite de mensagens por endereço. Se um dia recusar, dá para rodar um ntfy próprio e apontar `MOTOREDE_ACORDAR_URL` na Vercel para ele |
| **Gemini (gemini.google.com)** | o plugin de IA abre a página num navegador invisível, sem login | o Google pode mudar a página, pedir login ou CAPTCHA; aí a ficha mostra "falhou" |
| **Web Push (VAPID)** | notificação do SOS no navegador | as chaves VAPID são geradas por nós (`npx web-push generate-vapid-keys`); não há conta |
| **Push do Expo** | notificação do SOS no app | vem junto com o projeto do Expo |
| **OpenStreetMap** | mapas | uso justo; sem chave |

## Nos computadores de casa

| O quê | Onde |
|---|---|
| Plugin de música e plugin de IA | projeto `motorede-plugin-musica` (privado). Chaves no `.env` em `Documentos\MotoRede Plugin` e em `MOTOREDE_PLUGINS` na Vercel |

## O que gasta o Redis (e por que estourou em out/2026)

O Upstash cobra **cada comando**, inclusive os que vão juntos numa chamada só.

- **Antes:** os dois plugins perguntavam ao MotoRede a cada 5 s, ligados o dia
  todo. Eram ~190 mil comandos por dia, e a cota do mês acabava em 3 dias.
- **Agora:** o plugin fica parado numa conexão do ntfy.sh e só fala com o
  MotoRede quando é chamado, mais uma conferência a cada 10 min. Parado, os
  dois juntos gastam ~40 mil comandos por mês, e o resto da cota fica para o
  uso real.

Para ver o consumo: painel da Vercel → Storage → o banco Upstash → Usage.

## Quando um limite estourar

1. Descubra qual serviço foi, pela mensagem de erro ou pelo painel dele.
2. **Não troque de plano pago sem decidir antes**: o projeto é gratuito por
   regra. Primeiro procure quem está gastando à toa (foi o caso do Redis).
3. Se precisar esperar o ciclo renovar, anote em `docs/ideias.md` o que ficou
   fora do ar e por quanto tempo.
