import { AccessToken, TokenVerifier } from 'livekit-server-sdk';
import { subir, limpar } from '../socorro/fake-redis.mjs';

/**
 * Plugins: quem pode chamar, quem pode entrar, e o que o token do plugin
 * permite. O ponto que mais importa é o último — plugin que ouve o comboio
 * seria uma escuta.
 */

const PORTA = 7381;
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${PORTA}`;
process.env.UPSTASH_REDIS_REST_TOKEN = 'faz-de-conta';
process.env.LIVEKIT_API_KEY = 'chave-de-teste';
process.env.LIVEKIT_API_SECRET = 'segredo-de-teste-com-tamanho-suficiente-para-hs256';
process.env.LIVEKIT_URL = 'wss://exemplo.livekit.cloud';
const CHAVE = 'chave-do-plugin-bem-comprida-123';
const CHAVE_DJ = 'outra-chave-bem-comprida-456789';
process.env.MOTOREDE_PLUGINS = JSON.stringify([
  { id: 'musica', nome: 'Música do Willian', chave: CHAVE, salas: ['WILL'] },
  { id: 'dj', nome: 'DJ pareável', chave: CHAVE_DJ },
  { id: 'curta', nome: 'Chave curta', chave: 'abc' },
  { id: 'Inválido Id', nome: 'x', chave: CHAVE },
]);
await subir(PORTA);

const RAIZ = 'C:/Users/willi/Projetos_Firebase/motorede---plataforma-para-motociclistas';
const plugins = (await import(`file:///${RAIZ}/apps/web/api/plugins.ts`)).default;
const { countParticipants } = await import(`file:///${RAIZ}/apps/web/api/_livekit.ts`);
const shared = await import(`file:///${RAIZ}/packages/shared/src/index.ts`);

function chamar(h: any, body: unknown) {
  return new Promise<any>((r) => {
    let st = 200;
    h({ method: 'POST', body }, { set statusCode(v: number) { st = v; }, get statusCode() { return st; },
        setHeader() {}, end: (t: string) => r({ status: st, json: JSON.parse(t) }) });
  });
}

async function tokenDePiloto(sala: string, identidade = 'piloto-ana', nome = 'Ana') {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: identidade, name: nome });
  at.addGrant({ roomJoin: true, room: sala, canPublish: true, canSubscribe: true });
  return at.toJwt();
}

let falhas = 0;
const ok = (c: boolean, rotulo: string, extra = '') => {
  console.log(`  ${c ? 'ok ' : 'FALHOU'} ${rotulo}${extra ? '  ' + extra : ''}`);
  if (!c) falhas++;
};

console.log('\n=== Registro ===');
limpar();
const naSala = await chamar(plugins, { acao: 'listar', token: await tokenDePiloto('WILL') });
const ids = (naSala.json.plugins || []).map((p: any) => p.id);
ok(naSala.status === 200 && ids.length === 1 && ids[0] === 'musica', 'só entradas válidas: chave curta e id inválido caem', JSON.stringify(ids));
ok(naSala.json.plugins[0].online === false, 'plugin que nunca perguntou aparece desligado');
ok(!JSON.stringify(naSala.json).includes(CHAVE), 'a chave do plugin nunca sai na listagem');

const outraSala = await chamar(plugins, { acao: 'listar', token: await tokenDePiloto('OUTRA') });
ok(outraSala.json.plugins.length === 0, 'plugin restrito não aparece em outro comboio');

const semToken = await chamar(plugins, { acao: 'listar', token: 'lixo' });
ok(semToken.status === 401, 'sem token de sala válido, não lista', String(semToken.status));

console.log('\n=== Convite e entrada ===');
const semConvite = await chamar(plugins, { acao: 'entrar', plugin: 'musica', chave: CHAVE, sala: 'WILL' });
ok(semConvite.status === 403, 'sem convite, plugin não recebe token', String(semConvite.status));

const chaveErrada = await chamar(plugins, { acao: 'aguardar', plugin: 'musica', chave: 'errada' });
ok(chaveErrada.status === 401, 'chave errada não recolhe convites');

const convidaFora = await chamar(plugins, { acao: 'convidar', plugin: 'musica', token: await tokenDePiloto('OUTRA') });
ok(convidaFora.status === 404, 'não dá para chamar o plugin para um comboio fora da lista');

const convite = await chamar(plugins, { acao: 'convidar', plugin: 'musica', token: await tokenDePiloto('WILL') });
ok(convite.status === 202, 'piloto do comboio chama o plugin', String(convite.status));
await chamar(plugins, { acao: 'convidar', plugin: 'musica', token: await tokenDePiloto('WILL', 'piloto-bia', 'Bia') });

const espera = await chamar(plugins, { acao: 'aguardar', plugin: 'musica', chave: CHAVE });
ok(espera.status === 200 && espera.json.convites.length === 1, 'dois toques em "chamar" viram um convite só', JSON.stringify(espera.json.convites));
ok(espera.json.convites[0]?.por === 'piloto-ana', 'o convite diz quem chamou');

const vazio = await chamar(plugins, { acao: 'aguardar', plugin: 'musica', chave: CHAVE });
ok(vazio.json.convites.length === 0, 'convite recolhido não volta na próxima pergunta');

const online = await chamar(plugins, { acao: 'listar', token: await tokenDePiloto('WILL') });
ok(online.json.plugins[0].online === true, 'depois de perguntar, o plugin aparece ligado');

const entrada = await chamar(plugins, { acao: 'entrar', plugin: 'musica', chave: CHAVE, sala: 'WILL' });
ok(entrada.status === 200 && typeof entrada.json.token === 'string', 'com convite, recebe token', String(entrada.status));

const repetida = await chamar(plugins, { acao: 'entrar', plugin: 'musica', chave: CHAVE, sala: 'WILL' });
ok(repetida.status === 403, 'um convite vale uma entrada só');

console.log('\n=== O que o token do plugin permite ===');
const claims = await new TokenVerifier(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!).verify(entrada.json.token);
ok(claims.video?.canSubscribe === false, 'plugin NÃO ouve o comboio');
ok(claims.video?.canPublish === true, 'plugin publica áudio');
ok(claims.video?.room === 'WILL', 'token vale só para a sala convidada');
ok(claims.sub === 'plugin-musica', 'identidade com o prefixo reservado', String(claims.sub));

const tokenDoPlugin = await chamar(plugins, { acao: 'convidar', plugin: 'musica', token: entrada.json.token });
ok(tokenDoPlugin.status === 401, 'plugin não chama plugin');

console.log('\n=== Plugins não contam como piloto ===');
const sala = [
  { identity: 'g-1', metadata: '{}' },
  { identity: 'g-2', metadata: '{"adm":true}' },
  // Plugin que apagou a própria marca continua sendo plugin pela identidade.
  { identity: 'plugin-musica', metadata: '{}' },
];
const conta = countParticipants(sala as any);
ok(conta.riders === 1 && conta.total === 2, 'lotação ignora o plugin', JSON.stringify(conta));
ok(countParticipants([{ identity: 'plugin-musica', metadata: '' }] as any).total === 0, 'sala só com plugin conta como vazia');

const lista = shared.toVoiceParticipants([
  { identity: 'plugin-musica', isSpeaking: false, isMicrophoneEnabled: true, joinedAt: new Date(1) },
  { identity: 'g-1', name: 'Ana', isSpeaking: false, isMicrophoneEnabled: true, joinedAt: new Date(2) },
]);
ok(lista.length === 1 && lista[0].isHost, 'plugin fora da lista de pilotos e nunca vira líder');

console.log('\n=== Comandos e volume ===');
ok(shared.parsePluginCommand({ tipo: 'tocar', playlist: 'Estrada' })?.tipo === 'tocar', 'comando válido passa');
ok(shared.parsePluginCommand({ tipo: 'tocar' }) === null, 'tocar sem playlist é descartado');
ok(shared.parsePluginCommand({ tipo: 'tocar', playlist: 'x', faixa: -1 }) === null, 'faixa negativa é descartada');
ok(shared.parsePluginCommand({ tipo: 'rm -rf' }) === null, 'comando desconhecido é descartado');
ok(shared.pluginPlaybackVolume(true, false) === shared.PLUGIN_DUCK_VOLUME, 'alguém falando: música abaixa');
ok(shared.pluginPlaybackVolume(false, false) === 1, 'ninguém falando: volume cheio');
ok(shared.pluginPlaybackVolume(false, true) === 0, 'silenciado por mim: zero, falando ou não');

const estado = { estado: 'tocando', faixa: 'A', playlist: 'P', indice: 2, playlists: [{ nome: 'P', faixas: 3 }], faixas: ['x', 'y', 'A'], chamadoPor: 'g-1' };
const ida = shared.decodePluginState(shared.encodePluginState(estado));
ok(ida.indice === 2 && ida.playlists[0].faixas === 3 && ida.chamadoPor === 'g-1', 'estado sobrevive à ida e volta pelos atributos');
ok(shared.decodePluginState({ playlists: '{quebrado' }).playlists.length === 0, 'atributo corrompido vira vazio, não exceção');

console.log('\n=== Pareamento por código ===');
limpar();
const tokX = await tokenDePiloto('PASSEIO-1');
const antes = await chamar(plugins, { acao: 'listar', token: tokX });
ok(antes.json.plugins.length === 0, 'sem pareamento, plugin sem salas não aparece em comboio nenhum');

const desligado = await chamar(plugins, { acao: 'parear', token: tokX, codigo: 'MUS-7K2P' });
ok(desligado.status === 404, 'código de plugin desligado não pareia', String(desligado.status));

await chamar(plugins, { acao: 'aguardar', plugin: 'dj', chave: CHAVE_DJ, codigo: 'MUS-7K2P' });
const malFormado = await chamar(plugins, { acao: 'parear', token: tokX, codigo: '123' });
ok(malFormado.status === 400, 'código fora do formato é recusado com explicação');

const pareou = await chamar(plugins, { acao: 'parear', token: tokX, codigo: 'mus 7k2p' });
ok(pareou.status === 200 && pareou.json.plugin?.id === 'dj', 'pareia com o código digitado de qualquer jeito', JSON.stringify(pareou.json));

const amigo = await chamar(plugins, { acao: 'listar', token: await tokenDePiloto('PASSEIO-1', 'piloto-bia', 'Bia') });
ok(amigo.json.plugins.some((p: any) => p.id === 'dj'), 'o amigo no mesmo comboio já vê o plugin, sem digitar nada');
const outro = await chamar(plugins, { acao: 'listar', token: await tokenDePiloto('OUTRO-2') });
ok(!outro.json.plugins.some((p: any) => p.id === 'dj'), 'outro comboio não vê');

const conv = await chamar(plugins, { acao: 'convidar', token: tokX, plugin: 'dj' });
ok(conv.status === 202, 'comboio pareado consegue chamar');
const esp = await chamar(plugins, { acao: 'aguardar', plugin: 'dj', chave: CHAVE_DJ, codigo: 'MUS-7K2P' });
const ent = await chamar(plugins, { acao: 'entrar', plugin: 'dj', chave: CHAVE_DJ, sala: esp.json.convites[0]?.sala });
ok(ent.status === 200, 'e o plugin entra', String(ent.status));

// O dono gera um código novo: o antigo morre na hora.
await chamar(plugins, { acao: 'aguardar', plugin: 'dj', chave: CHAVE_DJ, codigo: 'NEW-4ABC' });
const velho = await chamar(plugins, { acao: 'parear', token: await tokenDePiloto('OUTRO-2'), codigo: 'MUS-7K2P' });
ok(velho.status === 404, 'código trocado deixa de valer sem esperar expirar');
const novo = await chamar(plugins, { acao: 'parear', token: await tokenDePiloto('OUTRO-2'), codigo: 'NEW-4ABC' });
ok(novo.status === 200, 'o novo vale');
const aindaPareado = await chamar(plugins, { acao: 'listar', token: tokX });
ok(aindaPareado.json.plugins.some((p: any) => p.id === 'dj'), 'trocar o código não desfaz pareamentos já feitos');

await chamar(plugins, { acao: 'desparear', token: tokX, plugin: 'dj' });
const depois = await chamar(plugins, { acao: 'listar', token: tokX });
ok(!depois.json.plugins.some((p: any) => p.id === 'dj'), 'desparear tira o plugin do comboio');

console.log('\n=== Chutar código ===');
const tokChute = await tokenDePiloto('CHUTE-9');
let bloqueou = false;
for (let i = 0; i < 12; i++) {
  const r = await chamar(plugins, { acao: 'parear', token: tokChute, codigo: `AAA-${'BCDEFGHJKMNP'[i]}222` });
  if (r.status === 429) { bloqueou = true; break; }
}
ok(bloqueou, 'depois de 8 erros o comboio fica bloqueado por um tempo');
const certoMasBloqueado = await chamar(plugins, { acao: 'parear', token: tokChute, codigo: 'NEW-4ABC' });
ok(certoMasBloqueado.status === 429, 'nem o código certo passa durante o bloqueio');

console.log('\n=== Código de pareamento ===');
ok(shared.normalizePairCode('mus-7k2p') === 'MUS-7K2P', 'normaliza minúsculas');
ok(shared.normalizePairCode(' MUS 7K2P ') === 'MUS-7K2P', 'aceita espaço no lugar do hífen');
ok(shared.normalizePairCode('MUS-7K2O') === null, 'recusa letra ambígua (O)');
ok(shared.normalizePairCode('MUS-7K2') === null, 'recusa tamanho errado');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
