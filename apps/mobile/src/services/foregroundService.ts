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

  await ReactNativeForegroundService.start({
    id: NOTIFICATION_ID,
    title: 'Comboio ativo',
    message: `Canal ${roomCode} · voz em segundo plano`,
    icon: 'ic_launcher',
    importance: 'low', // sem som nem vibração a cada atualização
    visibility: 'public',
    color: '#f59e0b',
    setOnlyAlertOnce: 'true',
  });

  isRunning = true;
}

export async function stopVoiceForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!isRunning) return;

  await ReactNativeForegroundService.stop();
  isRunning = false;
}
