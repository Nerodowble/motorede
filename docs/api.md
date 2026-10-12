# API

Funções serverless em `apps/web/api/`, publicadas pela Vercel junto com a web
em `https://motorede-web.vercel.app/api/*`. Usadas pelo app nativo e pela web.

- Corpo e resposta em JSON. Erros vêm como `{ error, detail? }`.
- Sem autenticação por sessão: quem precisa provar algo manda um `idToken` do
  Google, um token do LiveKit ou a chave do plugin, conforme o endpoint.
- Arquivos com prefixo `_` (`_livekit.ts`, `_redis.ts`, `_sos.ts`,
  `_plugins.ts`) são módulos internos, não endpoints.
- Em `vite dev`, só `/api/livekit-token` existe (versão simplificada, sem
  login nem lotação). Ver [desenvolvimento.md](desenvolvimento.md).

## `POST /api/livekit-token`

Emite o token para entrar num comboio. Arquivo: `api/livekit-token.ts`.

**Corpo**

| Campo | Tipo | Notas |
|---|---|---|
| `room` | string | obrigatório; `/^[A-Z0-9-]{3,32}$/i` |
| `identity` | string | obrigatório **sem** login; `/^[a-zA-Z0-9_-]{3,64}$/`, não pode começar com `plugin-` |
| `name` | string | nome exibido (máx. 64) |
| `idToken` | string | `id_token` do Google; se enviado, identidade e nome vêm dele |
| `phone` | string | só para gerar o HMAC usado na busca; não é guardado |

**Respostas**

| Status | Corpo |
|---|---|
| 200 | `{ token, url, authenticated, isAdmin, maxParticipants }` (token vale 1 h) |
| 400 | sala/identidade inválida ou corpo malformado |
| 401 | `idToken` inválido, ou login exigido (`REQUIRE_AUTH=true`) |
| 409 | `{ error, full: true }` — comboio lotado |
| 500 | LiveKit não configurado ou falha ao assinar |

Regras: lotação de 8 pilotos + 2 vagas de admin; reconexão da mesma
identidade não ocupa vaga nova; falha da API do LiveKit ao checar lotação não
impede a entrada.

## `POST /api/comboios`

Lista comboios ativos e, opcionalmente, procura um piloto pelo telefone.
Arquivo: `api/comboios.ts`.

**Corpo:** `{ idToken?, phone? }`

**200**

```json
{
  "convoys": [{ "code": "SERRA-88", "riders": 3, "total": 3, "isFull": false, "createdAt": "..." }],
  "found": { "code": "SERRA-88", "riders": 3, "total": 3, "isFull": false },
  "searched": true,
  "capacity": 8
}
```

`found` é `null` quando não há busca ou ninguém com aquele telefone. Ordenado
dos mais cheios para os mais vazios; salas só com plugin não aparecem.
Erros: 401 (como acima), 500.

## `/api/presenca`

Entrar e sair da rede de socorro. Arquivo: `api/presenca.ts`.

| Método | Corpo | Resposta |
|---|---|---|
| `GET` | — | `{ rede: 'ligada'|'desligada', vapidPublicKey, variaveis, build }` — diagnóstico: chave pública VAPID, **nomes** das variáveis de Redis/VAPID e qual deploy está respondendo |
| `POST` | `{ deviceId, pushToken, position: { lat, lng } }` | `{ ok, presente: true, expiraEm: 2700 }` |
| `DELETE` | `{ deviceId }` | `{ ok, presente: false }` |

`pushToken` é um `ExponentPushToken[...]` (app) ou a inscrição Web Push
serializada em JSON (navegador). A posição é arredondada para a célula de
~1 km no servidor. 503 quando o Redis não está configurado.

## `/api/socorro`

Pedidos de ajuda. Arquivo: `api/socorro.ts`.

### `GET /api/socorro?lat=&lng=&raioKm=&excluir=`

Pedidos abertos perto de um ponto (raio 1–50 km, padrão 25). `excluir` é o
`deviceId` de quem consulta, para não listar os próprios pedidos.
→ `{ pedidos: [...] }` (cada um com a célula aproximada, nunca o ponto).

### `GET /api/socorro?ofertas=<pedidoId>&deviceId=<dono>`

Ofertas de ajuda de um pedido. Só o dono vê: 403 para outros, 404 se expirou.
→ `{ ofertas: [{ ofertaId, nome, moto?, celula, em }] }`

### `POST /api/socorro`

Todas as ações levam `deviceId`.

| `acao` | Campos | Efeito / resposta |
|---|---|---|
| `pedir` (padrão) | `pedidoId`, `referencia` (≥ 6 caracteres), `position`, `kind` (`emergencia`\|`apoio`), `emergency?`, `nome?`, `moto?`, `detalhes?`, `pushToken?`, `raioKm?` (1–50, padrão 15) | guarda o pedido por 2 h e avisa quem está no raio → `{ ok, pedidoId, encontrados, avisados, falhas }`. 400 com `semGps: true` sem posição |
| `responder` | `pedidoId`, `nome?`, `moto?`, `resposta?`, `position?`, `pushToken?` | registra a oferta e avisa quem pediu → `{ ok, ofertaId, entregue }`. 404 `expirado: true` se o pedido acabou |
| `aceitar` | `pedidoId`, `ofertaId`, `precisa` (ponto exato), `telefone?`, `nome?`, `referencia?` | só o dono; repassa ponto exato e telefone **apenas** a quem ofereceu, sem gravar → `{ ok, entregue }` |
| `encerrar` | `pedidoId` | apaga pedido, ofertas e retorno → `{ ok, encerrado: true }` |

Tipos de push enviados (`data.tipo`): `socorro`, `resposta-socorro`, `aceito`.

## `POST /api/plugins`

Protocolo dos plugins de áudio, com `{ acao, ... }` no corpo. Contrato
completo, regras e exemplos em [plugins.md](plugins.md). Arquivo:
`api/plugins.ts`.

| Lado | Ações | Autenticação |
|---|---|---|
| App/web | `listar`, `parear`, `desparear`, `convidar` | `token` do LiveKit da sessão (prova que a pessoa está na sala) |
| Plugin | `aguardar`, `entrar` | `plugin` + `chave` registrados em `MOTOREDE_PLUGINS` |

## Estado no Redis

Todas as chaves usam o prefixo `mr:` e têm validade, exceto os conjuntos GEO,
que são limpos durante as buscas.

| Chave | Dono | Validade |
|---|---|---|
| `mr:geo`, `mr:tok:<deviceId>` | presença | — / 45 min |
| `mr:pedidos`, `mr:ped:<id>`, `mr:req:<id>`, `mr:of:<id>` | socorro | — / 2 h |
| `mr:plgv:<id>` | plugin ligado | 20 s |
| `mr:plgc:<id>` | convites pendentes | 60 s |
| `mr:plgok:<id>:<sala>` | convite aceito | 120 s |
| `mr:plgcod:<código>`, `mr:plgcodde:<id>` | código de pareamento | 90 s |
| `mr:plgsala:<sala>` | plugins pareados com o comboio | 12 h |
| `mr:plgtent:<sala>` | tentativas erradas de código | 10 min |
