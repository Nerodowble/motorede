import type { IncomingMessage, ServerResponse } from 'node:http';
import { coarsenLocation } from '@motorede/shared';
import {
  vizinhosNoRaio,
  lembrarPedido,
  tokenDoPedinte,
  guardarPedido,
  pedidosNoRaio,
  encerrarPedido,
  donoDoPedido,
  guardarOferta,
  acharOferta,
  ofertasDoPedido,
  enviarPush,
  storeConfigured,
  lerPonto,
  textoCurto,
  type Recado,
} from './_sos.js';

/**
 * Toca o telefone de quem está perto — e devolve a resposta a quem pediu.
 *
 * O QUE O SERVIDOR GUARDA DO PEDIDO
 *
 * O suficiente para quem chegar depois ainda encontrar: nome, texto e a
 * célula de ~1 km, por 2 horas. Antes o pedido era só um push, e quem abrisse
 * o app um minuto atrasado nunca ficava sabendo — para um socorro, esse era o
 * erro inteiro.
 *
 * Continuam fora daqui o endereço exato, o telefone e a conversa. Esses ficam
 * no aparelho de quem pediu, e o endereço só chega a quem ele aceitar.
 *
 * O QUE VAI NA NOTIFICAÇÃO
 *
 * A célula de ~1 km, nunca o ponto. Quem recebe calcula a distância no próprio
 * aparelho e decide se mostra. Um pedido de socorro diz "estou sozinho e parado
 * neste endereço", e é exatamente o que um assaltante quer: então o endereço
 * exato não entra aqui. Ele é entregue depois, pelo próprio pedinte, a quem ele
 * aceitar.
 */

type Acao = 'pedir' | 'responder' | 'encerrar' | 'aceitar';

interface Corpo {
  acao?: unknown;
  deviceId?: unknown;
  pushToken?: unknown;
  // pedir
  pedidoId?: unknown;
  kind?: unknown;
  emergency?: unknown;
  nome?: unknown;
  moto?: unknown;
  referencia?: unknown;
  detalhes?: unknown;
  position?: unknown;
  raioKm?: unknown;
  // responder
  resposta?: unknown;
  // aceitar
  ofertaId?: unknown;
  precisa?: unknown;
  telefone?: unknown;
}

async function lerCorpo(req: IncomingMessage): Promise<Corpo> {
  if (typeof (req as { body?: unknown }).body === 'object' && (req as { body?: unknown }).body) {
    return (req as unknown as { body: Corpo }).body;
  }
  const partes: Buffer[] = [];
  for await (const p of req) partes.push(p as Buffer);
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as Corpo;
  } catch {
    return {};
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };

  if (req.method === 'GET') {
    if (!storeConfigured()) return responder(503, { error: 'Rede de socorro não configurada.' });
    const url = new URL(req.url || '/', 'http://local');

    // Quem se ofereceu no meu pedido. Só o dono vê, conferido contra o
    // identificador guardado no próprio pedido.
    const verOfertas = url.searchParams.get('ofertas');
    if (verOfertas) {
      const quem = url.searchParams.get('deviceId') || '';
      const dono = await donoDoPedido(verOfertas);
      if (!dono) return responder(404, { error: 'Pedido expirado ou encerrado.', expirado: true });
      if (dono !== quem) return responder(403, { error: 'Só quem abriu o pedido vê as ofertas.' });
      return responder(200, { ofertas: await ofertasDoPedido(verOfertas) });
    }

    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    // Testar a presença do parâmetro ANTES de converter. `Number(null)` é 0, e
    // um pedido sem coordenada viraria uma consulta ao ponto (0,0), no golfo
    // da Guiné — resposta vazia e plausível, com o cliente achando que
    // simplesmente não há ninguém por perto. Errar calado é pior que falhar.
    if (lat === null || lng === null) {
      return responder(400, { error: 'Informe lat e lng.' });
    }
    const posicao = lerPonto({ lat: Number(lat), lng: Number(lng) });
    if (!posicao) return responder(400, { error: 'lat e lng precisam ser números válidos.' });
    const raioKm = Math.min(Math.max(Number(url.searchParams.get('raioKm')) || 25, 1), 50);
    try {
      const excluir = url.searchParams.get('excluir') || undefined;
      return responder(200, { pedidos: await pedidosNoRaio(posicao, raioKm, excluir) });
    } catch (erro) {
      return responder(500, {
        error: 'Falha ao listar pedidos.',
        detail: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  if (req.method !== 'POST') return responder(405, { error: 'Use GET para listar ou POST para agir.' });
  if (!storeConfigured()) {
    return responder(503, { error: 'Rede de socorro ainda não configurada no servidor.' });
  }

  const corpo = await lerCorpo(req);
  const acao = (textoCurto(corpo.acao, 16) || 'pedir') as Acao;
  const deviceId = textoCurto(corpo.deviceId, 64);
  if (!deviceId) return responder(400, { error: 'deviceId é obrigatório.' });

  try {
    if (acao === 'responder') return await responderPedido(corpo, deviceId, responder);
    if (acao === 'aceitar') return await aceitarOferta(corpo, deviceId, responder);
    if (acao === 'encerrar') {
      const pedidoId = textoCurto(corpo.pedidoId, 64);
      if (!pedidoId) return responder(400, { error: 'pedidoId é obrigatório.' });
      await encerrarPedido(pedidoId);
      return responder(200, { ok: true, encerrado: true });
    }
    return await abrirPedido(corpo, deviceId, responder);
  } catch (erro) {
    return responder(500, {
      error: 'Falha ao acionar a rede.',
      detail: erro instanceof Error ? erro.message : String(erro),
    });
  }
}

type Responder = (codigo: number, corpo: unknown) => void;

async function abrirPedido(corpo: Corpo, deviceId: string, responder: Responder) {
  const pedidoId = textoCurto(corpo.pedidoId, 64);
  const nome = textoCurto(corpo.nome, 40) || 'Um piloto';
  const referencia = textoCurto(corpo.referencia, 140);
  const detalhes = textoCurto(corpo.detalhes, 200);
  const moto = textoCurto(corpo.moto, 60);
  const pushToken = textoCurto(corpo.pushToken, 1024);
  const posicao = lerPonto(corpo.position);
  const kind = corpo.kind === 'apoio' ? 'apoio' : 'emergencia';
  const emergency = textoCurto(corpo.emergency, 32);
  const raioKm = Math.min(Math.max(Number(corpo.raioKm) || 15, 1), 50);

  if (!pedidoId) return responder(400, { error: 'pedidoId é obrigatório.' });
  if (referencia.length < 6) {
    return responder(400, {
      error: 'Escreva onde você está — rodovia, km, sentido, algum ponto visível.',
    });
  }
  if (!posicao) {
    // Sem coordenada não há como calcular raio, e alertar a cidade inteira
    // seria pior que não alertar. O aparelho continua podendo pedir ajuda
    // pelos canais dele; o que não dá é fingir que a rede foi acionada.
    return responder(400, {
      error: 'Sem posição do GPS não é possível avisar quem está perto.',
      semGps: true,
    });
  }

  const celula = coarsenLocation(posicao);
  const vizinhos = await vizinhosNoRaio(posicao, raioKm, deviceId);

  const urgente = kind === 'emergencia';
  const titulo = urgente
    ? `Socorro a ${raioKm} km — ${nome}`
    : `Pedido de apoio — ${nome}`;

  const recados: Recado[] = vizinhos.map((v) => ({
    to: v.pushToken,
    title: titulo,
    body: referencia + (detalhes ? ` · ${detalhes}` : ''),
    urgente,
    data: {
      tipo: 'socorro',
      pedidoId,
      kind,
      emergency,
      nome,
      moto,
      referencia,
      detalhes,
      // Célula, não ponto. Quem recebe faz a conta da distância no aparelho.
      celula,
      distanciaAproxKm: v.distanciaKm,
      raioKm,
      em: new Date().toISOString(),
    },
  }));

  if (pushToken) await lembrarPedido(pedidoId, pushToken);

  // Guardado ANTES do push: se a entrega falhar, o pedido ainda existe para
  // quem abrir o app depois. O contrário — push sem registro — foi o buraco
  // que este arquivo tinha.
  await guardarPedido({
    pedidoId,
    de: deviceId,
    kind,
    emergency: emergency || undefined,
    nome,
    moto: moto || undefined,
    referencia,
    detalhes: detalhes || undefined,
    celula,
    raioKm,
    em: new Date().toISOString(),
  });

  const { enviados, falhas } = await enviarPush(recados);

  return responder(200, {
    ok: true,
    pedidoId,
    // Números honestos: quantos aparelhos havia no raio e quantos aceitaram a
    // entrega. "Alerta enviado" sem número foi o tipo de frase que este app já
    // usou para dizer que algo tinha acontecido quando nada havia acontecido.
    encontrados: vizinhos.length,
    avisados: enviados,
    falhas,
  });
}

async function responderPedido(corpo: Corpo, deviceId: string, responder: Responder) {
  const pedidoId = textoCurto(corpo.pedidoId, 64);
  const nome = textoCurto(corpo.nome, 40) || 'Um piloto';
  const moto = textoCurto(corpo.moto, 60);
  const resposta = textoCurto(corpo.resposta, 200) || 'Posso ajudar.';
  const posicao = lerPonto(corpo.position);
  const pushToken = textoCurto(corpo.pushToken, 1024);

  if (!pedidoId) return responder(400, { error: 'pedidoId é obrigatório.' });

  const destino = await tokenDoPedinte(pedidoId);
  if (!destino) {
    // Passadas 2 horas o pedido some daqui. Dizer isso é melhor que um erro
    // genérico: quem quis ajudar merece saber que chegou tarde, não que falhou.
    return responder(404, {
      error: 'Este pedido expirou ou já foi encerrado.',
      expirado: true,
    });
  }

  // O identificador da oferta nasce do aparelho de quem se ofereceu: aceitar
  // duas vezes a mesma pessoa não cria duas ofertas.
  const ofertaId = `of-${deviceId.slice(-8)}-${Date.now().toString(36)}`;
  const celulaDeQuemAjuda = posicao ? coarsenLocation(posicao) : null;

  if (pushToken) {
    await guardarOferta(pedidoId, {
      ofertaId,
      nome,
      moto: moto || undefined,
      pushToken,
      celula: celulaDeQuemAjuda,
      em: new Date().toISOString(),
    });
  }

  const { enviados } = await enviarPush([
    {
      to: destino,
      title: `${nome} pode te ajudar`,
      body: resposta,
      urgente: true,
      data: {
        tipo: 'resposta-socorro',
        pedidoId,
        ofertaId,
        nome,
        moto,
        // Quem se oferece também aparece de forma aproximada: a exposição é
        // dos dois lados até o pedinte aceitar.
        celula: celulaDeQuemAjuda,
        em: new Date().toISOString(),
      },
    },
  ]);

  return responder(200, { ok: true, ofertaId, entregue: enviados === 1 });
}

/**
 * Quem pediu escolhe uma pessoa, e só ela recebe o endereço exato.
 *
 * É AQUI que a promessa da tela vira mecanismo. Até este ponto todo mundo viu
 * apenas a célula de ~1 km. O ponto exato e o telefone saem do aparelho de
 * quem pediu, passam por aqui e vão para um único destino — nunca são
 * gravados. O servidor é carteiro, não arquivo.
 *
 * A checagem de quem está aceitando não é formalidade: sem ela, qualquer um
 * que soubesse o identificador do pedido poderia mandar um endereço falso a
 * quem se ofereceu, e despachar um socorrista para o lugar errado — ou para
 * uma emboscada.
 */
async function aceitarOferta(corpo: Corpo, deviceId: string, responder: Responder) {
  const pedidoId = textoCurto(corpo.pedidoId, 64);
  const ofertaId = textoCurto(corpo.ofertaId, 64);
  const precisa = lerPonto(corpo.precisa);
  const telefone = textoCurto(corpo.telefone, 24);
  const nome = textoCurto(corpo.nome, 40) || 'Quem pediu';
  const referencia = textoCurto(corpo.referencia, 140);

  if (!pedidoId || !ofertaId) {
    return responder(400, { error: 'pedidoId e ofertaId são obrigatórios.' });
  }

  const dono = await donoDoPedido(pedidoId);
  if (!dono) return responder(404, { error: 'Este pedido expirou ou já foi encerrado.', expirado: true });
  if (dono !== deviceId) {
    return responder(403, { error: 'Só quem abriu o pedido pode aceitar alguém.' });
  }

  const oferta = await acharOferta(pedidoId, ofertaId);
  if (!oferta) return responder(404, { error: 'Não encontrei essa oferta de ajuda.' });

  const { enviados } = await enviarPush([
    {
      to: oferta.pushToken,
      title: `${nome} aceitou sua ajuda`,
      body: referencia
        ? `${referencia}${telefone ? ` · ${telefone}` : ''}`
        : 'Toque para ver o endereço exato.',
      urgente: true,
      data: {
        tipo: 'aceito',
        pedidoId,
        nome,
        telefone: telefone || null,
        referencia: referencia || null,
        // O ponto EXATO, e só para esta pessoa.
        exato: precisa,
        em: new Date().toISOString(),
      },
    },
  ]);

  return responder(200, { ok: true, entregue: enviados === 1 });
}
