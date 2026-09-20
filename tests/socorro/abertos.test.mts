import { subir, limpar } from './fake-redis.mjs';

/**
 * O caso que o Willian levantou: "e se eu abrir o app 1 minuto depois de
 * alguem pedir ajuda?". Antes a resposta era "voce nunca fica sabendo".
 */

const PORTA = 7361;
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${PORTA}`;
process.env.UPSTASH_REDIS_REST_TOKEN = 'faz-de-conta';
process.env.EXPO_PUSH_URL = `http://127.0.0.1:${PORTA}/push/send`;
await subir(PORTA);

const RAIZ = 'C:/Users/willi/Projetos_Firebase/motorede---plataforma-para-motociclistas/apps/web/api';
const presenca = (await import(`file:///${RAIZ}/presenca.ts`)).default;
const socorro = (await import(`file:///${RAIZ}/socorro.ts`)).default;

function chamar(h: any, method: string, body?: unknown, url?: string) {
  return new Promise<any>((r) => {
    let st = 200;
    h({ method, body, url }, { set statusCode(v: number) { st = v; }, get statusCode() { return st; },
        setHeader() {}, end: (t: string) => r({ status: st, json: JSON.parse(t) }) });
  });
}

let falhas = 0;
const ok = (c: boolean, rotulo: string, extra = '') => {
  console.log(`  ${c ? 'ok ' : 'FALHOU'} ${rotulo}${extra ? '  ' + extra : ''}`);
  if (!c) falhas++;
};

const PAULISTA = { lat: -23.561684, lng: -46.655981 };
const desloca = (km: number) => ({ lat: PAULISTA.lat + km / 111.32, lng: PAULISTA.lng });

console.log('\n=== 1. Ninguem online: o pedido NAO se perde ===');
limpar();
// Rede vazia de proposito — ninguem para receber o push.
let r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'sozinho', pushToken: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]',
  pedidoId: 'ped-sozinho', kind: 'emergencia', emergency: 'flat_tire', nome: 'Willian',
  moto: 'CB 500X', referencia: 'Imigrantes km 28, sentido litoral',
  detalhes: 'Pneu furado', position: PAULISTA, raioKm: 15,
});
ok(r.json.avisados === 0 && r.json.encontrados === 0, 'ninguem foi avisado', JSON.stringify(r.json));

console.log('\n=== 2. Quem chega DEPOIS encontra o pedido ===');
r = await chamar(socorro, 'GET', undefined, `/api/socorro?lat=${PAULISTA.lat}&lng=${PAULISTA.lng}&raioKm=25`);
ok(r.json.pedidos.length === 1, 'o pedido esta la', `${r.json.pedidos.length} encontrado(s)`);
const p = r.json.pedidos[0];
ok(p.nome === 'Willian' && p.referencia.includes('Imigrantes'), 'com nome e referencia', p.referencia);

console.log('\n=== 3. E continua sem o endereco exato ===');
ok(p.celula.lat !== PAULISTA.lat, 'so a celula, nao o ponto', `${p.celula.lat} vs ${PAULISTA.lat}`);
ok(!JSON.stringify(p).includes(String(PAULISTA.lat)), 'coordenada exata nao aparece no corpo');

console.log('\n=== 4. Quem esta longe nao ve ===');
r = await chamar(socorro, 'GET', undefined, `/api/socorro?lat=${desloca(60).lat}&lng=${desloca(60).lng}&raioKm=25`);
ok(r.json.pedidos.length === 0, 'a 60 km, lista vazia', JSON.stringify(r.json.pedidos.length));

console.log('\n=== 5. Encerrar tira da lista na hora ===');
r = await chamar(socorro, 'POST', { acao: 'encerrar', deviceId: 'sozinho', pedidoId: 'ped-sozinho' });
ok(r.json.encerrado === true, 'encerrado');
r = await chamar(socorro, 'GET', undefined, `/api/socorro?lat=${PAULISTA.lat}&lng=${PAULISTA.lng}&raioKm=25`);
ok(r.json.pedidos.length === 0, 'sumiu da lista', JSON.stringify(r.json.pedidos.length));

console.log('\n=== 6. Responder depois de encerrado avisa que acabou ===');
r = await chamar(socorro, 'POST', { acao: 'responder', deviceId: 'x', pedidoId: 'ped-sozinho', nome: 'Joao' });
ok(r.status === 404 && r.json.expirado === true, 'diz que acabou', r.json.error);

console.log('\n=== 7. Voce nao ve o SEU proprio pedido ===');
await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'eu-mesmo', pushToken: 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]',
  pedidoId: 'ped-meu', kind: 'emergencia', nome: 'Willian',
  referencia: 'Av Paulista altura do MASP', position: PAULISTA, raioKm: 15,
});
r = await chamar(socorro, 'GET', undefined, `/api/socorro?lat=${PAULISTA.lat}&lng=${PAULISTA.lng}&raioKm=25&excluir=eu-mesmo`);
ok(r.json.pedidos.length === 0, 'quem pediu nao ve o proprio pedido', JSON.stringify(r.json.pedidos.length));
r = await chamar(socorro, 'GET', undefined, `/api/socorro?lat=${PAULISTA.lat}&lng=${PAULISTA.lng}&raioKm=25&excluir=outra-pessoa`);
ok(r.json.pedidos.length === 1, 'mas os outros veem', JSON.stringify(r.json.pedidos.length));

console.log('\n=== 8. GET sem coordenada e recusado ===');
r = await chamar(socorro, 'GET', undefined, '/api/socorro');
ok(r.status === 400, 'exige lat e lng', r.json.error);

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHA(S)'}\n`);
process.exit(falhas === 0 ? 0 : 1);
