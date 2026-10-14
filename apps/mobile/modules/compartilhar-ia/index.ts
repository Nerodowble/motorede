import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface ModuloCompartilharIa {
  instalado(pacote: string): boolean;
  enviarImagem(pacote: string, contentUri: string, texto: string | null): Promise<void>;
}

/** Só existe no Android e a partir do APK que o inclui; antes disso é null. */
const nativo = Platform.OS === 'android' ? requireOptionalNativeModule<ModuloCompartilharIa>('CompartilharIa') : null;

export const PACOTES_IA = {
  gemini: 'com.google.android.apps.bard',
  chatgpt: 'com.openai.chatgpt',
  metaai: 'com.facebook.stella',
} as const;

export function iaInstalada(pacote: string): boolean | null {
  if (!nativo) return null;
  try { return nativo.instalado(pacote); } catch { return null; }
}

/** false quando não deu para enviar direto (sem módulo ou app ausente). */
export async function enviarImagemParaIa(pacote: string, contentUri: string, texto: string | null): Promise<boolean> {
  if (!nativo) return false;
  try { await nativo.enviarImagem(pacote, contentUri, texto); return true; } catch { return false; }
}
