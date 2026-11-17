import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { fotoRecente, FOTO_GALERIA_MAX_HORAS, type CarimboPessoal } from '@motorede/shared';

/**
 * Carimbo pessoal da Rota Biker no app (regras em
 * packages/shared/src/domain/carimboPessoal.ts). Tudo fica no aparelho: a
 * lista no AsyncStorage e as fotos em Paths.document/carimbos.
 */

const CHAVE = 'motorede_carimbos';

export async function lerCarimbos(): Promise<CarimboPessoal[]> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    const lista = bruto ? (JSON.parse(bruto) as CarimboPessoal[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function gravarCarimbos(lista: CarimboPessoal[]): Promise<void> {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(lista));
}

const pasta = () => {
  const dir = new Directory(Paths.document, 'carimbos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

/** Copia para a pasta do app: o URI da câmera/galeria é temporário. */
export async function guardarFoto(uri: string, monumento: number): Promise<string> {
  const destino = new File(pasta(), `monumento-${monumento}-${Date.now()}.jpg`);
  await new File(uri).copy(destino);
  return destino.uri;
}

export function apagarFoto(uri: string) {
  if (!uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // já não existe
  }
}

export type PosicaoAtual = { lat: number; lng: number; precisaoM: number | null };

/** Posição de AGORA, com GPS em alta precisão. Nunca a última conhecida. */
export async function posicaoAtual(): Promise<PosicaoAtual> {
  const permissao = await Location.requestForegroundPermissionsAsync();
  if (permissao.status !== 'granted') throw new Error('Permita a localização: o carimbo usa a sua posição de agora.');
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: p.coords.latitude, lng: p.coords.longitude, precisaoM: p.coords.accuracy ?? null };
}

export type ResultadoFoto =
  | { ok: true; uri: string }
  | { ok: false; motivo: 'cancelada' }
  | { ok: false; motivo: 'antiga'; mensagem: string };

/**
 * Foto do momento. Com a câmera liberada (APK a partir da permissão CAMERA no
 * app.json), abre a câmera. Nos APKs antigos a permissão está bloqueada e o
 * pedido volta negado na hora: cai na galeria, aceitando só foto tirada nas
 * últimas horas, pela data gravada na própria foto (EXIF).
 */
export async function tirarFoto(): Promise<ResultadoFoto> {
  let cameraLiberada = false;
  try {
    cameraLiberada = (await ImagePicker.requestCameraPermissionsAsync()).granted;
  } catch {
    cameraLiberada = false;
  }

  if (cameraLiberada) {
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    return r.canceled || !r.assets[0] ? { ok: false, motivo: 'cancelada' } : { ok: true, uri: r.assets[0].uri };
  }

  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, exif: true });
  const foto = r.canceled ? undefined : r.assets[0];
  if (!foto) return { ok: false, motivo: 'cancelada' };
  const exif = foto.exif as Record<string, unknown> | null | undefined;
  const data = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  if (!fotoRecente(data)) {
    return {
      ok: false,
      motivo: 'antiga',
      mensagem: `Escolha uma foto tirada aqui, nas últimas ${FOTO_GALERIA_MAX_HORAS} horas. Tire a foto com a câmera do celular e depois escolha ela aqui.`,
    };
  }
  return { ok: true, uri: foto.uri };
}
