# Caderno de Ideias — MotoRede

Documento vivo. Toda ideia que aparece durante o desenvolvimento entra aqui, mesmo
as descartadas — saber *por que* algo foi descartado vale tanto quanto a ideia boa.

**Status possíveis:** `em aberto` · `decidido` · `adiado` · `descartado`

---

## 1. Sala de voz que entende o comboio

**Status:** `decidido` — é o diferencial central do produto
**Data:** 2026-09-18

Voz em grupo é commodity. O que ninguém faz é uma sala de voz que **sabe que é uma
moto e um comboio**: qual o destino, a distância de cada piloto até o líder, quem
ficou para trás, quem parou no posto, quem caiu.

O protótipo já antecipava isso em `packages/shared/src/types.ts`:

```typescript
VoiceRoom        → destinationName, destinationLat, destinationLng
VoiceParticipant → distanceToHostKm, deviceType
```

**Por que importa:** é a diferença entre "mais um app de voz" e uma ferramenta
dedicada. E é exatamente o que um app genérico nunca vai construir.

---

## 2. Passaporte alimentando o cálculo de desgaste

**Status:** `decidido` — implementado em 2026-09-19, ver [ideia 18](#18-manutenção-como-etiqueta-de-troca-de-óleo)
**Data:** 2026-09-18

Hoje `calculateConsumablesStatus` usa datas fixas de seed
(`currentKm - 850` para o óleo, etc.), então o desgaste mostrado é sempre o mesmo
número fictício.

**A ideia:** quando o piloto lança no passaporte "troquei óleo aos 24.100 km", o
`lastChangedKm` daquele consumível passa a vir do registro real, e o desgaste se
recalcula sozinho.

**Por que importa:** conecta de verdade dois módulos que hoje só convivem. E o
cálculo continua 100% local — custo zero de servidor.

---

## 3. Otimização de tráfego de áudio

**Status:** `decidido` — aplicar, mas sabendo em que fase cada coisa rende
**Data:** 2026-09-18

| Técnica | Efeito |
|---|---|
| DTX (transmissão descontínua) | Não envia pacote quando ninguém fala |
| Opus a 20–24 kbps | Voz não precisa de mais; o padrão é 32–64 |
| Só locutor ativo | O SFU repassa quem fala, não todos os streams |

Comboio de 8 pilotos, 1 hora de saída no servidor:
- Ingênuo: **~900 MB/h**
- Otimizado: **~75 MB/h** (12x menos)

**Pegadinha importante:** o LiveKit Cloud grátis cobra por **minuto de participante,
não por banda**. Então nada disso aumenta o teto de 5.000 minutos. Na fase gratuita,
essas otimizações valem pela **bateria e franquia de dados do usuário**, não pelo
custo do projeto. Elas viram economia de verdade só no servidor próprio.

---

## 4. Servidor local (na casa do dev)

**Status:** `decidido` para desenvolvimento · `descartado` para produção
**Data:** 2026-09-18

**Para desenvolver:** ótimo — e sem Docker, via binário estático (ver ideia 9). Desenvolver contra
um servidor local não consome a cota da nuvem. Feito.

**Para produção:** o obstáculo é **CGNAT** — a maioria das operadoras residenciais
brasileiras não entrega IP público, então não existe porta para abrir; ninguém
conecta de fora para dentro. Some a isso: queda de luz derruba o app, IP residencial
exposto, zero SLA.

*Como verificar o CGNAT:* comparar o IP em `meuip.com.br` com o IP de WAN no painel
do roteador. Diferentes = CGNAT.

---

## 5. Usuários como servidores (P2P)

**Status:** `adiado` — reavaliar com dados de uso real
**Data:** 2026-09-18

Três formatos avaliados:

**Malha completa.** Zero servidor. Ótimo para 2–3 pilotos. Para 8, cada celular
mantém 7 conexões cifradas e codifica 7 vezes — frita a bateria de um aparelho no
bolso de uma jaqueta preta no sol.

**Celular do líder como SFU.** Mais esperto, pior na prática: destrói a bateria e a
franquia do líder, e quando ele entra num túnel o comboio inteiro cai. Ninguém vai
querer ser líder.

**O assassino dos dois: NAT.** Duas pessoas em 4G, ainda mais em operadoras
diferentes, geralmente **não** conseguem conexão direta — rede móvel usa NAT
simétrico, que quebra a furação de NAT padrão. O fallback é TURN, um retransmissor
burro que sai **mais caro** que um SFU.

**A nuance que salva parcialmente: IPv6.** Vivo, Claro e TIM já entregam IPv6 em boa
parte da rede móvel, e sobre IPv6 não há NAT. A taxa de sucesso de P2P hoje é melhor
que o retrato IPv4 sugere — mas depende de operadora, plano, região e aparelho, então
não dá para *contar* com isso sem manter um TURN de reserva.

**Quando reavaliar:** com uso real, medir quantos comboios são de 2–3 pessoas.
Se for a maioria (provável: dois amigos rodando juntos), aí vale um caminho direto
para o caso de 2, com SFU de reserva. Decidir com dados, não no escuro.

---

## 6. Moto clube hospedando a própria instância

**Status:** `adiado` — ideia de fase 3, mas potencialmente comercial
**Data:** 2026-09-18

Versão boa da ideia "usuário vira servidor": não é o piloto individual, é o **clube**.
Um moto clube com 300 membros roda a própria instância, com canal e dados próprios.

**Por que é interessante:** resolve custo de infraestrutura e vira **produto vendável**
ao mesmo tempo (licença da versão auto-hospedada). Clubes já têm identidade própria e
tendem a querer o próprio espaço.

---

## 7. Migração LiveKit Cloud → servidor próprio

**Status:** `decidido` — caminho planejado, sem retrabalho
**Data:** 2026-09-18

O LiveKit é open source: o mesmo software da nuvem roda no servidor próprio.
**Migrar é trocar uma URL**, não reescrever.

- **Fase amigos:** LiveKit Cloud grátis — 5.000 min de participante/mês (teto rígido,
  não cobra: para de funcionar). Comboio de 8 em rota de 2h = 960 min → ~5 rotas/mês.
- **Fase real:** Oracle Cloud Always Free. Atenção: cortado em jun/2026 de 4 OCPU/24 GB
  para **2 OCPU/12 GB**. Ainda sobra — SFU de áudio não transcodifica, só reencaminha
  pacotes. Com 10 TB/mês de saída e 75 MB/h por comboio, são mais de 130 mil horas/mês.

---

## 8. Arquitetura local-first

**Status:** `decidido`
**Data:** 2026-09-18

O celular é a fonte da verdade; o servidor é só sincronização.

**Roda 100% no aparelho (custo R$ 0):** cálculo de desgaste, árvore de diagnóstico,
distância e proximidade, codificação de áudio.

**Trafega, mas é irrisório:** sync de perfil/moto/manutenções (alguns KB/dia),
posição no comboio (~50 bytes por piloto a cada 10s).

**O único custo real:** áudio pelo SFU. Voz em grupo obrigatoriamente passa por um
ponto de encontro. É ~99% do custo do projeto; todo o resto é ruído estatístico.

**Bônus que vale ouro:** funciona sem sinal. Numa serra sem 4G o piloto ainda abre o
diagnóstico, consulta o passaporte e vê o desgaste. Só a voz precisa de rede.

**Preço a pagar:** conflito quando o mesmo usuário edita no celular e na web. Como
cada piloto só mexe nos próprios dados, "última escrita vence" por campo resolve.
Não usar CRDT aqui — canhão para matar mosquito.

---

## 9. Sem Docker — binário estático

**Status:** `decidido` — vale para desenvolvimento **e** produção
**Data:** 2026-09-18

Docker foi descartado por peso: no Windows ele roda uma VM Linux inteira e consome
uns 2 GB de RAM parado, inviável tanto na máquina de desenvolvimento quanto na de
produção pretendida.

**Não é necessário.** O LiveKit é escrito em Go e distribuído como **binário único e
estático** — sem runtime, sem container, sem dependência. Ocioso fica em ~30–50 MB.

Há binário oficial para todas as plataformas que o projeto precisa:

| Plataforma | Uso |
|---|---|
| `windows_amd64` | desenvolvimento local |
| `linux_arm64` | produção na Oracle (Ampere) |

Montado em `scripts/livekit-dev.ps1` (baixa na primeira execução, depois só inicia)
e `config/livekit.dev.yaml`. Sobe com `npm run livekit`. O binário fica em `tools/`,
fora do versionamento.

Em produção a mesma abordagem: baixar o binário `linux_arm64` e rodar sob systemd.
Nada de Docker em lugar nenhum.

**Armadilha encontrada na prática:** o LiveKit anuncia aos clientes o IP por onde a
mídia deve chegar, e sozinho ele escolheu a interface do **Twingate (VPN)** em vez do
Wi-Fi. O celular nunca alcançaria esse endereço, e o sintoma seria "conecta mas não
tem áudio" — dor de cabeça clássica de WebRTC. Resolvido fixando `--node-ip` no IP da
rede local, detectado pelo script.

---

## 10. Contexto seguro e o microfone em desenvolvimento

**Status:** `decidido` — contorno para desenvolvimento; deixa de existir em produção
**Data:** 2026-09-18

Navegadores só expõem `navigator.mediaDevices` (microfone e câmera) em **contexto
seguro**: `https://` ou `localhost`. Num IP de rede via `http://`, o objeto
simplesmente não existe, e o erro nativo — *"Cannot read properties of undefined
(reading 'getUserMedia')"* — não diz nada sobre a causa.

| Endereço | Microfone |
|---|---|
| `http://localhost:3000` | funciona (localhost é exceção da regra) |
| `http://192.168.1.108:3000` | falha: `mediaDevices` indefinido |

**Contorno em desenvolvimento:** liberar a origem em
`chrome://flags/#unsafely-treat-insecure-origin-as-secure`. Mantém tudo em `http`/`ws`,
sem precisar de TLS no Vite nem no LiveKit.

**Por que não resolver com HTTPS agora:** exigiria certificado no Vite **e** no
LiveKit (`wss://`, porque página `https` não abre `ws://` — bloqueio de conteúdo
misto), mais confiar a autoridade certificadora no celular. Muito trabalho para um
problema que desaparece sozinho: em produção o app é nativo (não tem essa regra) e a
web fica atrás de HTTPS de verdade.

O hook `useVoiceConnection` agora detecta a situação e explica o que fazer, em vez de
deixar o erro críptico vazar.

---

## 11. Confirmado na prática: web não sustenta voz em segundo plano

**Status:** `decidido` — verificado com teste real, não é mais suposição
**Data:** 2026-09-18

Primeiro teste de voz real (PC ↔ navegador do celular, pelo LiveKit local):
**a voz funcionou.** Ao bloquear a tela do celular, o áudio parou imediatamente.

**Causa:** com a tela bloqueada o navegador suspende a página, e a captura do
microfone para junto. O truque de áudio silencioso + MediaSession que já existe em
`audioEngine.ts` mantém a **reprodução** viva em segundo plano — não mantém a
**captura**. Não existe contorno no navegador.

**O que isso fecha:**
- A arquitetura de rede está validada: servidor, token, firewall, codec e a conexão
  entre dois aparelhos funcionam.
- A hipótese que justificava o app nativo está confirmada por medição.

Ver [ideia 8](#8-arquitetura-local-first) e a decisão de direção do produto: o app é
nativo, a web fica como painel sem voz.

---

## 12. O que o Android exige para voz em segundo plano

**Status:** `decidido` — configurado; aguardando confirmação no aparelho
**Data:** 2026-09-18

Levantado ao montar o app nativo. Não basta pedir `RECORD_AUDIO`: desde o
Android 14 a captura em segundo plano exige um **serviço em primeiro plano** do
tipo `microphone`, iniciado enquanto o app ainda está visível.

São **duas** permissões de serviço, e faltar uma quebra metade do produto:

| Permissão | Sem ela |
|---|---|
| `FOREGROUND_SERVICE_MICROPHONE` | você não consegue falar |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | você não consegue ouvir os outros |

**CORRIGIDO (2026-09-18):** eu havia registrado aqui que o SDK do LiveKit
implementava o serviço internamente desde a 2.4. **Isso está errado.** A busca no
código mostra que o único serviço nesses pacotes é o `MediaProjectionService`, do
`react-native-webrtc`, que serve para **captura de tela** — não de microfone.

O erro apareceu no primeiro teste no aparelho: ao bloquear a tela, o LiveKit
derrubou a conexão com `ConnectionError / reasonName: WebSocket`. O Android havia
suspendido o processo, o JavaScript parou de executar e o WebSocket de sinalização
morreu junto.

**A solução:** `@supersami/rn-foreground-service` (o mesmo que o app de exemplo do
LiveKit usa) mais um plugin de configuração próprio em
`apps/mobile/plugins/withVoiceForegroundService.js`. O pacote tenta editar o
AndroidManifest por um script de postinstall, o que não funciona com Expo — o
manifesto é regenerado a cada prebuild e a edição se perde. O plugin declara os
dois serviços com `android:foregroundServiceType="microphone|mediaPlayback"`.

**Detalhe de ordem que importa:** o serviço tem de ser iniciado **antes** de
conectar, enquanto o app ainda está visível. O Android recusa iniciar um serviço em
primeiro plano quando a tela já está apagada.

**`audioType: "communication"`** no plugin do LiveKit: faz o sistema tratar como
chamada de voz em vez de música. Muda o cancelamento de eco e, principalmente, o
roteamento para o fone bluetooth do capacete — que é o cenário de uso real.

**Permissões demais atrapalham:** o plugin do WebRTC adiciona câmera, sobreposição
de tela e acesso a armazenamento por padrão. Um app só de voz não usa nada disso, e
permissão sem justificativa vira questionamento na revisão da Play Store. Removidas
via `blockedPermissions`.

**Armadilha:** `eas init --force` reescreve o `app.json` a partir da configuração já
resolvida, reinserindo em `permissions` justamente o que estava em
`blockedPermissions`. Conferir o arquivo depois de rodar.

No iOS o equivalente é `UIBackgroundModes: ["audio", "voip"]`, já configurado.

---

## 13. Tese central confirmada: voz sobrevive à tela bloqueada

**Status:** `decidido` — validado em aparelho real
**Data:** 2026-09-18

Testado no app nativo com o servidor LiveKit local: entrou no canal, bloqueou a
tela do celular, **o áudio continuou**. É o mesmo cenário em que o navegador
falhava ([ideia 11](#11-confirmado-na-prática-web-não-sustenta-voz-em-segundo-plano)).

Com isso fecha a cadeia inteira de hipóteses do projeto:

| Hipótese | Resultado |
|---|---|
| Voz em grupo funciona pelo nosso servidor | ✅ medido |
| Navegador não sustenta com a tela bloqueada | ✅ medido |
| App nativo sustenta | ✅ medido |

**O que faltou para chegar aqui**, na ordem em que apareceu:
1. `FOREGROUND_SERVICE_MICROPHONE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
2. Serviço em primeiro plano de verdade (nenhum pacote do LiveKit fornece)
3. Declaração do serviço via plugin de configuração, não pelo `postinstall`
4. Serviço iniciado **antes** de conectar, com o app ainda visível
5. `ServiceType: 'microphone'` na chamada — obrigatório no Android 14 e ausente
   do `index.d.ts` do pacote, então o TypeScript não acusou

Daqui para frente o trabalho é conhecido: não há mais incógnita de plataforma na
funcionalidade principal.

---

## 14. Contexto seguro impede terceiros de testarem pela web

**Status:** `em aberto` — resolve com o deploy da fase amigos
**Data:** 2026-09-18

Ao tentar testar num segundo aparelho, esbarramos de novo na
[ideia 10](#10-contexto-seguro-e-o-microfone-em-desenvolvimento): pelo IP da rede
em `http`, o microfone não existe. O contorno via `chrome://flags` serve para a
máquina do desenvolvedor, **não para convidar outra pessoa** — ninguém vai mexer
em flags do navegador para testar um app.

**Desbloqueio:** HTTPS real. E como página `https` não abre `ws://`, o LiveKit
também precisa de TLS. Isso é exatamente a fase amigos já planejada:

| Peça | Onde | Por quê |
|---|---|---|
| SFU | LiveKit Cloud (grátis) | já vem com `wss` e TURN |
| App web + endpoint de token | Vercel (grátis) | dá `https` e domínio público |

Alternativa para teste em moto de verdade: build **preview** (não `development`)
embute o JavaScript e roda sem Metro — os amigos instalam o app nativo, que é o
produto real. Mas também depende do endpoint de token ser público.

---

## 15. Ressalva à ideia 11: a web aguentou em produção

**Status:** `em aberto` — medição isolada, não generalizável
**Data:** 2026-09-18

Testando o app web já em produção (`https://motorede-web.vercel.app`, LiveKit
Cloud), a voz **continuou funcionando com a tela do celular bloqueada** — o que
contradiz a [ideia 11](#11-confirmado-na-prática-web-não-sustenta-voz-em-segundo-plano),
medida no mesmo aparelho contra o servidor local.

**O que mudou entre os dois testes, e não foi isolado:**
- `http://` num IP de rede, com exceção no `chrome://flags` → `https://` de verdade
- servidor LiveKit local → LiveKit Cloud
- duração e direção do áudio testadas não foram controladas de forma idêntica

A hipótese mais provável é a origem HTTPS legítima: o navegador trata uma origem
segura de forma diferente na gestão de ciclo de vida da página, e o app é
instalável como PWA.

**Por que isso NÃO muda a decisão do app nativo:**

Funcionar num aparelho não é funcionar. Esse comportamento varia com fabricante,
versão de Android e perfil de bateria — Xiaomi e Samsung são notoriamente
agressivas em encerrar processos em segundo plano —, e o iOS é bem mais restritivo
que o Android neste ponto. Num app usado em moto, "funciona na maioria dos
celulares" não serve: o piloto descobre a falha na estrada, de luva, a 90 km/h.

**O que isso muda, de positivo:** a web é melhor do que assumíamos para o público
que só quer experimentar. Vale como porta de entrada, não como produto.

**Para fechar a questão** seria preciso testar em aparelhos de fabricantes
diferentes, com tempo controlado (5+ minutos) e verificando as duas direções do
áudio separadamente — falar e ouvir se comportam de formas distintas.

### RESOLVIDO (2026-09-19)

O teste separando as direções foi feito, e o resultado confirma a
[ideia 11](#11-confirmado-na-prática-web-não-sustenta-voz-em-segundo-plano):

| Com a tela bloqueada, na web | Resultado |
|---|---|
| **Ouvir** os outros pilotos | funciona |
| **Falar** | não funciona — o microfone fecha |

Ao desbloquear, volta a transmitir. É exatamente o comportamento previsto: o
truque de áudio silencioso com MediaSession sustenta a **reprodução**, nunca a
**captura**.

A medição anterior, que parecia contradizer, media só a direção que funciona.
A lição de método: ao testar áudio bidirecional, as duas direções precisam ser
verificadas separadamente — um "funcionou" sem dizer qual direção não significa
nada.

Isso reforça, e não enfraquece, a decisão pelo app nativo: é lá que o serviço em
primeiro plano mantém a captura viva ([ideia 12](#12-o-que-o-android-exige-para-voz-em-segundo-plano)).

### Complemento: varia por aparelho (2026-09-19)

Testes em dois aparelhos, mesma web em produção, tela bloqueada:

| Aparelho | Ouvir | Falar |
|---|---|---|
| iPhone 15 | funciona | **funciona** |
| Samsung A07 | funciona | não funciona |

Contraintuitivo: o iOS costuma ser mais restritivo que o Android, não menos. O
Samsung pode estar aplicando gerenciamento agressivo de bateria, que é conhecido
na marca — então nem isso é seguro atribuir ao "Android" em geral.

**Um aparelho de cada não sustenta uma regra por sistema operacional.** O aviso
na interface ficou universal em celular, de propósito: um aviso ocasionalmente
desnecessário custa menos que um piloto descobrindo na estrada que ninguém o
ouve.

**E é exatamente por isso que o app nativo continua sendo o produto.** "Funciona
em alguns celulares" não é uma promessa que dá para fazer a quem vai usar isso
a 90 km/h.

---

## 16. Comboio de 8 e trânsito do admin

**Status:** `decidido` — próxima funcionalidade depois da limpeza de tela
**Data:** 2026-09-19

Limite de **8 pilotos por comboio**, mais **2 vagas fantasma** reservadas a
administradores.

**Por que 8:** cada participante a mais multiplica o tráfego, e 8 é onde a
qualidade ainda se sustenta em 4G de estrada. Mas o motivo social pesa igual —
conversa por voz com mais de 8 pessoas deixa de funcionar; ninguém fala.

**As vagas fantasma:** num evento com 300 pessoas divididas em dezenas de
comboios, o administrador precisa circular para passar recados. Sem a reserva,
ele não conseguiria entrar num grupo já cheio. Com ela, entra sem estourar o
limite real.

Regras: o admin fica em **um comboio por vez** (sai de um para entrar em outro),
e pode favoritar comboios — inclusive o próprio — para voltar rápido.

**Não precisa de banco:** a API de servidor do LiveKit lista as salas ativas com
a contagem de participantes. O navegador de comboios sai disso, e o limite é
verificado no endpoint de token antes de assinar. Favoritos ficam locais.

**Dependência:** identificar admin exige **login obrigatório**. Enquanto
`REQUIRE_AUTH` estiver desligado, qualquer um se declararia admin e furaria o
limite. Ou seja, esta funcionalidade força concluir o login no app nativo.

---

## 17. Módulo de Eventos

**Status:** `em aberto` — desenho aprovado, depende de banco
**Data:** 2026-09-19

Ambiente separado, em configurações, onde um organizador monta um evento antes
da rota acontecer:

- Dados do evento, destino e informações gerais
- Tamanho dos comboios
- **Link de convite** para os participantes confirmarem presença
- Com as confirmações, o sistema calcula **quantos comboios criar**
- O organizador designa até **5 sub-administradores** para ajudar nos grupos

**Por que importa:** resolve o que o código de comboio sozinho não resolve. Hoje
a divisão em grupos de 8 aconteceria no improviso, no estacionamento. Com o
evento montado antes, as pessoas chegam já sabendo em qual comboio entram.

**Aqui o banco passa a ser necessário** — e é a primeira vez no projeto que isso
acontece de verdade. Evento, confirmações e lista de sub-admins precisam
persistir e ser vistos por várias pessoas. Autenticação não precisou
([ideia 15](#15-ressalva-à-ideia-11-a-web-aguentou-em-produção) e o login com
Google resolveram sem), mas eventos precisam.

**Também justifica o cadastro de telefone:** associar um contato à conta faz
sentido no contexto de evento e de socorro — não como dado solto no perfil.

---

## 18. Manutenção como etiqueta de troca de óleo

**Status:** `decidido` — implementado
**Data:** 2026-09-19

Inversão do modelo: **em vez de pedir estado, derivar de eventos.**

O modelo mental é o adesivo que a oficina cola no vidro. Registra-se o que foi
feito, com qual produto, em que quilometragem. Nada mais. É um hábito que já
existe — e por isso tem chance de ser mantido.

**Por que o modelo anterior nunca funcionaria:** pedia que o piloto mantivesse
intervalos e datas de seis consumíveis sempre atualizados. Ninguém faz isso. A
prova está no próprio protótipo: ele precisou preencher tudo com valores
fictícios, porque não havia de onde tirar valores reais.

**O que cada registro passa a permitir:**

| Registros | O que dá para afirmar |
|---|---|
| 1 | lembrete: o que trocou, quando, com qual produto |
| 2 | primeiro intervalo observado |
| 3+ | intervalo REAL do piloto e ritmo em km/mês |

**Toda previsão diz de onde veio**, porque a diferença importa para o piloto
confiar no app:

- **medido** — "você troca a cada ~4.000 km (3 registros)"
- **declarado** — "você definiu 5.000 km"
- **padrão** — "recomendação típica: 5.000 km"

Com 3+ registros o medido vence o declarado: o hábito real vale mais que a
intenção.

**Categoria sem registro não vira número inventado.** Sem barra, sem
porcentagem, sem alerta — vira convite para registrar. Previsão de data só
aparece quando há ritmo medido; sem saber quanto o piloto roda por mês, prever
data seria chute.

O `ConsumableStatus` e o `calculateConsumablesStatus` foram removidos. Eram uma
estrutura paralela e fictícia convivendo com o passaporte, que já modelava
eventos de verdade — duas verdades sobre a mesma moto.

---

## 19. Moto opcional: fim da CB 500X de presente

**Status:** `decidido` — implementado
**Data:** 2026-09-19

`getMotorcycle()` **gravava** a moto de exemplo no navegador na primeira
leitura. Quem entrava pela primeira vez ganhava uma Honda CB 500X com placa
`BRA-5X92` e 24.850 km, como se fosse dele. Não existia o estado "ainda não
tenho moto", e por isso o app afirmava desgaste de um veículo inexistente.

Agora a moto é `Motorcycle | null`, e o princípio que orienta a interface é:
**falta de moto não bloqueia a voz.**

| Tela | Sem moto |
|---|---|
| Painel | comboio funciona normal; a moto vira convite, abaixo dele |
| Manutenção | a aba inteira vira o convite |
| Passaporte | idem |
| Comboio | não muda nada |

**Migração para quem já usou:** apagar o exemplo do código não limpa o que já
está no navegador. A limpeza só remove se a moto estiver **exatamente** como
veio de fábrica — se o piloto editou qualquer campo, passou a ser dado dele e
fica.

**Efeito colateral bom:** ligamos `strictNullChecks` no app web. Eram só 5
erros, e é exatamente o tipo de verificação que pega esta classe de bug antes de
chegar no usuário. Sem ele, o typecheck passava limpo com `motorcycle` podendo
ser nulo em dez lugares que fariam o app quebrar em execução.
