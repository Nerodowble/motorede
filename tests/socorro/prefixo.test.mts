import { subir } from './fake-redis.mjs';
const PORTA = 7341;
// Nenhum dos nomes conhecidos. So o prefixo padrao que a Vercel oferece.
process.env.STORAGE_REST_API_URL = `http://127.0.0.1:${PORTA}`;
process.env.STORAGE_REST_API_TOKEN = 'faz-de-conta';
// E uma pegadinha: KV_URL existe mas e string de conexao, nao REST.
process.env.KV_URL = 'redis://usuario:senha@algum-host:6379';
await subir(PORTA);
const RAIZ = 'C:/Users/willi/Projetos_Firebase/motorede---plataforma-para-motociclistas/apps/web/api';
const presenca = (await import(`file:///${RAIZ}/presenca.ts`)).default;
function chamar(h: any, method: string, body?: unknown) {
  return new Promise<any>((r) => {
    let st = 200;
    h({ method, body }, { set statusCode(v: number) { st = v; }, get statusCode() { return st; },
        setHeader() {}, end: (t: string) => r({ status: st, json: JSON.parse(t) }) });
  });
}
const diag = await chamar(presenca, 'GET');
console.log('diagnostico :', JSON.stringify(diag.json));
const gravou = await chamar(presenca, 'POST', { deviceId: 'ana', pushToken: 'T', position: { lat: -23.5, lng: -46.6 } });
console.log('gravou      :', gravou.status, JSON.stringify(gravou.json));
const ok = diag.json.rede === 'ligada' && gravou.status === 200;
console.log(ok ? '\nok  achou o Redis pelo prefixo STORAGE, e ignorou KV_URL' : '\nFALHOU');
process.exit(ok ? 0 : 1);
