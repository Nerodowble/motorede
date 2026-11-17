import type { CarimboPessoal } from '@motorede/shared';

/**
 * Carimbo pessoal da Rota Biker na web (regras em
 * packages/shared/src/domain/carimboPessoal.ts).
 *
 * A lista vai no localStorage; as fotos no IndexedDB. Foto em base64 no
 * localStorage estouraria os ~5 MB do Safari em poucos carimbos — e a capa da
 * moto já disputa esse espaço.
 */

const CHAVE = 'motorede_carimbos';
const BANCO = 'motorede-carimbos';
const LOJA = 'fotos';

export function lerCarimbos(): CarimboPessoal[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function gravarCarimbos(lista: CarimboPessoal[]): void {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function naLoja<T>(modo: IDBTransactionMode, agir: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const banco = await abrirBanco();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = agir(banco.transaction(LOJA, modo).objectStore(LOJA));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    banco.close();
  }
}

export const guardarFoto = (chave: string, foto: Blob) => naLoja('readwrite', (l) => l.put(foto, chave));
export const lerFoto = (chave: string) => naLoja<Blob | undefined>('readonly', (l) => l.get(chave));
export const apagarFoto = (chave: string) => naLoja('readwrite', (l) => l.delete(chave));

/**
 * Reduz a foto da câmera (vários MB) para no máximo 1280 px, em JPEG. Basta
 * para lembrar do lugar e cabe às centenas no IndexedDB.
 */
export async function reduzirFoto(arquivo: File, lado = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', 0.8)
  );
}

export type PosicaoAtual = { lat: number; lng: number; precisaoM: number | null; em: number };

/** Posição de AGORA (maximumAge 0): nunca a última conhecida. */
export function posicaoAtual(): Promise<PosicaoAtual> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sem-gps'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisaoM: p.coords.accuracy ?? null, em: Date.now() }),
      (e) => reject(new Error(e.code === 1 ? 'negado' : 'falhou')),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  });
}
