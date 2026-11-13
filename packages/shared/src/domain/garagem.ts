import type { MaintenanceRecord, Motorcycle } from '../types.js';

/**
 * Garagem: as motos do piloto e qual delas ele está usando.
 *
 * Antes havia UMA moto por piloto e nenhum jeito de trocá-la — quem vendia a
 * PCX e comprava outra ficava preso à PCX. Agora cada moto guarda o próprio
 * histórico (MaintenanceRecord.motorcycleId), e a tela mostra só o da ativa.
 *
 * Funções puras: a gravação fica com quem chama (AsyncStorage no app,
 * localStorage na web).
 */
export interface Garagem {
  motos: Motorcycle[];
  /** null só quando a garagem está vazia. */
  ativaId: string | null;
}

export const GARAGEM_VAZIA: Garagem = { motos: [], ativaId: null };

/** Converte o formato antigo (uma moto só) na garagem. */
export function garagemDeLegado(moto: Motorcycle | null): Garagem {
  return moto ? { motos: [moto], ativaId: moto.id } : GARAGEM_VAZIA;
}

export function motoAtiva(g: Garagem): Motorcycle | null {
  return g.motos.find((m) => m.id === g.ativaId) ?? g.motos[0] ?? null;
}

/** Atualiza a moto se ela já existe; se é nova, entra na garagem e vira a ativa. */
export function salvarNaGaragem(g: Garagem, moto: Motorcycle): Garagem {
  const existe = g.motos.some((m) => m.id === moto.id);
  if (existe) {
    return { ...g, motos: g.motos.map((m) => (m.id === moto.id ? moto : m)) };
  }
  return { motos: [...g.motos, moto], ativaId: moto.id };
}

/** Aplica uma mudança na moto ativa. Sem moto, devolve a garagem como está. */
export function atualizarAtiva(g: Garagem, mudar: (m: Motorcycle) => Motorcycle): Garagem {
  const atual = motoAtiva(g);
  return atual ? salvarNaGaragem(g, mudar(atual)) : g;
}

export function escolherMoto(g: Garagem, id: string): Garagem {
  return g.motos.some((m) => m.id === id) ? { ...g, ativaId: id } : g;
}

/** Tira a moto. Se era a ativa, a primeira que sobrar assume. */
export function removerDaGaragem(g: Garagem, id: string): Garagem {
  const motos = g.motos.filter((m) => m.id !== id);
  const ativaId = g.ativaId === id || !motos.some((m) => m.id === g.ativaId)
    ? motos[0]?.id ?? null
    : g.ativaId;
  return { motos, ativaId };
}

export function registrosDaMoto(records: MaintenanceRecord[], motoId: string): MaintenanceRecord[] {
  return records.filter((r) => r.motorcycleId === motoId);
}

/**
 * Registros sem dono conhecido (gravados antes da garagem, com outro id) ficam
 * com a moto, mas só quando há uma moto só — com várias não dá para adivinhar.
 */
export function adotarRegistrosOrfaos(records: MaintenanceRecord[], g: Garagem): MaintenanceRecord[] {
  if (g.motos.length !== 1) return records;
  const dono = g.motos[0].id;
  return records.some((r) => r.motorcycleId !== dono)
    ? records.map((r) => (r.motorcycleId === dono ? r : { ...r, motorcycleId: dono }))
    : records;
}

/** "Honda PCX 160 · 2022", ou o apelido na frente quando houver. */
export function nomeDaMoto(m: Pick<Motorcycle, 'brand' | 'model' | 'year' | 'nickname'>): string {
  const base = `${m.brand} ${m.model}`.trim();
  return m.nickname ? `${m.nickname} (${base})` : base;
}
