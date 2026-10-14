import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { IAS_CAPA, type IaCapa } from '@motorede/shared';
import { enviarImagemParaIa, iaInstalada } from '../../modules/compartilhar-ia';

/**
 * Capa da moto no app: escolher foto, entregar à IA do piloto e guardar a
 * imagem que ele trouxer de volta. Ver packages/shared/src/domain/capaMoto.ts.
 *
 * Tudo fica no aparelho (Paths.document/capas): a capa ainda não sincroniza,
 * como o resto da moto.
 */

const pasta = () => {
  const dir = new Directory(Paths.document, 'capas');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

/** Galeria pelo seletor do sistema: não pede permissão de fotos nem de câmera. */
export async function escolherDaGaleria(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  return r.canceled ? null : r.assets[0]?.uri ?? null;
}

/** Copia para a pasta do app: o URI da galeria pode sumir, e a IA precisa de um content://. */
export async function guardarImagem(uri: string, nome: string): Promise<string> {
  const destino = new File(pasta(), `${nome}-${Date.now()}.jpg`);
  await new File(uri).copy(destino);
  return destino.uri;
}

export function apagarImagem(uri: string | undefined) {
  if (!uri?.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // arquivo já não existe: nada a fazer
  }
}

export async function copiarPrompt(prompt: string) {
  await Clipboard.setStringAsync(prompt);
}

/** null quando não dá para saber (iOS ou APK sem o módulo). */
export function estaInstalada(ia: IaCapa): boolean | null {
  const pacote = IAS_CAPA.find((i) => i.id === ia)?.pacoteAndroid;
  return pacote ? iaInstalada(pacote) : null;
}

export type ResultadoEnvio = 'direto' | 'lista' | 'falhou';

/**
 * Copia o prompt e manda a foto para a IA. No Android vai direto ao app
 * escolhido; sem ele (ou no iOS), abre a lista de compartilhar do sistema.
 * O prompt vai sempre para a área de transferência: nenhum dos três apps
 * garante aproveitar o texto que acompanha a imagem.
 */
export async function enviarParaIa(fotoUri: string, ia: IaCapa, prompt: string): Promise<ResultadoEnvio> {
  await copiarPrompt(prompt);
  const opcao = IAS_CAPA.find((i) => i.id === ia)!;
  if (Platform.OS === 'android') {
    const contentUri = new File(fotoUri).contentUri;
    if (await enviarImagemParaIa(opcao.pacoteAndroid, contentUri, opcao.enviaTexto ? prompt : null)) return 'direto';
  }
  if (!(await Sharing.isAvailableAsync())) return 'falhou';
  await Sharing.shareAsync(fotoUri, { mimeType: 'image/jpeg', dialogTitle: `Enviar para o ${opcao.nome}`, UTI: 'public.jpeg' });
  return 'lista';
}

export async function abrirLoja(ia: IaCapa) {
  const opcao = IAS_CAPA.find((i) => i.id === ia)!;
  const loja = `market://details?id=${opcao.pacoteAndroid}`;
  if (Platform.OS === 'android' && (await Linking.canOpenURL(loja).catch(() => false))) return Linking.openURL(loja);
  return Linking.openURL(Platform.OS === 'android' ? `https://play.google.com/store/apps/details?id=${opcao.pacoteAndroid}` : opcao.urlWeb);
}

/* Progresso do assistente: o Android pode fechar o MotoRede enquanto o piloto está na IA. */

export type PassoCapa = 'convite' | 'foto' | 'ia' | 'naIa' | 'gerada' | 'pronto';

export interface ProgressoCapa {
  passo: PassoCapa;
  fotoUri?: string;
  ia?: IaCapa;
  geradaUri?: string;
}

const chave = (motoId: string) => `motorede_capa_assistente:${motoId}`;

export async function lerProgresso(motoId: string): Promise<ProgressoCapa | null> {
  try {
    const bruto = await AsyncStorage.getItem(chave(motoId));
    return bruto ? (JSON.parse(bruto) as ProgressoCapa) : null;
  } catch {
    return null;
  }
}

export async function salvarProgresso(motoId: string, p: ProgressoCapa) {
  await AsyncStorage.setItem(chave(motoId), JSON.stringify(p)).catch(() => {});
}

export async function limparProgresso(motoId: string) {
  await AsyncStorage.removeItem(chave(motoId)).catch(() => {});
}
