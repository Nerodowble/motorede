import type { IncomingMessage, ServerResponse } from 'node:http';
import { coarsenLocation } from '@motorede/shared';
import {
  vizinhosNoRaio,
  lembrarPedido,
  tokenDoPedinte,
  enviarPush,
  storeConfigured,
  lerPonto,
  textoCurto,
  type Recado,
} from './_sos.js';

/**
 * Toca o telefone de quem está perto — e devolve a resposta a quem pediu.
 *
 * O SERVIDOR NÃO GUARDA O PEDIDO.
 *
 * O texto, a moto, a conversa e o endereço exato ficam no aparelho de quem
 * pediu. Aqui só passa o que cabe numa notificação, e a única coisa retida é
 * para onde devolver a resposta — que vence em 2 horas.
 *
 * O QUE VAI NA NOTIFICAÇÃO
 *
 * A célula de ~1 km, nunca o ponto. Quem recebe calcula a distância no próprio
 * aparelho e decide se mostra. Um pedido de socorro diz "estou sozinho e parado
 * neste endereço", e é exatamente o que um assaltante quer: então o endereço
 * exato não entra aqui. Ele é entregue depois, pelo próprio pedinte, a quem ele
 * aceitar.
 */

type Acao = 'pedir' | 'responder';

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

  if (req.method !== 'POST') return responder(405, { error: 'Use POST.' });
  if (!storeConfigured()) {
    return responder(503, { error: 'Rede de socorro ainda não configurada no servidor.' });
  }

  const corpo = await lerCorpo(req);
  const acao = (textoCurto(corpo.acao, 16) || 'pedir') as Acao;
  const deviceId = textoCurto(corpo.deviceId, 64);
  if (!deviceId) return responder(400, { error: 'deviceId é obrigatório.' });

  try {
    if (acao === 'responder') return await responderPedido(corpo, responder);
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

async function responderPedido(corpo: Corpo, responder: Responder) {
  const pedidoId = textoCurto(corpo.pedidoId, 64);
  const nome = textoCurto(corpo.nome, 40) || 'Um piloto';
  const moto = textoCurto(corpo.moto, 60);
  const resposta = textoCurto(corpo.resposta, 200) || 'Posso ajudar.';
  const posicao = lerPonto(corpo.position);

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

  const { enviados } = await enviarPush([
    {
      to: destino,
      title: `${nome} pode te ajudar`,
      body: resposta,
      urgente: true,
      data: {
        tipo: 'resposta-socorro',
        pedidoId,
        nome,
        moto,
        // Quem se oferece também aparece de forma aproximada: a exposição é
        // dos dois lados até o pedinte aceitar.
        celula: posicao ? coarsenLocation(posicao) : null,
        em: new Date().toISOString(),
      },
    },
  ]);

  return responder(200, { ok: true, entregue: enviados === 1 });
}
