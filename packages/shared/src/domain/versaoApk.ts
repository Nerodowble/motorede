/**
 * Aviso de APK novo dentro do app.
 *
 * Quase tudo chega pela atualização OTA (expo-updates), sem instalar nada. Só
 * mudança nativa (permissão nova, biblioteca nativa nova) exige APK novo, e
 * isso é raro — justamente por ser raro o piloto não fica sabendo. O app
 * compara a versão nativa instalada (`Updates.runtimeVersion`, que segue a
 * `version` do app.json pela política appVersion) com a release mais recente
 * do GitHub, onde o APK é publicado (docs/desenvolvimento.md, "Página de
 * divulgação").
 */

/** Link fixo do APK: sempre o anexo da release mais recente. */
export const LINK_APK = 'https://github.com/Nerodowble/motorede/releases/latest/download/MotoRede.apk';

/** API pública do GitHub (sem conta, 60 consultas/hora por IP). */
export const API_ULTIMA_RELEASE = 'https://api.github.com/repos/Nerodowble/motorede/releases/latest';

/** Consulta no máximo uma vez por dia por aparelho. */
export const INTERVALO_CONSULTA_APK_MS = 24 * 60 * 60 * 1000;

/** "v0.4.0" ou "0.4.0" → [0, 4, 0]. null se não for uma versão. */
export function lerVersao(texto: string | null | undefined): number[] | null {
  const m = texto?.trim().match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/** Negativo se a < b, zero se iguais, positivo se a > b. */
export function compararVersoes(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * A versão publicada (tag da release) é mais nova que a instalada? Qualquer
 * dado ilegível volta false: na dúvida, não incomodar o piloto.
 */
export function apkNovoDisponivel(instalada: string | null | undefined, publicada: string | null | undefined): boolean {
  const a = lerVersao(instalada);
  const b = lerVersao(publicada);
  return !!a && !!b && compararVersoes(b, a) > 0;
}
