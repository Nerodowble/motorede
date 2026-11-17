import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import {
  API_ULTIMA_RELEASE, INTERVALO_CONSULTA_APK_MS, LINK_APK, apkNovoDisponivel,
} from '@motorede/shared';

/**
 * Avisa quando há APK novo (ver packages/shared/src/domain/versaoApk.ts).
 *
 * Consulta o GitHub no máximo uma vez por dia e avisa UMA vez por versão ao
 * abrir o app; depois o aviso fica só em Ajustes. Mudança nativa é rara, e um
 * alerta repetido a cada abertura viraria ruído que o piloto aprende a fechar.
 */
const CHAVE_CONSULTA = 'motorede_apk_consulta'; // { em, tag }
const CHAVE_AVISADA = 'motorede_apk_avisada';

async function tagMaisRecente(forcar = false): Promise<string | null> {
  try {
    const salvo = JSON.parse((await AsyncStorage.getItem(CHAVE_CONSULTA)) || 'null') as { em: number; tag: string | null } | null;
    if (!forcar && salvo && Date.now() - salvo.em < INTERVALO_CONSULTA_APK_MS) return salvo.tag;
    const r = await fetch(API_ULTIMA_RELEASE, { headers: { Accept: 'application/vnd.github+json' } });
    const tag = r.ok ? ((await r.json()) as { tag_name?: string }).tag_name ?? null : salvo?.tag ?? null;
    await AsyncStorage.setItem(CHAVE_CONSULTA, JSON.stringify({ em: Date.now(), tag }));
    return tag;
  } catch {
    return null;
  }
}

export const baixarApk = () => void Linking.openURL(LINK_APK);

export function useApkNovo({ avisarAoAbrir = false } = {}) {
  const instalada = Updates.runtimeVersion;
  const [nova, setNova] = useState<string | null>(null);

  const conferir = useCallback(async (forcar = false) => {
    // Em desenvolvimento não há versão de APK para comparar.
    if (__DEV__ || !instalada) return null;
    const tag = await tagMaisRecente(forcar);
    const disponivel = apkNovoDisponivel(instalada, tag) ? tag!.replace(/^v/i, '') : null;
    setNova(disponivel);
    return disponivel;
  }, [instalada]);

  useEffect(() => {
    void conferir().then(async (versao) => {
      if (!avisarAoAbrir || !versao) return;
      if ((await AsyncStorage.getItem(CHAVE_AVISADA)) === versao) return;
      await AsyncStorage.setItem(CHAVE_AVISADA, versao);
      Alert.alert(
        `Versão ${versao} do app`,
        'Esta versão precisa ser instalada de novo (uma vez só): ela traz mudanças que a atualização automática não consegue levar. Seus dados ficam.',
        [
          { text: 'Depois', style: 'cancel' },
          { text: 'Baixar agora', onPress: baixarApk },
        ]
      );
    });
  }, [conferir, avisarAoAbrir]);

  return { instalada, nova, conferir };
}
