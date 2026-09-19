const {
  AndroidConfig,
  withAndroidManifest,
  withAndroidColors,
} = require('expo/config-plugins');

/**
 * Plugin de configuração: serviço em primeiro plano para a voz do comboio.
 *
 * POR QUE ISSO EXISTE
 *
 * No Android, quando a tela bloqueia, o sistema suspende o processo do app.
 * O React Native para de executar JavaScript, e a conexão de sinalização do
 * LiveKit (um WebSocket mantido em JS) cai — o sintoma é exatamente
 * "ConnectionError / reasonName: WebSocket" ao bloquear o aparelho.
 *
 * A única forma de manter o processo vivo é um **serviço em primeiro plano**.
 * E desde o Android 14 ele precisa declarar seu tipo: `microphone` para
 * continuar captando a sua voz, `mediaPlayback` para continuar tocando a dos
 * outros. Faltando um dos dois, metade do intercomunicador morre.
 *
 * Nem o @livekit/react-native nem o @livekit/react-native-webrtc fornecem esse
 * serviço (o MediaProjectionService que existe ali é para captura de tela).
 * Usamos o @supersami/rn-foreground-service, que é o mesmo que o app de
 * exemplo do LiveKit usa.
 *
 * Aquele pacote tenta editar o AndroidManifest por um script de postinstall,
 * o que não funciona aqui: o Expo regenera o manifesto a cada prebuild e a
 * edição se perde. Este plugin faz a mesma coisa do jeito certo.
 */

const SERVICES = [
  {
    name: 'com.supersami.foregroundservice.ForegroundService',
    // Os dois tipos: falar e ouvir.
    types: 'microphone|mediaPlayback',
  },
  {
    name: 'com.supersami.foregroundservice.ForegroundServiceTask',
    types: 'microphone|mediaPlayback',
  },
];

const NOTIFICATION_COLOR = '#f59e0b'; // âmbar da identidade do MotoRede

function withVoiceForegroundServiceManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    application.service = application.service || [];
    application['meta-data'] = application['meta-data'] || [];

    for (const service of SERVICES) {
      const existing = application.service.find(
        (s) => s.$?.['android:name'] === service.name
      );
      const attributes = {
        'android:name': service.name,
        'android:exported': 'false',
        'android:foregroundServiceType': service.types,
      };

      if (existing) {
        existing.$ = { ...existing.$, ...attributes };
      } else {
        application.service.push({ $: attributes });
      }
    }

    const metadata = [
      {
        name: 'com.supersami.foregroundservice.notification_channel_name',
        value: 'Comboio por voz',
      },
      {
        name: 'com.supersami.foregroundservice.notification_channel_description',
        value: 'Mantém o canal de voz ativo com a tela bloqueada.',
      },
    ];

    for (const item of metadata) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        application,
        item.name,
        item.value
      );
    }

    // A cor da notificação é referenciada como recurso, não como literal.
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'com.supersami.foregroundservice.notification_color',
      '@color/motoredeNotification',
      'resource'
    );

    return cfg;
  });
}

function withVoiceForegroundServiceColor(config) {
  return withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'motoredeNotification',
      value: NOTIFICATION_COLOR,
    });
    return cfg;
  });
}

module.exports = function withVoiceForegroundService(config) {
  return withVoiceForegroundServiceColor(withVoiceForegroundServiceManifest(config));
};
