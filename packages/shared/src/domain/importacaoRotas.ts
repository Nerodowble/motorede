import type { PedagioRota, PontoApoioRota, RotaCatalogo } from './rotas.js';

/** Tipos de parada aceitos na importação; os mesmos já usados no catálogo. */
export const TIPOS_PONTO_APOIO = ['posto_gasolina', 'mirante', 'restaurante', 'ponto_historico', 'hotel'] as const;
export const DIFICULDADES_ROTA = ['iniciante', 'intermediario', 'avancado'] as const;
export const DISTANCIA_MINIMA_ROTA_KM = 20;

const CAMPOS_ROTA = new Set([
  'id', 'nome', 'regiao', 'inicio', 'fim', 'distanciaKm', 'pavimento', 'curvas', 'trechoSemPostoKm',
  'pedagioIda', 'pedagios', 'pontosApoio', 'revisao', 'descricao', 'dificuldade', 'melhorEpoca',
  'observacoes', 'fontes', 'restricaoMoto',
]);

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const https = (v: unknown): v is string => typeof v === 'string' && /^https:\/\/[^\s]+$/i.test(v);
const listaTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(texto);

/**
 * Valida rotas novas no formato `RotaCatalogo` antes de entrarem no catálogo.
 * Reúne todos os erros para que a pesquisa possa ser corrigida de uma vez.
 */
export function validarRotasNovas(entrada: unknown, idsExistentes: Iterable<string>) {
  const erros: string[] = [];
  const rotas: RotaCatalogo[] = [];
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { rotas, erros: ['O arquivo deve conter um array JSON com pelo menos uma rota.'] };
  }
  const ids = new Set(idsExistentes);
  entrada.forEach((bruta, i) => {
    const rotulo = objeto(bruta) && texto(bruta.id) ? bruta.id : `rota #${i + 1}`;
    const falhas: string[] = [];
    const rota = lerRota(bruta, falhas);
    if (objeto(bruta) && texto(bruta.id)) {
      if (ids.has(bruta.id)) falhas.push(`id "${bruta.id}" já existe no catálogo ou no arquivo`);
      ids.add(bruta.id);
    }
    if (falhas.length) erros.push(...falhas.map((f) => `${rotulo}: ${f}`));
    else if (rota) rotas.push(rota);
  });
  return { rotas: erros.length ? [] : rotas, erros };
}

function lerLocal(v: unknown, campo: string, falhas: string[], comCidade: boolean) {
  if (!objeto(v)) { falhas.push(`${campo} ausente`); return null; }
  const { lat, lng } = v;
  // Faixa do território brasileiro: evita lat/lng trocadas ou com sinal errado.
  if (!numeroComSinal(lat) || lat < -34 || lat > 5.5 || !numeroComSinal(lng) || lng < -74 || lng > -34) {
    falhas.push(`${campo}: lat/lng fora do Brasil ou inválidas`);
    return null;
  }
  if (comCidade && !texto(v.cidade)) { falhas.push(`${campo}.cidade ausente`); return null; }
  return { lat, lng };
}
const numeroComSinal = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function lerRota(r: unknown, falhas: string[]): RotaCatalogo | null {
  if (!objeto(r)) { falhas.push('não é um objeto'); return null; }
  const extras = Object.keys(r).filter((k) => !CAMPOS_ROTA.has(k));
  if (extras.length) falhas.push(`campos desconhecidos: ${extras.join(', ')}`);

  if (!texto(r.id) || !/^[a-z0-9]+(-[a-z0-9]+)*-[a-z]{2}$/.test(r.id)) {
    falhas.push('id deve estar em kebab-case e terminar com a sigla do estado (ex.: serra-x-sc)');
  }
  if (!texto(r.nome)) falhas.push('nome ausente');
  if (!texto(r.regiao)) falhas.push('regiao ausente');
  const inicio = lerLocal(r.inicio, 'inicio', falhas, true);
  const fim = lerLocal(r.fim, 'fim', falhas, true);
  if (!numero(r.distanciaKm) || r.distanciaKm < DISTANCIA_MINIMA_ROTA_KM) {
    falhas.push(`distanciaKm deve ser de pelo menos ${DISTANCIA_MINIMA_ROTA_KM} km`);
  }
  if (!['asfalto', 'misto', 'terra'].includes(r.pavimento as string)) falhas.push('pavimento deve ser asfalto, misto ou terra');
  if (!['baixo', 'medio', 'alto'].includes(r.curvas as string)) falhas.push('curvas deve ser baixo, medio ou alto');
  if (!numero(r.trechoSemPostoKm) || (numero(r.distanciaKm) && r.trechoSemPostoKm > r.distanciaKm)) {
    falhas.push('trechoSemPostoKm deve ser >= 0 e não maior que distanciaKm');
  }

  const pedagios = lerPedagios(r, falhas);
  const pontosApoio = lerPontosApoio(r.pontosApoio, falhas);

  if (!texto(r.revisao) || !/^\d{4}-\d{2}-\d{2}$/.test(r.revisao) || Number.isNaN(Date.parse(r.revisao))) {
    falhas.push('revisao deve ser a data da pesquisa no formato AAAA-MM-DD');
  }
  if (r.dificuldade !== undefined && !DIFICULDADES_ROTA.includes(r.dificuldade as never)) {
    falhas.push(`dificuldade deve ser ${DIFICULDADES_ROTA.join(', ')}`);
  }
  for (const campo of ['descricao', 'melhorEpoca'] as const) {
    if (r[campo] !== undefined && !texto(r[campo])) falhas.push(`${campo} deve ser texto`);
  }
  if (!listaTextos(r.observacoes)) falhas.push('observacoes deve ser uma lista de textos (pode ser vazia)');
  if (!Array.isArray(r.fontes) || r.fontes.length < 2 || !r.fontes.every(https)) {
    falhas.push('fontes deve ter pelo menos 2 links https consultados');
  }
  if (r.restricaoMoto !== undefined && (!objeto(r.restricaoMoto) || !texto(r.restricaoMoto.motivo) || !https(r.restricaoMoto.fonte))) {
    falhas.push('restricaoMoto deve ter motivo e fonte https');
  }

  if (falhas.length || !inicio || !fim || !pontosApoio) return null;
  const local = r.inicio as Objeto;
  const destino = r.fim as Objeto;
  return {
    id: r.id as string, nome: (r.nome as string).trim(), regiao: (r.regiao as string).trim(),
    inicio: { cidade: (local.cidade as string).trim(), ...inicio },
    fim: { cidade: (destino.cidade as string).trim(), ...fim },
    distanciaKm: r.distanciaKm as number,
    pavimento: r.pavimento as RotaCatalogo['pavimento'], curvas: r.curvas as RotaCatalogo['curvas'],
    trechoSemPostoKm: r.trechoSemPostoKm as number,
    pedagioIda: r.pedagioIda as number | null,
    ...(pedagios !== undefined ? { pedagios } : {}),
    pontosApoio,
    revisao: r.revisao as string,
    ...(r.descricao !== undefined ? { descricao: r.descricao as string } : {}),
    ...(r.dificuldade !== undefined ? { dificuldade: r.dificuldade as string } : {}),
    ...(r.melhorEpoca !== undefined ? { melhorEpoca: r.melhorEpoca as string } : {}),
    observacoes: r.observacoes as string[],
    fontes: r.fontes as string[],
    ...(r.restricaoMoto !== undefined ? { restricaoMoto: r.restricaoMoto as RotaCatalogo['restricaoMoto'] } : {}),
  };
}

/** Zero só vale com a lista de praças explícita; senão a tarifa é desconhecida (null). */
function lerPedagios(r: Objeto, falhas: string[]): PedagioRota[] | undefined {
  const ida = r.pedagioIda;
  if (ida !== null && !numero(ida)) {
    falhas.push('pedagioIda deve ser número >= 0 ou null quando não confirmado');
    return undefined;
  }
  if (r.pedagios === undefined) {
    if (ida !== null) falhas.push('pedagios ausente: liste as praças, use [] se não há pedágio ou pedagioIda null se não confirmou');
    return undefined;
  }
  if (ida === null) { falhas.push('pedagios informado com pedagioIda null'); return undefined; }
  if (!Array.isArray(r.pedagios)) { falhas.push('pedagios deve ser uma lista'); return undefined; }
  const pedagios: PedagioRota[] = [];
  r.pedagios.forEach((p, i) => {
    if (!objeto(p) || !texto(p.nome) || !numero(p.valorMoto) || !['fisica', 'free_flow'].includes(p.sistema as string) ||
        (p.fonte !== undefined && !https(p.fonte))) {
      falhas.push(`pedagios[${i}] precisa de nome, valorMoto >= 0, sistema fisica|free_flow e fonte https opcional`);
      return;
    }
    pedagios.push({
      nome: p.nome.trim(), valorMoto: p.valorMoto, sistema: p.sistema as PedagioRota['sistema'],
      ...(p.fonte !== undefined ? { fonte: p.fonte as string } : {}),
    });
  });
  const soma = pedagios.reduce((s, p) => s + p.valorMoto, 0);
  if (pedagios.length === r.pedagios.length && Math.abs(soma - ida) >= 0.01) {
    falhas.push(`soma das praças (${soma.toFixed(2)}) diferente de pedagioIda (${ida.toFixed(2)})`);
  }
  return pedagios;
}

function lerPontosApoio(v: unknown, falhas: string[]): PontoApoioRota[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 12) {
    falhas.push('pontosApoio deve ter de 1 a 12 paradas');
    return null;
  }
  const pontos: PontoApoioRota[] = [];
  v.forEach((p, i) => {
    if (!objeto(p) || !texto(p.nome) || !TIPOS_PONTO_APOIO.includes(p.tipo as never) || !texto(p.descricao)) {
      falhas.push(`pontosApoio[${i}] precisa de nome, descricao e tipo (${TIPOS_PONTO_APOIO.join(', ')})`);
      return;
    }
    const coordenada = lerLocal(p, `pontosApoio[${i}]`, falhas, false);
    if (coordenada) pontos.push({ nome: p.nome.trim(), tipo: p.tipo as string, descricao: (p.descricao as string).trim(), ...coordenada });
  });
  if (!v.some((p) => objeto(p) && p.tipo === 'posto_gasolina')) falhas.push('pontosApoio precisa de pelo menos um posto_gasolina');
  return pontos.length === v.length ? pontos : null;
}
