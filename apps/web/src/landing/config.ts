/**
 * Endereços e versão usados pela página de divulgação (/baixar/).
 *
 * LINK DO APK — é o ÚNICO lugar para trocar.
 *
 * O APK é distribuído por download direto, não pela Play Store, e nunca vai
 * para o git (é binário, pesado e muda a cada build). Ele fica anexado a uma
 * release do GitHub com o nome fixo `MotoRede.apk`. O caminho
 * `releases/latest/download/<arquivo>` sempre aponta para o anexo da release
 * mais recente, então o link compartilhado no WhatsApp não muda quando sai
 * uma versão nova: basta publicar a release nova com o mesmo nome de arquivo.
 * Passo a passo em docs/desenvolvimento.md ("Página de divulgação").
 */
export const LINK_APK = 'https://github.com/Nerodowble/motorede/releases/latest/download/MotoRede.apk';

/** Repositório público, citado no rodapé. */
export const LINK_GITHUB = 'https://github.com/Nerodowble/motorede';

/** Onde o piloto de teste pode relatar problema ou sugestão. */
export const LINK_RETORNO = 'https://github.com/Nerodowble/motorede/issues';

/** O app web (PWA) — caminho para iPhone e para quem não quer instalar. */
export const LINK_APP_WEB = '/';

/**
 * Versão do app nativo, lida de `apps/mobile/app.json` no build
 * (`define` em vite.config.ts). Vem `null` se a leitura falhar; nesse caso a
 * página simplesmente não mostra versão, em vez de mostrar uma inventada.
 */
declare const __MOTOREDE_VERSAO_APP__: string | null;
export const VERSAO_APP: string | null = __MOTOREDE_VERSAO_APP__;
