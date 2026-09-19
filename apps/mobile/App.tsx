import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerGlobals } from '@livekit/react-native';
import {
  isJoinableRoomCode,
  normalizeRoomCode,
  profileFromGoogle,
  summarizeMaintenance,
  type MaintenanceRecord,
  type Motorcycle,
  type RiderProfile,
} from '@motorede/shared';
import { useGoogleAuth } from './src/hooks/useGoogleAuth';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { ConvoyScreen } from './src/screens/ConvoyScreen';
import { MyMotorcycleScreen } from './src/screens/MyMotorcycleScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { storage } from './src/services/storage';
import { DEV_ROOM_CODE } from './src/config';
import { COLORS } from './src/theme';

// Instala as APIs de WebRTC no ambiente do React Native. Precisa rodar uma vez,
// antes de qualquer uso do LiveKit.
registerGlobals();

type Aba = 'comboio' | 'moto' | 'ajustes';

const ABAS: Array<[Aba, string]> = [
  ['comboio', 'Comboio'],
  ['moto', 'Minha moto'],
  ['ajustes', 'Ajustes'],
];

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

/**
 * O provedor precisa envolver TUDO, porque é ele que mede as áreas que o
 * sistema operacional ocupa na tela. Sem ele, `useSafeAreaInsets` devolve zero
 * e a interface volta a ficar embaixo dos botões do aparelho.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <Aplicativo />
    </SafeAreaProvider>
  );
}

function Aplicativo() {
  const auth = useGoogleAuth();
  // O Android 15 desenha o app DE PONTA A PONTA: a barra de status em cima e os
  // botões de voltar/início embaixo ficam por cima do conteúdo, não ao lado
  // dele. Antes o app usava o `SafeAreaView` do react-native, que só faz efeito
  // no iOS — no Android ele é uma `View` comum. Por isso a barra de abas
  // aparecia atrás dos botões do celular. Estas medidas vêm do sistema e valem
  // nos dois.
  const insets = useSafeAreaInsets();

  const [aba, setAba] = useState<Aba>('comboio');
  const [roomCode, setRoomCode] = useState(DEV_ROOM_CODE);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
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
      const [perfil, moto, regs, sala] = await Promise.all([
        storage.getProfile(),
        storage.getMotorcycle(),
        storage.getRecords(),
        storage.getLastRoom(),
      ]);
      setProfile(perfil);
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

  // Entrar com o Google substitui o perfil local por um verificado: é o mesmo
  // piloto, agora com identidade que o servidor consegue conferir.
  useEffect(() => {
    if (!auth.user) return;
    const verificado = profileFromGoogle({
      sub: auth.user.idToken.split('.')[1],
      name: auth.user.name,
      email: auth.user.email,
    });
    setProfile((anterior) => {
      if (anterior?.source === 'google' && anterior.email === verificado.email) {
        return anterior;
      }
      const combinado = { ...verificado, phone: anterior?.phone ?? '' };
      void storage.saveProfile(combinado);
      return combinado;
    });
  }, [auth.user]);

  const salvarPerfil = useCallback((perfil: RiderProfile) => {
    setProfile(perfil);
    void storage.saveProfile(perfil);
  }, []);

  const sair = useCallback(() => {
    void auth.signOut();
    void storage.clearProfile();
    setProfile(null);
  }, [auth]);

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
      <View style={[styles.screen, styles.centro]}>
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  // Porta de entrada: um perfil, que pode ser local ou verificado pelo Google.
  // Perfil local não autentica nada, e não finge autenticar — serve para os
  // outros pilotos reconhecerem quem fala.
  if (!profile) {
    return (
      <>
        <StatusBar style="light" />
        <ProfileSetupScreen
          onSalvar={salvarPerfil}
          onEntrarComGoogle={auth.signIn}
          googleDisponivel={auth.isConfigured}
          erroGoogle={auth.error}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.cabecalho, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.marca}>MotoRede</Text>
          <Text style={styles.usuario}>
            {profile.name}
            {profile.source === 'google' ? ' · verificado' : ''}
          </Text>
        </View>
        <Pressable onPress={sair}>
          <Text style={styles.sair}>Sair</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {aba === 'comboio' && (
          <ConvoyScreen
            roomCode={roomCode}
            onChangeRoom={trocarSala}
            displayName={profile.name}
            idToken={auth.getIdToken()}
          />
        )}
        {aba === 'moto' && (
          <MyMotorcycleScreen
            motorcycle={motorcycle}
            maintenance={maintenance}
            records={records}
            onAddRecord={adicionarRegistro}
            onUpdateKm={atualizarKm}
            onSaveMotorcycle={salvarMoto}
          />
        )}
        {aba === 'ajustes' && <SettingsScreen profile={profile} onSair={sair} />}
      </View>

      {/* A barra guarda embaixo o espaço dos botões do aparelho. Onde o celular
          usa gestos em vez de botões, `insets.bottom` é pequeno ou zero, e o
          mínimo de 10 evita que os rótulos encostem na borda da tela. */}
      <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {ABAS.map(([id, rotulo]) => {
          const ativa = aba === id;
          return (
            <Pressable
              key={id}
              onPress={() => setAba(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={rotulo}
              style={styles.item}
            >
              {ativa && <View style={styles.indicador} />}
              <Text style={[styles.itemTexto, ativa && styles.itemAtivo]}>{rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
    paddingTop: 10,
  },
  // Alvo de toque com folga: o app é usado de luva, em movimento, com a moto
  // parada mas o corpo ainda instável.
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  itemTexto: { color: COLORS.faint, fontSize: 12, fontWeight: '700' },
  itemAtivo: { color: COLORS.accent },
  indicador: {
    position: 'absolute',
    top: -10,
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
  },
});
