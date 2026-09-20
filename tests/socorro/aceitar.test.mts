import { subir, limpar } from './fake-redis.mjs';

/**
 * A parte que faltava: quem pediu ESCOLHE quem recebe o endereco exato.
 * Ate aqui todo mundo so via a celula de ~1 km.
 */

const PORTA = 7371;
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
const pushes = () => (globalThis as any).__pushEnviados || [];
const zerar = () => { (globalThis as any).__pushEnviados = []; };

let falhas = 0;
const ok = (c: boolean, rotulo: string, extra = '') => {
  console.log(`  ${c ? 'ok ' : 'FALHOU'} ${rotulo}${extra ? '  ' + extra : ''}`);
  if (!c) falhas++;
};

const EXATO = { lat: -23.703912, lng: -46.608634 };

console.log('\n=== Prepara: pedinte e um socorrista ===');
limpar(); zerar();
await chamar(presenca, 'POST', { deviceId: 'ajudante', pushToken: 'ExponentPushToken[hhhhhhhhhhhhhhhhhhhhhh]', position: EXATO });
await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte', pushToken: 'ExponentPushToken[pppppppppppppppppppppp]',
  pedidoId: 'p1', kind: 'emergencia', nome: 'Willian', moto: 'CB 500X',
  referencia: 'Av. Alda, altura do Inamar, Diadema', position: EXATO, raioKm: 25,
});
ok(pushes().length === 1, 'o socorrista foi avisado');
ok(!JSON.stringify(pushes()[0]).includes(String(EXATO.lat)), 'e SEM o endereco exato');

console.log('\n=== 1. Ele se oferece ===');
zerar();
let r = await chamar(socorro, 'POST', {
  acao: 'responder', deviceId: 'ajudante', pushToken: 'ExponentPushToken[hhhhhhhhhhhhhhhhhhhhhh]',
  pedidoId: 'p1', nome: 'Joao', moto: 'Fazer 250',
  resposta: 'Tenho kit macarrao', position: EXATO,
});
ok(r.json.ofertaId?.startsWith('of-'), 'a oferta ganhou identificador', r.json.ofertaId);
const ofertaId = r.json.ofertaId;
ok(!JSON.stringify(pushes()[0]).includes(String(EXATO.lat)), 'quem ajuda tambem aparece aproximado');

console.log('\n=== 2. Um estranho NAO consegue aceitar ===');
zerar();
r = await chamar(socorro, 'POST', {
  acao: 'aceitar', deviceId: 'intruso', pedidoId: 'p1', ofertaId,
  precisa: { lat: -1, lng: -1 }, telefone: '(11) 90000-0000', nome: 'Falso',
});
ok(r.status === 403, 'recusa quem nao abriu o pedido', r.json.error);
ok(pushes().length === 0, 'e nada foi enviado');

console.log('\n=== 3. Quem pediu aceita: agora sim o endereco exato ===');
zerar();
r = await chamar(socorro, 'POST', {
  acao: 'aceitar', deviceId: 'pedinte', pedidoId: 'p1', ofertaId,
  precisa: EXATO, telefone: '(11) 98888-7777', nome: 'Willian',
  referencia: 'Av. Alda 1200, portao azul',
});
ok(r.json.ok === true, 'aceito');
const entregue = pushes()[0];
ok(entregue.to === 'ExponentPushToken[hhhhhhhhhhhhhhhhhhhhhh]', 'foi SO para quem foi aceito');
ok(entregue.data.exato.lat === EXATO.lat, 'com o ponto EXATO', String(entregue.data.exato.lat));
ok(entregue.data.telefone === '(11) 98888-7777', 'e com o telefone');
ok(entregue.data.tipo === 'aceito', 'tipo correto para a tela reagir');

console.log('\n=== 4. Oferta inexistente ===');
r = await chamar(socorro, 'POST', {
  acao: 'aceitar', deviceId: 'pedinte', pedidoId: 'p1', ofertaId: 'of-nao-existe', precisa: EXATO,
});
ok(r.status === 404, 'diz que nao achou a oferta', r.json.error);

console.log('\n=== 5. Encerrar limpa tambem as ofertas ===');
await chamar(socorro, 'POST', { acao: 'encerrar', deviceId: 'pedinte', pedidoId: 'p1' });
r = await chamar(socorro, 'POST', { acao: 'aceitar', deviceId: 'pedinte', pedidoId: 'p1', ofertaId, precisa: EXATO });
ok(r.status === 404 && r.json.expirado === true, 'pedido encerrado nao aceita mais ninguem', r.json.error);

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHA(S)'}\n`);
process.exit(falhas === 0 ? 0 : 1);
