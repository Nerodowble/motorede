import { subir, limpar } from './fake-redis.mjs';
import webpush from 'web-push';

/**
 * O servidor precisa entregar para os DOIS mundos: token do Expo (app) e
 * inscricao VAPID (navegador). Este teste confere que ele escolhe o canal
 * certo pelo formato do que esta guardado, e que uma inscricao morta e
 * removida em vez de ficar sendo tentada para sempre.
 */

const PORTA = 7351;
const chaves = webpush.generateVAPIDKeys();
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${PORTA}`;
process.env.UPSTASH_REDIS_REST_TOKEN = 'faz-de-conta';
process.env.EXPO_PUSH_URL = `http://127.0.0.1:${PORTA}/push/send`;
process.env.VAPID_PUBLIC_KEY = chaves.publicKey;
process.env.VAPID_PRIVATE_KEY = chaves.privateKey;
process.env.VAPID_SUBJECT = 'mailto:teste@motorede.app';

await subir(PORTA);

const RAIZ = 'C:/Users/willi/Projetos_Firebase/motorede---plataforma-para-motociclistas/apps/web/api';
const presenca = (await import(`file:///${RAIZ}/presenca.ts`)).default;
const socorro = (await import(`file:///${RAIZ}/socorro.ts`)).default;

function chamar(h: any, method: string, body?: unknown) {
  return new Promise<any>((r) => {
    let st = 200;
    h({ method, body }, { set statusCode(v: number) { st = v; }, get statusCode() { return st; },
        setHeader() {}, end: (t: string) => r({ status: st, json: JSON.parse(t) }) });
  });
}

let falhas = 0;
const ok = (c: boolean, rotulo: string, extra = '') => {
  console.log(`  ${c ? 'ok ' : 'FALHOU'} ${rotulo}${extra ? '  ' + extra : ''}`);
  if (!c) falhas++;
};

const PAULISTA = { lat: -23.561684, lng: -46.655981 };
// Inscricao com a forma real de uma do navegador, apontando para um endpoint
// que nao existe — o envio vai falhar, e e isso que queremos observar.
const inscricaoWeb = JSON.stringify({
  endpoint: 'https://fcm.googleapis.com/fcm/send/nao-existe-de-verdade-xyz',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
});

console.log('\n=== 1. Inscricao de navegador nao e truncada ===');
limpar();
let r = await chamar(presenca, 'POST', { deviceId: 'web-1', pushToken: inscricaoWeb, position: PAULISTA });
ok(r.status === 200, 'aceita inscricao longa', `${inscricaoWeb.length} caracteres`);

console.log('\n=== 2. A chave publica e servida pela API ===');
r = await chamar(presenca, 'GET');
ok(r.json.vapidPublicKey === chaves.publicKey, 'chave publica devolvida ao navegador');

console.log('\n=== 3. App e navegador convivem na mesma rede ===');
await chamar(presenca, 'POST', { deviceId: 'app-1', pushToken: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]', position: PAULISTA });
r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte', pushToken: 'ExponentPushToken[dddddddddddddddddddddd]',
  pedidoId: 'p-1', kind: 'emergencia', nome: 'Teste',
  referencia: 'Av Paulista altura do MASP', position: PAULISTA, raioKm: 15,
});
ok(r.json.encontrados === 2, 'os dois estao no raio', JSON.stringify(r.json));
// O do app "entrega" (servidor de mentira aceita); o do navegador falha porque
// o endpoint nao existe. 1 e 1 prova que cada um foi pelo canal certo.
ok(r.json.avisados === 1 && r.json.falhas === 1,
   'cada um foi pelo seu canal (app entregue, web falhou no endpoint falso)',
   JSON.stringify(r.json));

console.log('\n=== 4. Inscricao morta sai da rede sozinha ===');
await new Promise((s) => setTimeout(s, 400));
r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte', pushToken: 'T', pedidoId: 'p-2', kind: 'emergencia',
  nome: 'Teste', referencia: 'Av Paulista altura do MASP', position: PAULISTA, raioKm: 15,
});
ok(r.json.encontrados === 1, 'a inscricao recusada foi removida', JSON.stringify(r.json));

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHA(S)'}\n`);
process.exit(falhas === 0 ? 0 : 1);
