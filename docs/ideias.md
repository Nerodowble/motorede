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

---

## 20. Uma aba só: "Minha moto"

**Status:** `decidido` — implementado
**Data:** 2026-09-19

A reescrita da ideia 18 corrigiu o **domínio**, não a **arquitetura da
interface**. Sobraram três superfícies para a mesma moto: a Ficha (modal de 17
campos), a aba Manutenção e a aba Passaporte.

**A sobreposição era concreta**, não estética:

- **Dois formulários para o mesmo evento**, com campos diferentes: o da
  Manutenção gravava `product` e não custo; o do Passaporte gravava custo e
  **não** `product`
- A mesma lista de registros em dois layouts
- O mesmo botão de ficha com dois nomes ("Ficha" e "Dados da Moto")
- A navegação tinha **três nomes para duas abas**: "Manutenção" no desktop,
  "Oficina" no celular, "Passaporte & Ficha da Moto" na gaveta

**O achado que orientou o redesenho:** o app nunca mostrava os "900 km". A frase
do dono — *"troquei há 900 km, faltam 100"* — tem duas metades, e a interface
entregava só a que projeta o futuro. `kmSinceLast` era calculado e nunca
exibido.

**Três bugs de honestidade, corrigidos junto:**

1. A Ficha pré-preenchia os 4 intervalos com os valores padrão e os gravava ao
   salvar. Quem abriu a ficha uma vez passou a ver *"Você definiu 5.000 km"* sem
   nunca ter definido — corrompendo a distinção medido/declarado/padrão que
   torna o app honesto. Migração limpa os que são idênticos ao padrão.
2. `declaredIntervalKm` era gravado pelo formulário e **nunca lido** por
   ninguém.
3. O Passaporte marcava todo registro digitado pelo próprio piloto como
   "verificado por parceiro", e o Score de Procedência era `75 + algo` — nunca
   saía de "Excelente". Removidos.

**E `ridingStyle` prometia** ajustar a taxa de desgaste no próprio rótulo, mas o
cálculo morreu junto com `calculateConsumablesStatus`. Removido, assim como
`avgKmPerMonth`, substituído por `measureKmPerMonth`, que mede de verdade.

**O formulário caiu para 3 campos:** km (pré-preenchido), data (hoje, mas
editável — a troca é anotada no domingo seguinte) e produto (sugerindo o último
usado). A categoria vem do cartão, então o formulário nunca pergunta *o quê*.

**Salvar sobe o odômetro** quando o km informado é maior. Antes o piloto anotava
25.000 na troca e o painel seguia em 24.850.

Cartões ordenados por urgência: vencido, se aproximando, em dia, sem registro.
A ordem fixa por categoria fazia um item vencido aparecer em sexto lugar.

---

## 21. Tema claro e escuro, escolhidos pelo usuário

**Decidido e implementado.** O app nasceu só escuro, com a cor escrita direto em
cada componente — cerca de 800 classes `bg-slate-900`, `text-slate-400` e afins
em 17 arquivos.

**A cor passou a ser declarada pelo papel, não pelo tom:** fundo de página,
superfície de cartão, linha, texto principal, texto secundário. Cada tema define
os valores num só lugar e a interface não precisa saber qual está ativo. É o que
torna a troca possível em tempo de execução sem espalhar variantes `dark:`.

**Três estados, não dois.** Além de claro e escuro existe *sistema*, que é o
padrão e acompanha o aparelho quando ele alterna sozinho ao anoitecer. Um botão
que apenas alterna não teria como voltar a essa opção depois da primeira
escolha — por isso o seletor tem três posições, não uma chave.

**O tema é aplicado antes da primeira pintura**, por um trecho solto no
`index.html`. Se esperasse o React montar, quem escolhe claro veria o app piscar
escuro a cada carregamento.

### O que só apareceu no tema claro

1. **Texto sobre fundo colorido.** A troca em massa converteu `text-white` em
   `text-ink` também nos botões vermelhos do SOS e no verde do microfone aberto.
   No escuro não deu diferença — o texto principal já é quase branco. No claro o
   botão de socorro virava preto sobre vermelho. Esses fundos são fixos nos dois
   temas, então o texto sobre eles também precisa ser.
2. **O âmbar da marca** (`#f59e0b`) não alcança contraste para texto pequeno
   sobre fundo claro. No tema claro ele escurece para `#b45309`.
3. **O tom mais apagado** dava 3,75:1 no escuro e 2,56:1 no claro contra o
   cartão — justamente no texto de 10-11px, o que mais precisa de contraste.
   Ajustado para passar de 4,5:1 nos dois.
4. **O corpo da página** tinha `bg-slate-950` preso na marcação: qualquer área
   não coberta pela interface ficava preta.
5. **`hover:bg-slate-750` nunca existiu no Tailwind.** Aquele hover não fazia
   nada desde o começo, e só foi notado ao revisar cor por cor.

**A escolha vive fora do React,** num módulo só. O seletor aparece na tela de
entrada e no cabeçalho de dentro do app; com estado separado, trocar num
deixaria o outro mostrando o botão errado.

---

## 22. Socorro: push por raio, sem banco de dados

**Decidido e no ar.** O SOS era inteiramente ficção — zero chamadas de rede,
tudo no `localStorage`, e cinco afirmações falsas na tela (telefone inventado
fixo no código, "localização transmitida com sucesso", "canal criptografado",
mensagem escrita em nome de quem clicava, dois alertas de pessoas que não
existem gravados no aparelho na primeira leitura).

**A pior parte não era a ficção, era um padrão:** `DEFAULT_USER_COORDS` = Av.
Paulista, usada em silêncio sempre que o GPS falhava, era negado, ou ainda não
tinha respondido. Alguém parado numa rodovia de Minas dispararia um alerta
apontando para São Paulo — e a tela ainda diria "GPS Ativo" com números
plausíveis. Ninguém teria como desconfiar.

### O que o servidor guarda

A discussão foi "por que precisa de banco?". A resposta honesta: **não precisa
de banco, precisa da lista de quem chamar.** Push não é transmissão aberta — é
entrega endereçada, e sem os tokens não há para onde enviar. Quem pede socorro
não sabe quem está por perto; só o servidor sabe.

Então ele guarda três coisas, todas com prazo:

```
mr:geo        célula de ~1 km de cada aparelho
mr:tok:<id>   endereço de push             45 min
mr:req:<id>   para onde devolver a resposta   2 h
```

Não há alerta, conversa, histórico, perfil nem moto. **O pedido em si nunca
chega ao servidor** — ele só entrega recados e esquece. Tudo expira sozinho, e
a limpeza do conjunto geográfico acontece durante a própria busca (a ausência
do token é o sinal de que o aparelho sumiu), sem tarefa agendada.

### Quem enxerga o endereço exato

O push leva **a célula, nunca o ponto**. Um pedido de socorro diz "estou
sozinho, parado, sem como sair daqui, e este é meu endereço" — exatamente o que
um assaltante quer. Num raio de 25 km isso não é rede de ajuda, é lista de
alvos.

Medido: erro máximo 0,71 km, e 22% dos pontos de um quadrado de 2 km caem na
mesma célula. A célula identifica uma área, não uma pessoa. O endereço exato vai
depois, do pedinte para quem ele aceitar, um a um.

**Grade fixa, não deslocamento aleatório.** Sortear um desvio a cada pedido
parece mais seguro e é o contrário: a média de vários sorteios converge para a
posição verdadeira. A grade é estável — repetir o pedido não revela nada novo.

**O arredondamento acontece no servidor também**, não só no app. O app já manda
a célula, mas quem garante isso é código rodando no aparelho de outra pessoa,
que pode ser trocado.

### Confiabilidade: o que dá e o que não dá

Não existe forma gratuita de provar que um desconhecido é bem-intencionado. Quem
tenta usa documento, antecedentes e seguro. O que dá é diminuir o que um
mal-intencionado ganha e aumentar o que arrisca: célula em vez de ponto, aviso
primeiro a quem já andou em comboio junto (queda/acidente abre tudo na hora),
quem se oferece aparece de cara limpa, e histórico factual — *"ajudou 2 vezes,
confirmadas por quem pediu"* — nunca nota inventada.

**Socorro e apoio são coisas separadas**, em canais diferentes. Se a maioria dos
alertas vermelhos for "alguém pega esse pacote?", as pessoas param de reagir ao
vermelho, e no dia do acidente ninguém olha.

### Dois bugs que a medição pegou

1. O passo da longitude saía da latitude **bruta** de cada ponto, então cada
   ponto usava uma grade própria e duas pessoas lado a lado caíam em células
   diferentes — a célula voltava a identificar uma pessoa só. Agora o passo sai
   da latitude já encaixada.
2. O código lia só `UPSTASH_REDIS_*` e `KV_*`, mas a integração da Vercel deixa
   o usuário **escolher o prefixo** no formulário. Agora procura qualquer par
   `*_REST_API_URL` / `*_REST_API_TOKEN`. `KV_URL` é ignorada de propósito:
   apesar do nome, é string `redis://` e não serve para a API REST.

**Testado nos dois níveis:** `npm run test:socorro` (21 verificações contra um
Redis de mentira) e fumaça contra o Upstash real em produção — 15 km encontrou
2, 50 km encontrou 3, e depois da limpeza, 0.

---

## 23. Música no comboio ("bot de música")

**Status:** `em aberto` — tecnicamente viável; o gargalo é de onde vem a música
**Data:** 2026-09-26

Ideia: ouvir música junto com os amigos durante a chamada, como os bots do
Discord faziam.

**Tecnicamente cabe no que já existe.** No LiveKit, um "bot" é só mais um
participante da sala publicando uma faixa de áudio. Três jeitos, do mais simples
ao mais trabalhoso:

| Caminho | Como | Custo de construção |
|---|---|---|
| Cada um ouve o próprio app de música (ex.: Jam do Spotify) | O MotoRede só precisa não "roubar" o áudio do outro app | Quase zero |
| LiveKit Ingress a partir de URL | O endpoint cria uma entrada apontando para um MP3/rádio; ela entra na sala como participante | Pequeno, sem servidor próprio |
| Bot próprio (LiveKit Agents) | Processo rodando o tempo todo, com fila, pular, etc. | Alto — precisa de servidor, que a Vercel não dá |

Transmitir a música **de dentro do celular** de um piloto (captura do Spotify)
não funciona: Spotify e YouTube bloqueiam captura de áudio no Android, e o
`react-native-webrtc` não publica arquivo como faixa sem módulo nativo.

**O problema real é a fonte, não a tecnologia.** Os bots de música do Discord
(Groovy, Rythm) foram fechados em 2021 por notificação do Google, porque
retransmitiam YouTube. Spotify também proíbe retransmitir. Fontes limpas:
arquivos próprios, música livre de direitos, ou cada um tocando a sua conta.

**Pontos específicos do comboio:**
- **Abaixar a música quando alguém fala** é obrigatório na moto — recado de
  "buraco à frente" não pode competir com o refrão. Com a música numa faixa
  separada, o cliente baixa o volume dela quando o LiveKit marca alguém falando.
- Música anula o ganho do DTX ([ideia 3](#3-otimização-de-tráfego-de-áudio)):
  toca sem parar, e em qualidade de música (~64–96 kbps), não de voz.
- O bot conta como participante: consome minutos do teto gratuito como mais um
  piloto.
- Precisa de um botão para cada um desligar a música só para si.

**Ressalva ao caminho 1 (mesmo dia):** o Jam do Spotify exige Premium para
iniciar e, à distância, também para entrar — então quem não tem Spotify ou não
paga fica de fora. Isso rebaixa o caminho 1 a "complemento" e faz do caminho 2
(música viajando pela própria sala) o único que atende todo mundo do comboio:
quem ouve não precisa de conta em serviço nenhum.

**Variante descartada (mesmo dia): baixar playlists do YouTube e servir do
próprio computador.** Tecnicamente funciona (baixar o áudio, servir por link,
o Ingress toca na sala, o usuário guarda a playlist no celular). O problema é
jurídico, e o arranjo proposto o agrava em vez de contornar:

- Baixar do YouTube viola os termos dele — foi exatamente isso que derrubou o
  Groovy e o Rythm.
- Deixar o usuário baixar a playlist para o celular é **distribuir cópias**, que
  é pior do que só tocar ao vivo.
- "Não guardar no banco" não muda nada: guardar no computador de casa continua
  sendo guardar, e quem serve é identificável (IP de casa, repositório público
  com o nome do dono).
- O risco cai sobre o projeto inteiro: remoção da loja do Google e notificação
  contra o repositório derrubariam também a voz e o socorro.

Também esbarra na [ideia 4](#4-servidor-local-na-casa-do-dev): computador de
casa ligado o tempo todo, com upload de internet doméstica, já foi descartado
para produção.

**O que se aproveita:** a arquitetura (arquivos servidos por link → Ingress na
sala → cópia opcional no celular) é boa. Só precisa de catálogo com licença:
Biblioteca de Áudio do YouTube, Free Music Archive, Jamendo, Pixabay Music.

---

## 24. Plugins de áudio no comboio

**Status:** `decidido` — implementado em 2026-09-26, protocolo em `docs/plugins.md`
**Data:** 2026-09-26

Nasceu da ideia 23: em vez de o MotoRede tocar música, ele aceita **plugins** —
serviços de terceiros que entram na sala e publicam áudio. É o modelo do
Discord: o Groovy caiu, o Discord não.

**Como encaixa no LiveKit:** plugin é um participante com token próprio,
emitido pelo nosso endpoint, com identidade marcada (`plugin:<nome>`). Roda na
infraestrutura dele; se cair, some só a faixa dele da sala.

**Regras que o desenho exige:**
- **Plugin não ouve o comboio** (`canSubscribe: false`). Sem isso, qualquer
  plugin vira escuta das conversas de todo mundo.
- Só publica áudio, e o cliente trata toda faixa `plugin:*` como música:
  abaixa quando alguém fala, cada um silencia só para si.
- Entra só se alguém do comboio chamar; admin do comboio pode expulsar.
- Conta como participante no teto de minutos do LiveKit.

**Limite da proteção:** a separação protege o MotoRede de plugins **de
terceiros**. Se o mesmo dono escreve e opera um plugin que redistribui música do
YouTube, a separação existe no código mas não na responsabilidade — a
notificação chega na mesma pessoa. O app não vai para o Google Play (é
distribuído por download direto), então a loja não é risco; os serviços que
seguem expostos são LiveKit Cloud, Vercel, GitHub e Expo — este último na conta
corporativa. Por isso o plugin de YouTube continua fora
(ver ideia 23); o sistema de plugins, não.

**Implementado (2026-09-26).** O MotoRede ganhou o sistema de plugins
(`/api/plugins`, card de música no app, abaixar a música quando alguém fala
também na web) e o primeiro plugin nasceu como **projeto separado**
(`motorede-plugin-musica`, fora deste repositório), para uso pessoal no comboio
do dono: roda num computador de casa, toca playlists montadas localmente e
conversa com o MotoRede só pelo protocolo público. Decisões que valem registrar:

- **Convite por pergunta, não por chamada.** O computador de casa está atrás de
  roteador; é o plugin que pergunta a cada 5 s. Perguntar também o marca como
  ligado por 20 s, e o app mostra "computador desligado" antes de alguém
  esperar 30 s à toa.
- **Plugin é reconhecido pela identidade, não pelo metadado.** Para publicar o
  que está tocando ele precisa poder mudar os próprios dados — e com isso
  poderia apagar a marca e se passar por piloto. A identidade só o servidor
  define.
- **Confirmado em teste real:** mensagem de dados chega a um participante sem
  permissão de ouvir. Então o plugin recebe comandos sem ouvir a conversa.
- **Quem manda:** qualquer piloto pausa, pula e troca a música (o líder pode
  estar pilotando); dispensar só quem chamou ou o líder.
- **Biblioteca indiferente à origem:** playlist é uma pasta de áudio. O plugin
  traz um comando para baixar a partir de link, mas qualquer arquivo na pasta
  serve.

**Mudança no mesmo dia: pareamento por código em vez de comboio fixo.** A
primeira versão prendia o plugin a comboios listados na Vercel (`salas`). O
dono apontou que isso é inviável: todo passeio novo exigiria editar variável e
fazer redeploy. Agora o registro na Vercel é feito uma vez, sem comboio
nenhum, e o vínculo acontece no app: o painel do plugin mostra um código
(`ABC-1234`), alguém digita dentro do comboio e todo mundo ali passa a ver a
música. O código só vale com o plugin ligado (ele o anuncia a cada pergunta),
pode ser trocado a qualquer hora pelo painel e tem limite de 8 tentativas
erradas por comboio a cada 10 minutos. `salas` continua existindo, mas opcional.
