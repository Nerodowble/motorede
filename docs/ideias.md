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

**Status:** `em aberto` — implementar quando o passaporte for para o backend
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
