import { Platform } from 'react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';

/**
 * Serviço em primeiro plano que mantém o canal de voz vivo com a tela
 * bloqueada.
 *
 * Sem ele, o Android suspende o processo assim que a tela apaga: o JavaScript
 * para de executar e o WebSocket de sinalização do LiveKit cai. A notificação
 * persistente que o usuário vê na barra não é enfeite — é a contrapartida que
 * o sistema exige para deixar o app continuar usando o microfone.
 *
 * No iOS nada disso é necessário: lá o equivalente são os `UIBackgroundModes`
 * declarados no app.json, tratados pelo próprio sistema.
 */

const NOTIFICATION_ID = 1;

/**
 * Tipos de serviço aceitos pelo pacote, conforme o `switch` em
 * `ForegroundService.java`. O `index.d.ts` do pacote está desatualizado e não
 * declara `ServiceType`, embora o código nativo o exija desde o Android 14 —
 * foi assim que o app compilou e mesmo assim quebrou em execução com
 * "ServiceType is required". Declaramos o contrato real aqui.
 */
type ForegroundServiceType =
  | 'camera'
  | 'connectedDevice'
  | 'dataSync'
  | 'health'
  | 'location'
  | 'mediaPlayback'
  | 'mediaProjection'
  | 'microphone'
  | 'phoneCall'
  | 'remoteMessaging'
  | 'shortService'
  | 'specialUse'
  | 'systemExempted';

type StartOptions = Parameters<typeof ReactNativeForegroundService.start>[0] & {
  ServiceType: ForegroundServiceType;
};

let isRegistered = false;
let isRunning = false;

function ensureRegistered() {
  if (isRegistered) return;
  ReactNativeForegroundService.register({
    config: {
      alert: false,
      onServiceErrorCallBack: () => {
        // Sem ação: o hook de voz já reage à queda da conexão.
      },
    },
  });
  isRegistered = true;
}

export async function startVoiceForegroundService(roomCode: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (isRunning) return;

  ensureRegistered();

  const options: StartOptions = {
    id: NOTIFICATION_ID,
    title: 'Comboio ativo',
    message: `Canal ${roomCode} · voz em segundo plano`,
    // Obrigatório a partir do Android 14, e o pacote aceita um único valor.
    // Escolhemos 'microphone' porque é a captura que o sistema bloqueia em
    // segundo plano; a reprodução do áudio dos outros pilotos não é barrada
    // pelo tipo do serviço — basta o processo continuar vivo, que é o que
    // este serviço garante. Precisa ser um dos tipos declarados no manifesto
    // por plugins/withVoiceForegroundService.js.
    ServiceType: 'microphone',
    icon: 'ic_launcher',
    importance: 'low', // sem som nem vibração a cada atualização
    visibility: 'public',
    color: '#f59e0b',
    setOnlyAlertOnce: 'true',
  };

  await ReactNativeForegroundService.start(options);

  isRunning = true;
}

export async function stopVoiceForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!isRunning) return;

  await ReactNativeForegroundService.stop();
  isRunning = false;
}
