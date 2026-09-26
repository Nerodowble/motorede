import http from 'node:http';

/**
 * Redis de mentira que fala o protocolo REST do Upstash (POST /pipeline).
 * Implementa só os comandos que o socorro usa. Serve para exercitar o nosso
 * código de verdade — o comportamento do Upstash real fica por conferir.
 */

const kv = new Map();     // chave -> { valor, expiraEm }
const geos = new Map();   // nome do conjunto -> Map(membro -> { lat, lng })
const geo = (nome) => {
  if (!geos.has(nome)) geos.set(nome, new Map());
  return geos.get(nome);
};

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
    const [, conjunto, lng, lat, membro] = cmd;
    const g = geo(conjunto);
    const novo = !g.has(membro);
    g.set(membro, { lat: Number(lat), lng: Number(lng) });
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
  if (nome === 'ZRANGE') return [...geo(cmd[1]).keys()];

  if (nome === 'RPUSH') {
    const e = kv.get(cmd[1]);
    const lista = vivo(e) && e ? e.valor : [];
    lista.push(...cmd.slice(2));
    kv.set(cmd[1], { valor: lista, expiraEm: e && vivo(e) ? e.expiraEm : null });
    return lista.length;
  }
  if (nome === 'LRANGE') {
    const e = kv.get(cmd[1]);
    return vivo(e) && e ? e.valor : [];
  }
  if (nome === 'EXPIRE') {
    const e = kv.get(cmd[1]);
    if (!e) return 0;
    e.expiraEm = Date.now() + Number(cmd[2]) * 1000;
    return 1;
  }
  if (nome === 'ZREM') { const g = geo(cmd[1]); let n = 0; for (const m of cmd.slice(2)) if (g.delete(m)) n++; return n; }

  if (nome === 'GEOSEARCH') {
    const iLonLat = cmd.findIndex((c) => String(c).toUpperCase() === 'FROMLONLAT');
    const centro = { lng: Number(cmd[iLonLat + 1]), lat: Number(cmd[iLonLat + 2]) };
    const iRaio = cmd.findIndex((c) => String(c).toUpperCase() === 'BYRADIUS');
    const raio = Number(cmd[iRaio + 1]);
    const comDist = cmd.some((c) => String(c).toUpperCase() === 'WITHDIST');

    const achados = [];
    for (const [membro, p] of geo(cmd[1])) {
      const d = haversine(centro, p);
      if (d <= raio) achados.push([membro, d]);
    }
    achados.sort((a, b) => a[1] - b[1]);
    return achados.map(([m, d]) => (comDist ? [m, d.toFixed(4)] : m));
  }

  // Conjuntos e contador, usados pelo pareamento de plugins.
  const conjunto = (chave, criar) => {
    const e = kv.get(chave);
    if (e && vivo(e) && e.valor instanceof Set) return e.valor;
    if (!criar) return new Set();
    const novo = new Set();
    kv.set(chave, { valor: novo, expiraEm: null });
    return novo;
  };
  if (nome === 'SADD') { const c = conjunto(cmd[1], true); let n = 0; for (const m of cmd.slice(2)) if (!c.has(m)) { c.add(m); n++; } return n; }
  if (nome === 'SREM') { const c = conjunto(cmd[1], false); let n = 0; for (const m of cmd.slice(2)) if (c.delete(m)) n++; return n; }
  if (nome === 'SMEMBERS') return [...conjunto(cmd[1], false)];
  if (nome === 'SISMEMBER') return conjunto(cmd[1], false).has(cmd[2]) ? 1 : 0;
  if (nome === 'INCR') {
    const e = kv.get(cmd[1]);
    const valor = (vivo(e) && e ? Number(e.valor) : 0) + 1;
    kv.set(cmd[1], { valor: String(valor), expiraEm: e && vivo(e) ? e.expiraEm : null });
    return valor;
  }

  throw new Error('comando nao implementado: ' + nome);
}

export function limpar() { kv.clear(); geos.clear(); }
export function expirarToken(deviceId) { kv.delete(`mr:tok:${deviceId}`); }
export function estado() { return { chaves: kv.size, membrosGeo: geo('mr:geo').size }; }

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
