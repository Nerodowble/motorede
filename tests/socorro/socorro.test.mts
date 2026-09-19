import { subir, limpar, expirarToken, estado } from './fake-redis.mjs';

const PORTA = 7331;
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${PORTA}`;
process.env.UPSTASH_REDIS_REST_TOKEN = 'faz-de-conta';
process.env.EXPO_PUSH_URL = `http://127.0.0.1:${PORTA}/push/send`;

await subir(PORTA);

const RAIZ = 'C:/Users/willi/Projetos_Firebase/motorede---plataforma-para-motociclistas/apps/web/api';
const presenca = (await import(`file:///${RAIZ}/presenca.ts`)).default;
const socorro = (await import(`file:///${RAIZ}/socorro.ts`)).default;

// --- arnês mínimo para chamar um handler (req, res) sem subir servidor ---
function chamar(handler: any, method: string, body: unknown) {
  const req: any = { method, body };
  return new Promise<{ status: number; json: any }>((resolve) => {
    let status = 200;
    const res: any = {
      set statusCode(v: number) { status = v; },
      get statusCode() { return status; },
      setHeader() {},
      end(texto: string) { resolve({ status, json: JSON.parse(texto) }); },
    };
    handler(req, res);
  });
}

const pushes = () => (globalThis as any).__pushEnviados || [];
const zerarPushes = () => { (globalThis as any).__pushEnviados = []; };

let falhas = 0;
function ok(condicao: boolean, rotulo: string, extra = '') {
  console.log(`  ${condicao ? 'ok ' : 'FALHOU'} ${rotulo}${extra ? '  ' + extra : ''}`);
  if (!condicao) falhas++;
}

// Avenida Paulista como origem; os outros deslocados por graus conhecidos.
const PAULISTA = { lat: -23.561684, lng: -46.655981 };
const desloca = (km: number) => ({ lat: PAULISTA.lat + km / 111.32, lng: PAULISTA.lng });

console.log('\n=== 1. Presenca entra e sai ===');
limpar(); zerarPushes();
let r = await chamar(presenca, 'POST', { deviceId: 'ana', pushToken: 'ExpoTok[ana]', position: PAULISTA });
ok(r.status === 200 && r.json.presente === true, 'POST registra', JSON.stringify(r.json));
r = await chamar(presenca, 'DELETE', { deviceId: 'ana' });
ok(r.status === 200 && r.json.presente === false, 'DELETE remove');
ok(estado().membrosGeo === 0, 'nao sobrou nada no geo');

console.log('\n=== 2. Validacao do corpo ===');
r = await chamar(presenca, 'POST', { deviceId: 'x', pushToken: 't' });
ok(r.status === 400, 'sem posicao -> 400', r.json.error);
r = await chamar(presenca, 'POST', { deviceId: 'x', pushToken: 't', position: { lat: 999, lng: 0 } });
ok(r.status === 400, 'latitude impossivel -> 400');

console.log('\n=== 3. O raio filtra de verdade ===');
limpar(); zerarPushes();
for (const [nome, km] of [['perto', 2], ['medio', 9], ['longe', 40]] as const) {
  await chamar(presenca, 'POST', { deviceId: nome, pushToken: `ExpoTok[${nome}]`, position: desloca(km) });
}
await chamar(presenca, 'POST', { deviceId: 'pedinte', pushToken: 'ExpoTok[pedinte]', position: PAULISTA });

r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte', pushToken: 'ExpoTok[pedinte]', pedidoId: 'ped-1',
  kind: 'emergencia', emergency: 'flat_tire', nome: 'Willian', moto: 'CB 500X',
  referencia: 'Imigrantes km 28, sentido litoral', detalhes: 'Pneu furado',
  position: PAULISTA, raioKm: 15,
});
ok(r.status === 200, 'pedido aceito', JSON.stringify(r.json));
ok(r.json.encontrados === 2, 'achou 2 no raio de 15 km (nao o de 40)', `achou ${r.json.encontrados}`);
ok(r.json.avisados === 2, 'avisou os 2');
const destinos = pushes().map((p: any) => p.to).sort();
ok(!destinos.includes('ExpoTok[longe]'), 'quem esta a 40 km NAO foi avisado');
ok(!destinos.includes('ExpoTok[pedinte]'), 'quem pediu nao avisa a si mesmo');

console.log('\n=== 4. O push leva celula, nunca o ponto exato ===');
const p0 = pushes()[0];
ok(p0.data.celula.lat !== PAULISTA.lat, 'latitude publicada != latitude real',
   `${p0.data.celula.lat} vs ${PAULISTA.lat}`);
ok(JSON.stringify(p0).includes(String(PAULISTA.lat)) === false, 'coordenada exata nao aparece em lugar nenhum do payload');
ok(p0.channelId === 'socorro' && p0.priority === 'high', 'canal e prioridade de urgencia');

console.log('\n=== 5. Apoio nao usa o canal de socorro ===');
zerarPushes();
await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte', pushToken: 'ExpoTok[pedinte]', pedidoId: 'ped-2',
  kind: 'apoio', nome: 'Willian', referencia: 'Itaim, rua Joao Cachoeira',
  detalhes: 'Alguem pega um pacote?', position: PAULISTA, raioKm: 15,
});
ok(pushes()[0].channelId === 'apoio', 'canal separado', pushes()[0].title);

console.log('\n=== 6. Token vencido some da busca e e limpo ===');
limpar(); zerarPushes();
await chamar(presenca, 'POST', { deviceId: 'sumiu', pushToken: 'ExpoTok[sumiu]', position: desloca(3) });
await chamar(presenca, 'POST', { deviceId: 'ficou', pushToken: 'ExpoTok[ficou]', position: desloca(4) });
expirarToken('sumiu');   // simula os 45 minutos passando
r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'pedinte2', pushToken: 'T', pedidoId: 'ped-3', kind: 'emergencia',
  nome: 'Willian', referencia: 'Marginal Pinheiros, altura da ponte',
  position: PAULISTA, raioKm: 20,
});
ok(r.json.encontrados === 1 && r.json.avisados === 1, 'so o alcancavel foi contado', JSON.stringify(r.json));
await new Promise((s) => setTimeout(s, 60));
ok(estado().membrosGeo === 1, 'entrada morta foi removida do geo', JSON.stringify(estado()));

console.log('\n=== 7. Resposta volta para quem pediu ===');
zerarPushes();
r = await chamar(socorro, 'POST', {
  acao: 'responder', deviceId: 'ficou', pedidoId: 'ped-3',
  nome: 'Joao', moto: 'Fazer 250', resposta: 'Tenho kit macarrao, chego em 10 min',
  position: desloca(4),
});
ok(r.status === 200 && r.json.entregue === true, 'entregue ao pedinte');
ok(pushes()[0].to === 'T', 'foi para o token de quem pediu', pushes()[0].title);
ok(pushes()[0].data.celula.lat !== desloca(4).lat, 'quem ajuda tambem aparece aproximado');

console.log('\n=== 8. Pedido inexistente / vencido ===');
r = await chamar(socorro, 'POST', { acao: 'responder', deviceId: 'x', pedidoId: 'nao-existe', nome: 'Z' });
ok(r.status === 404 && r.json.expirado === true, 'diz que expirou, nao erro generico', r.json.error);

console.log('\n=== 9. Referencia fraca e falta de GPS ===');
r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'p', pedidoId: 'ped-9', referencia: 'ali', position: PAULISTA,
});
ok(r.status === 400, 'referencia vaga barrada', r.json.error);
r = await chamar(socorro, 'POST', {
  acao: 'pedir', deviceId: 'p', pedidoId: 'ped-9', referencia: 'Rodovia Raposo km 40, sentido capital',
});
ok(r.status === 400 && r.json.semGps === true, 'sem GPS nao finge que avisou', r.json.error);

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHA(S)'}\n`);
process.exit(falhas === 0 ? 0 : 1);
