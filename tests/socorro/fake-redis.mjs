import http from 'node:http';

/**
 * Redis de mentira que fala o protocolo REST do Upstash (POST /pipeline).
 * Implementa só os comandos que o socorro usa. Serve para exercitar o nosso
 * código de verdade — o comportamento do Upstash real fica por conferir.
 */

const kv = new Map();     // chave -> { valor, expiraEm }
const geo = new Map();    // membro -> { lat, lng }

const vivo = (e) => !e || !e.expiraEm || e.expiraEm > Date.now();

function haversine(a, b) {
  const R = 6371, r = (d) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function executar(cmd) {
  const nome = String(cmd[0]).toUpperCase();

  if (nome === 'GEOADD') {
    const [, , lng, lat, membro] = cmd;
    const novo = !geo.has(membro);
    geo.set(membro, { lat: Number(lat), lng: Number(lng) });
    return novo ? 1 : 0;
  }

  if (nome === 'SET') {
    const [, chave, valor] = cmd;
    const iEx = cmd.findIndex((c) => String(c).toUpperCase() === 'EX');
    const expiraEm = iEx > 0 ? Date.now() + Number(cmd[iEx + 1]) * 1000 : null;
    kv.set(chave, { valor, expiraEm });
    return 'OK';
  }

  if (nome === 'GET') {
    const e = kv.get(cmd[1]);
    return vivo(e) && e ? e.valor : null;
  }

  if (nome === 'MGET') {
    return cmd.slice(1).map((c) => {
      const e = kv.get(c);
      return vivo(e) && e ? e.valor : null;
    });
  }

  if (nome === 'DEL') { const n = kv.delete(cmd[1]) ? 1 : 0; return n; }
  if (nome === 'ZRANGE') return [...geo.keys()];
  if (nome === 'ZREM') { let n = 0; for (const m of cmd.slice(2)) if (geo.delete(m)) n++; return n; }

  if (nome === 'GEOSEARCH') {
    const iLonLat = cmd.findIndex((c) => String(c).toUpperCase() === 'FROMLONLAT');
    const centro = { lng: Number(cmd[iLonLat + 1]), lat: Number(cmd[iLonLat + 2]) };
    const iRaio = cmd.findIndex((c) => String(c).toUpperCase() === 'BYRADIUS');
    const raio = Number(cmd[iRaio + 1]);
    const comDist = cmd.some((c) => String(c).toUpperCase() === 'WITHDIST');

    const achados = [];
    for (const [membro, p] of geo) {
      const d = haversine(centro, p);
      if (d <= raio) achados.push([membro, d]);
    }
    achados.sort((a, b) => a[1] - b[1]);
    return achados.map(([m, d]) => (comDist ? [m, d.toFixed(4)] : m));
  }

  throw new Error('comando nao implementado: ' + nome);
}

export function limpar() { kv.clear(); geo.clear(); }
export function expirarToken(deviceId) { kv.delete(`mr:tok:${deviceId}`); }
export function estado() { return { chaves: kv.size, membrosGeo: geo.size }; }

export function subir(porta) {
  const servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      // Também finge o serviço de push do Expo, para conferir o payload.
      if (req.url.includes('/push/send')) {
        const lote = JSON.parse(corpo);
        globalThis.__pushEnviados = (globalThis.__pushEnviados || []).concat(lote);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ data: lote.map(() => ({ status: 'ok' })) }));
      }
      try {
        const cmds = JSON.parse(corpo);
        const saida = cmds.map((c) => {
          try { return { result: executar(c) }; }
          catch (e) { return { error: e.message }; }
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(saida));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });
  return new Promise((r) => servidor.listen(porta, () => r(servidor)));
}
