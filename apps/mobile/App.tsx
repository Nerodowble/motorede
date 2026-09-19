import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerGlobals } from '@livekit/react-native';
import {
  isJoinableRoomCode,
  normalizeRoomCode,
  summarizeMaintenance,
  type MaintenanceRecord,
  type Motorcycle,
} from '@motorede/shared';
import { useGoogleAuth } from './src/hooks/useGoogleAuth';
import { LoginScreen } from './src/screens/LoginScreen';
import { ConvoyScreen } from './src/screens/ConvoyScreen';
import { MyMotorcycleScreen } from './src/screens/MyMotorcycleScreen';
import { storage } from './src/services/storage';
import { DEV_ROOM_CODE } from './src/config';
import { COLORS } from './src/theme';

// Instala as APIs de WebRTC no ambiente do React Native. Precisa rodar uma vez,
// antes de qualquer uso do LiveKit.
registerGlobals();

type Aba = 'comboio' | 'moto';

async function pedirPermissaoMicrofone(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const concedida = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microfone',
      message: 'O MotoRede precisa do microfone para a conversa do comboio.',
      buttonPositive: 'Permitir',
    }
  );
  return concedida === PermissionsAndroid.RESULTS.GRANTED;
}

export default function App() {
  const auth = useGoogleAuth();

  const [aba, setAba] = useState<Aba>('comboio');
  const [roomCode, setRoomCode] = useState(DEV_ROOM_CODE);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [carregando, setCarregando] = useState(true);

  // A manutenção é DERIVADA do histórico, nunca guardada em paralelo.
  const maintenance = useMemo(
    () => (motorcycle ? summarizeMaintenance(records, motorcycle) : []),
    [records, motorcycle]
  );

  const trocarSala = useCallback((codigo: string) => {
    setRoomCode(codigo);
    void storage.saveLastRoom(codigo);
  }, []);

  useEffect(() => {
    void (async () => {
      const [moto, regs, sala] = await Promise.all([
        storage.getMotorcycle(),
        storage.getRecords(),
        storage.getLastRoom(),
      ]);
      setMotorcycle(moto);
      setRecords(regs);
      if (sala) setRoomCode(sala);
      setCarregando(false);
    })();
    void pedirPermissaoMicrofone();
  }, []);

  // Convite por link: motorede://sala/K7M-3PQ
  useEffect(() => {
    const aplicar = (url: string | null) => {
      if (!url) return;
      const m = url.match(/(?:[?&]sala=|sala\/)([^&?/#]+)/i);
      if (!m) return;
      const normalizado = normalizeRoomCode(decodeURIComponent(m[1]));
      if (isJoinableRoomCode(normalizado)) trocarSala(normalizado);
    };
    void Linking.getInitialURL().then(aplicar);
    const sub = Linking.addEventListener('url', ({ url }) => aplicar(url));
    return () => sub.remove();
  }, [trocarSala]);

  const salvarMoto = useCallback((moto: Motorcycle) => {
    setMotorcycle(moto);
    void storage.saveMotorcycle(moto);
  }, []);

  const atualizarKm = useCallback(
    (km: number) => {
      if (!motorcycle) return;
      const atualizada = { ...motorcycle, currentKm: km, lastKmUpdate: new Date().toISOString() };
      setMotorcycle(atualizada);
      void storage.saveMotorcycle(atualizada);
    },
    [motorcycle]
  );

  const adicionarRegistro = useCallback(
    (dados: Omit<MaintenanceRecord, 'id'>) => {
      const novo: MaintenanceRecord = { ...dados, id: `rec-${Date.now()}` };
      const proximos = [novo, ...records];
      setRecords(proximos);
      void storage.saveRecords(proximos);
    },
    [records]
  );

  if (auth.isLoading || carregando) {
    return (
      <SafeAreaView style={[styles.screen, styles.centro]}>
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  // Porta de entrada. Se o login não estiver configurado neste build, o app
  // segue sem identidade em vez de ficar inacessível.
  if (auth.isConfigured && !auth.user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onSignIn={auth.signIn} error={auth.error} isLoading={false} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <View style={{ flex: 1 }}>
          <Text style={styles.marca}>MotoRede</Text>
          {auth.user && <Text style={styles.usuario}>{auth.user.name}</Text>}
        </View>
        {auth.user && (
          <Pressable onPress={auth.signOut}>
            <Text style={styles.sair}>Sair</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {aba === 'comboio' ? (
          <ConvoyScreen
            roomCode={roomCode}
            onChangeRoom={trocarSala}
            displayName={auth.user?.name ?? 'Piloto'}
            idToken={auth.getIdToken()}
          />
        ) : (
          <MyMotorcycleScreen
            motorcycle={motorcycle}
            maintenance={maintenance}
            records={records}
            onAddRecord={adicionarRegistro}
            onUpdateKm={atualizarKm}
            onSaveMotorcycle={salvarMoto}
          />
        )}
      </View>

      {/* Duas abas apenas. O app é usado na moto; tudo que não serve para isso
          fica na web. */}
      <View style={styles.barra}>
        {(
          [
            ['comboio', 'Comboio'],
            ['moto', 'Minha moto'],
          ] as Array<[Aba, string]>
        ).map(([id, rotulo]) => (
          <Pressable key={id} onPress={() => setAba(id)} style={styles.item}>
            <Text style={[styles.itemTexto, aba === id && styles.itemAtivo]}>
              {rotulo}
            </Text>
            {aba === id && <View style={styles.indicador} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centro: { alignItems: 'center', justifyContent: 'center' },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  marca: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  usuario: { color: COLORS.faint, fontSize: 11 },
  sair: { color: COLORS.muted, fontSize: 12 },
  barra: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  itemTexto: { color: COLORS.faint, fontSize: 12, fontWeight: '700' },
  itemAtivo: { color: COLORS.accent },
  indicador: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 2,
    backgroundColor: COLORS.accent,
  },
});
