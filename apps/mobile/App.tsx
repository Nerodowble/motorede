import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
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
  GARAGEM_VAZIA,
  adotarRegistrosOrfaos,
  atualizarAtiva,
  escolherMoto,
  motoAtiva,
  registrosDaMoto,
  removerDaGaragem,
  salvarNaGaragem,
  type ConsumableCategory,
  type Garagem,
  type MaintenanceRecord,
  type Motorcycle,
  type RiderProfile,
} from '@motorede/shared';
import { useGoogleAuth } from './src/hooks/useGoogleAuth';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { ConvoyScreen } from './src/screens/ConvoyScreen';
import { MyMotorcycleScreen } from './src/screens/MyMotorcycleScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SocorroScreen } from './src/screens/SocorroScreen';
import { RoutesScreen } from './src/screens/RoutesScreen';
import { useSocorro } from './src/hooks/useSocorro';
import { storage } from './src/services/storage';
import { apagarImagem, limparProgresso } from './src/services/capaMoto';
import { DEV_ROOM_CODE } from './src/config';
import { useApkNovo } from './src/hooks/useApkNovo';
import { COLORS } from './src/theme';
import { BarraAbas, Cabecalho, type Aba } from './src/components/BarraAbas';
import { Botao } from './src/components/ui/Botao';

// Instala as APIs de WebRTC no ambiente do React Native. Precisa rodar uma vez,
// antes de qualquer uso do LiveKit.
registerGlobals();

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
  const socorro = useSocorro();

  const [aba, setAba] = useState<Aba>('comboio');
  const [estadoVoz, setEstadoVoz] = useState({ conectada: false, mudo: true });
  const [roomCode, setRoomCode] = useState(DEV_ROOM_CODE);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [garagem, setGaragem] = useState<Garagem>(GARAGEM_VAZIA);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [carregando, setCarregando] = useState(true);
  // APK novo é raro (só mudança nativa): avisa uma vez por versão ao abrir.
  useApkNovo({ avisarAoAbrir: true });

  // Tudo o que não é a tela Moto continua vendo "a moto": a que está em uso.
  const motorcycle = useMemo(() => motoAtiva(garagem), [garagem]);
  const registrosDaAtiva = useMemo(
    () => (motorcycle ? registrosDaMoto(records, motorcycle.id) : []),
    [records, motorcycle]
  );

  // A manutenção é DERIVADA do histórico, nunca guardada em paralelo.
  const maintenance = useMemo(
    () => (motorcycle ? summarizeMaintenance(registrosDaAtiva, motorcycle) : []),
    [registrosDaAtiva, motorcycle]
  );

  const trocarSala = useCallback((codigo: string) => {
    setRoomCode(codigo);
    void storage.saveLastRoom(codigo);
  }, []);

  useEffect(() => {
    void (async () => {
      const [perfil, gar, regs, sala] = await Promise.all([
        storage.getProfile(),
        storage.getGaragem(),
        storage.getRecords(),
        storage.getLastRoom(),
      ]);
      setProfile(perfil);
      setGaragem(gar);
      // Histórico gravado antes da garagem pode ter outro id de moto.
      const adotados = adotarRegistrosOrfaos(regs, gar);
      setRecords(adotados);
      if (adotados !== regs) void storage.saveRecords(adotados);
      // Salvo antes de 2026-11 vinha com hífen ("K7M-3PQ").
      if (sala) setRoomCode(normalizeRoomCode(sala) || DEV_ROOM_CODE);
      setCarregando(false);
    })();
    void pedirPermissaoMicrofone();
  }, []);

  // Convite por link: motorede://sala/K7M3PQ
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
    setEstadoVoz({ conectada: false, mudo: true });
    void auth.signOut();
    void storage.clearProfile();
    setProfile(null);
  }, [auth]);

  // Atualização funcional: registrar troca pode mudar intervalo e km no mesmo
  // toque, e cada um precisa partir do que o outro já gravou.
  const mudarGaragem = useCallback((mudar: (g: Garagem) => Garagem) => {
    setGaragem((atual) => {
      const nova = mudar(atual);
      if (nova !== atual) void storage.saveGaragem(nova);
      return nova;
    });
  }, []);

  /** Atualiza uma moto da garagem; uma moto nova entra e passa a ser a usada. */
  const salvarMoto = useCallback(
    (moto: Motorcycle) => mudarGaragem((g) => salvarNaGaragem(g, moto)),
    [mudarGaragem]
  );

  const usarMoto = useCallback((id: string) => mudarGaragem((g) => escolherMoto(g, id)), [mudarGaragem]);

  /** Apaga a moto com o histórico e a capa dela. */
  const apagarMoto = useCallback(
    (id: string) => {
      const moto = garagem.motos.find((m) => m.id === id);
      apagarImagem(moto?.coverImageUrl);
      void limparProgresso(id);
      mudarGaragem((g) => removerDaGaragem(g, id));
      setRecords((atuais) => {
        const restantes = atuais.filter((r) => r.motorcycleId !== id);
        void storage.saveRecords(restantes);
        return restantes;
      });
    },
    [garagem, mudarGaragem]
  );

  const atualizarKm = useCallback(
    (km: number) =>
      mudarGaragem((g) =>
        atualizarAtiva(g, (m) => ({ ...m, currentKm: km, lastKmUpdate: new Date().toISOString() }))
      ),
    [mudarGaragem]
  );

  const definirIntervalo = useCallback(
    (categoria: ConsumableCategory, km: number | null) =>
      mudarGaragem((g) =>
        atualizarAtiva(g, (m) => {
          const customIntervals = { ...m.customIntervals };
          if (km === null) delete customIntervals[categoria];
          else customIntervals[categoria] = km;
          return { ...m, customIntervals };
        })
      ),
    [mudarGaragem]
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

  /** Apaga trocas do histórico (as que ficaram acima do odômetro, de outra moto). */
  const apagarRegistros = useCallback((ids: string[]) => {
    setRecords((atuais) => {
      const restantes = atuais.filter((r) => !ids.includes(r.id));
      void storage.saveRecords(restantes);
      return restantes;
    });
  }, []);

  if (auth.isLoading || carregando) {
    return (
      <View style={[styles.screen, styles.centro]}>
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.ink} size="large" />
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

      {/* "Sair" foi para Ajustes: no cabeçalho ficava a um toque do polegar,
          sem confirmação, e apagava o perfil do aparelho. */}
      <Cabecalho
        topo={insets.top}
        nome={profile.name}
        verificado={profile.source === 'google'}
      />

      <View style={{ flex: 1 }}>
        {aba !== 'comboio' && estadoVoz.conectada && <Botao
          rotulo={`Comboio · Microfone ${estadoVoz.mudo ? 'mudo' : 'aberto'}`}
          accessibilityLabel={`Voltar ao comboio. Microfone ${estadoVoz.mudo ? 'mudo' : 'aberto'}`}
          icone={estadoVoz.mudo ? 'mic-off-outline' : 'mic-outline'}
          onPress={() => setAba('comboio')}
          style={{ marginHorizontal: 16, marginBottom: 8, borderColor: estadoVoz.mudo ? COLORS.lineStrong : COLORS.live }}
        />}
        {/* Consultar rotas ou abrir o navegador não encerra a sessão de voz. */}
        <View style={{ flex: 1, display: aba === 'comboio' ? 'flex' : 'none' }}>
          <ConvoyScreen
            roomCode={roomCode}
            onChangeRoom={trocarSala}
            displayName={profile.name}
            idToken={auth.getIdToken()}
            onEstadoVoz={setEstadoVoz}
          />
        </View>
        {aba === 'socorro' && (
          <SocorroScreen
            profile={profile}
            motoInfo={motorcycle ? `${motorcycle.brand} ${motorcycle.model}` : ''}
            rede={socorro.rede}
            entrando={socorro.entrando}
            posicao={socorro.posicao}
            chamados={socorro.chamados}
            meusPedidos={socorro.meusPedidos}
            onRegistrarPedido={socorro.registrarMeuPedido}
            onEncerrarPedido={(id) => void socorro.encerrarMeuPedido(id)}
            respostas={socorro.respostas}
            aceites={socorro.aceites}
            onAceita={socorro.marcarAceita}
            onEntrar={socorro.entrar}
            onSair={socorro.sair}
            onRespondido={socorro.marcarRespondido}
            onDispensar={socorro.dispensarChamado}
          />
        )}
        {aba === 'rotas' && <RoutesScreen motorcycle={motorcycle} />}
        {aba === 'moto' && (
          <MyMotorcycleScreen
            motorcycle={motorcycle}
            motos={garagem.motos}
            maintenance={maintenance}
            records={registrosDaAtiva}
            onAddRecord={adicionarRegistro}
            onUpdateKm={atualizarKm}
            onSaveMotorcycle={salvarMoto}
            onChooseMotorcycle={usarMoto}
            onDeleteMotorcycle={apagarMoto}
            onDeleteRecords={apagarRegistros}
            onSetInterval={definirIntervalo}
          />
        )}
        {aba === 'ajustes' && <SettingsScreen profile={profile} onSair={sair} />}
      </View>

      <BarraAbas
        aba={aba}
        aoEscolher={setAba}
        base={insets.bottom}
        sosAtivo={socorro.chamados.length > 0 || socorro.meusPedidos.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  centro: { alignItems: 'center', justifyContent: 'center' },
});
