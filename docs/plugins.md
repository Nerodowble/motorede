# Plugins de áudio do MotoRede

Um plugin é um programa **de terceiros** que entra no comboio como um
participante a mais e publica uma faixa de áudio — música, avisos de rota, uma
rádio licenciada. Ele roda na infraestrutura de quem o escreveu. Se cair, some
só a faixa dele; o comboio continua.

## Responsabilidade pelo conteúdo

> **O MotoRede não hospeda, não escolhe, não armazena e não inspeciona o que um
> plugin transmite.** Cada plugin é um projeto independente, operado por quem o
> registrou, que responde integralmente pelo conteúdo que publica.
>
> **Não recomendamos — e não apoiamos — plugins que transmitam conteúdo sem
> autorização dos titulares de direitos**, como música baixada de plataformas
> cujos termos proíbem download ou retransmissão. Quem cria ou opera um plugin
> deve garantir que tem direito de transmitir o que transmite, conforme a lei
> de direitos autorais e os termos de uso das fontes.
>
> Fontes com licença que permite redistribuição incluem a Biblioteca de Áudio
> do YouTube, Free Music Archive, Jamendo e Pixabay Music (confira a licença de
> cada faixa, que costuma exigir atribuição).

## O que um plugin pode e não pode

| Pode | Não pode |
|---|---|
| Publicar áudio na sala para a qual foi chamado | **Ouvir o comboio** — o token sai sem permissão de assinar faixas |
| Publicar seu estado em atributos do participante | Entrar sem ser chamado por alguém da sala |
| Receber comandos dos pilotos por mensagem de dados | Ocupar vaga de piloto — plugins não contam na lotação |
| | Se passar por piloto — a identidade `plugin-<id>` é definida pelo servidor |

Quem garante essas regras é o servidor, ao emitir o token — não o código do
plugin.

Nos aparelhos, a faixa de qualquer plugin **abaixa sozinha quando alguém fala**
(`PLUGIN_DUCK_VOLUME`), e cada pessoa pode silenciá-la só para si.

## Registro

Um plugin só existe depois que quem opera o servidor o registra, **uma vez**,
na variável de ambiente `MOTOREDE_PLUGINS` da Vercel:

```json
[
  {
    "id": "musica",
    "nome": "Música do Fulano",
    "chave": "<segredo com pelo menos 24 caracteres>"
  }
]
```

- `id`: minúsculas, números e hífen (2–32).
- `chave`: o plugin se autentica com ela. Gere com
  `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.
- `salas`: opcional. Comboios em que o plugin aparece sempre, sem código.

## Em qual comboio o plugin aparece: pareamento por código

Registrado, o plugin **não aparece em comboio nenhum** até ser pareado:

1. O plugin mostra um código de pareamento (`ABC-1234`) para quem o opera.
2. Alguém, dentro de um comboio no app, toca em **Conectar com código** e o
   digita.
3. O comboio fica pareado por 12 h, e **todo mundo nele** passa a ver o plugin.

Trocar de comboio é digitar o código de novo — nada muda na Vercel.

- O código só vale enquanto o plugin está ligado: ele o anuncia a cada
  `aguardar`, e o MotoRede o esquece 90 s depois que o plugin para.
- Quem opera pode gerar um código novo a qualquer momento; o antigo morre na
  hora, e comboios já pareados continuam.
- Cada comboio tem 8 tentativas erradas a cada 10 minutos.

## Protocolo

Tudo passa por `POST /api/plugins`, com `{ "acao": ... }` no corpo.

### Lado do app (autenticado pelo token do LiveKit da sessão)

| Ação | Corpo | Resposta |
|---|---|---|
| `listar` | `{ token }` | `{ plugins: [{ id, nome, identidade, online }] }` |
| `parear` | `{ token, codigo }` | `{ plugin }` — `404` código errado ou plugin desligado, `429` tentativas demais |
| `desparear` | `{ token, plugin }` | `200` |
| `convidar` | `{ token, plugin }` | `202` — convite na fila por 60 s |

### Lado do plugin (autenticado pela chave)

| Ação | Corpo | Resposta |
|---|---|---|
| `aguardar` | `{ plugin, chave, codigo? }` | `{ convites: [{ sala, por, em }] }` — e anuncia o código de pareamento |
| `entrar` | `{ plugin, chave, sala }` | `{ token, url }` — só com convite, um por entrada |

O plugin roda atrás de roteador doméstico, então é ele quem pergunta
(`aguardar`) a cada ~5 s. Perguntar também o marca como **ligado** por 20 s,
que é o que o app mostra antes de chamar.

### Na sala

- **Comandos** chegam por mensagem de dados, tópico `motorede.plugin`, como
  `{ plugin, comando }` (ver `PluginCommand` em
  `packages/shared/src/domain/plugins.ts`). Valide sempre com
  `parsePluginCommand` — qualquer pessoa da sala pode mandar.
- **Estado** vai nos atributos do participante, no formato de
  `encodePluginState`: `estado`, `faixa`, `playlist`, `indice`, `embaralhar`,
  `playlists`, `faixas`, `ultimo`, `chamadoPor`.
- **Dispensar** (`sair`): aceite só de quem chamou (`chamadoPor`) ou do líder
  (quem está há mais tempo na sala).
- Saia sozinho quando não houver mais nenhum piloto na sala: plugin conta
  minutos no plano do LiveKit como qualquer participante.

## Custos

Cada plugin na sala consome minutos de participante no LiveKit, como um
piloto. Música também não se beneficia do DTX (ela não para de tocar), então
cada ouvinte baixa ~64 kbps a mais enquanto ela toca.
