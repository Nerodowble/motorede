import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { validateRequest, type GeoPoint, type RiderProfile } from '@motorede/shared';
import { pedirSocorro, responderChamado, aceitarAjuda } from '../services/socorro';
import type {
  ChamadoRecebido,
  RespostaRecebida,
  MeuPedido,
  AceiteRecebido,
} from '../hooks/useSocorro';
import type { EstadoRede } from '../services/socorro';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../theme';
import { Botao, type NomeIcone } from '../components/ui/Botao';
import { Ajuda, Campo, Cartao, Rotulo, TituloCartao, estilosBase } from '../components/ui/Cartao';
import {
  CartaoAceites,
  CartaoChamados,
  CartaoMeusPedidos,
  CartaoRespostas,
} from '../components/socorro/CartoesSocorro';

/**
 * Pedir ajuda, e atender quem pede.
 *
 * O QUE ESTA TELA NÃO PROMETE
 *
 * Ela não diz "alerta enviado". Diz quantos aparelhos havia no raio e quantos
 * receberam — números que vêm do servidor. A versão web disto já anunciou
 * "Localização GPS transmitida com sucesso" enquanto nada saía do aparelho, e
 * o estrago de uma frase dessas num pedido de socorro é de outra ordem: a
 * pessoa para de procurar ajuda porque acredita que já conseguiu.
 *
 * Também não promete cobertura que não existe: quem está na rede é quem abriu
 * o app na última hora, e isso está escrito na tela, não escondido.
 */

const EMERGENCIAS: Array<{ id: string; rotulo: string; leva: string; icone: NomeIcone }> = [
  { id: 'flat_tire', rotulo: 'Pneu furado', leva: 'kit macarrão, bomba', icone: 'disc-outline' },
  { id: 'mechanical_breakdown', rotulo: 'Pane mecânica', leva: 'ferramentas', icone: 'construct-outline' },
  { id: 'out_of_fuel', rotulo: 'Sem combustível', leva: 'galão, mangueira', icone: 'water-outline' },
  { id: 'electrical_battery', rotulo: 'Bateria', leva: 'cabo de chupeta', icone: 'battery-dead-outline' },
  { id: 'accident_fall', rotulo: 'Queda / acidente', leva: 'avisa todo mundo na hora', icone: 'alert-circle-outline' },
];

const RAIOS = [5, 10, 15, 25];

interface SocorroScreenProps {
  profile: RiderProfile;
  motoInfo: string;
  rede: EstadoRede;
  entrando: boolean;
  posicao: GeoPoint | null;
  chamados: ChamadoRecebido[];
  meusPedidos: MeuPedido[];
  onRegistrarPedido: (p: MeuPedido) => void;
  onEncerrarPedido: (pedidoId: string) => void;
  respostas: RespostaRecebida[];
  aceites: AceiteRecebido[];
  onAceita: (ofertaId: string) => void;
  onEntrar: () => Promise<EstadoRede>;
  onSair: () => Promise<void>;
  onRespondido: (pedidoId: string) => void;
  onDispensar: (pedidoId: string) => void;
}

export const SocorroScreen: React.FC<SocorroScreenProps> = ({
  profile,
  motoInfo,
  rede,
  entrando,
  posicao,
  chamados,
  meusPedidos,
  onRegistrarPedido,
  onEncerrarPedido,
  respostas,
  aceites,
  onAceita,
  onEntrar,
  onSair,
  onRespondido,
  onDispensar,
}) => {
  const [tipo, setTipo] = useState<'emergencia' | 'apoio'>('emergencia');
  const [emergencia, setEmergencia] = useState(EMERGENCIAS[0].id);
  const [referencia, setReferencia] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [raioKm, setRaioKm] = useState(15);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Começa com o do perfil, mas é editável: o telefone do cadastro pode estar
  // velho, ou você pode querer dar o número de quem está com você, ou o do
  // celular que ainda tem bateria.
  const [telefone, setTelefone] = useState(profile.phone || '');

  const validacao = useMemo(
    () => validateRequest({ reference: referencia, details: detalhes || 'sem detalhes', location: posicao, radiusKm: raioKm }),
    [referencia, detalhes, posicao, raioKm]
  );

  const disparar = async () => {
    if (!rede.pushToken || !posicao) return;
    setEnviando(true);
    setErro(null);
    setResultado(null);

    const r = await pedirSocorro({
      pushToken: rede.pushToken,
      kind: tipo,
      emergency: tipo === 'emergencia' ? emergencia : undefined,
      nome: profile.name,
      moto: motoInfo,
      referencia: referencia.trim(),
      detalhes: detalhes.trim(),
      posicao,
      raioKm,
    });
    setEnviando(false);

    if ('erro' in r) {
      setErro(r.erro);
      return;
    }

    onRegistrarPedido({
      pedidoId: r.pedidoId,
      kind: tipo,
      referencia: referencia.trim(),
      telefone: telefone.trim(),
      em: new Date().toISOString(),
      encontrados: r.encontrados,
      avisados: r.avisados,
    });

    // Número, não adjetivo. "Enviado" não diz se alguém está por perto.
    setResultado(
      r.encontrados === 0
        ? 'Ninguém da rede está no seu raio agora. Nada foi entregue.'
        : `${r.avisados} de ${r.encontrados} aparelho(s) no raio receberam. Aguarde resposta aqui.`
    );
    setReferencia('');
    setDetalhes('');
  };

  const aceitar = async (r: RespostaRecebida) => {
    if (!rede.pushToken || !r.ofertaId || !posicao) return;
    const meu = meusPedidos.find((p) => p.pedidoId === r.pedidoId);
    const resultado = await aceitarAjuda({
      pushToken: rede.pushToken,
      pedidoId: r.pedidoId,
      ofertaId: r.ofertaId,
      nome: profile.name,
      // O número daquele pedido, não o do perfil no momento do aceite.
      telefone: meu?.telefone || profile.phone || '',
      referencia: meu?.referencia || '',
      precisa: posicao,
    });
    if (resultado.ok) {
      onAceita(r.ofertaId);
      Alert.alert(
        'Endereço enviado',
        `${r.nome} recebeu seu endereço exato e seu telefone. Ninguém mais recebeu.`
      );
    } else {
      Alert.alert('Não deu', resultado.erro || 'Tente de novo.');
    }
  };

  const atender = async (chamado: ChamadoRecebido) => {
    if (!rede.pushToken) return;
    const r = await responderChamado({
      pushToken: rede.pushToken,
      pedidoId: chamado.pedidoId,
      nome: profile.name,
      moto: motoInfo,
      resposta: 'Posso ajudar, estou indo.',
      posicao,
    });
    if (r.ok) {
      onRespondido(chamado.pedidoId);
      Alert.alert(
        'Avisamos quem pediu',
        'Ele vai te ver na lista dele. O endereço exato só aparece se ele te aceitar — até lá você só tem a região.'
      );
    } else {
      Alert.alert('Não deu', r.erro || 'Tente de novo.');
    }
  };

  if (!rede.disponivel) {
    return (
      <ScrollView contentContainerStyle={estilosBase.conteudo}>
        <Cartao style={styles.convite}>
          <View style={styles.conviteIcone}>
            <Ionicons name="people" size={34} color={COLORS.ink} />
          </View>
          <Text style={[TIPO.titulo, styles.centro]}>Rede de socorro</Text>
          <Ajuda>
            Pilotos por perto recebem um aviso no celular quando você pede ajuda — e
            você recebe quando alguém precisa perto de você.
          </Ajuda>
          <View style={styles.linhaIcone}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.inkMuted} />
            <Text style={[TIPO.apoio, { flex: 1 }]}>
              Para funcionar nos dois sentidos, o app precisa avisar onde você está, de
              forma aproximada: um quadrado de cerca de 1 km, nunca o ponto exato. Seu
              endereço só vai para quem você aceitar.
            </Text>
          </View>

          {rede.motivo && <Text style={estilosBase.erro}>{rede.motivo}</Text>}

          <Botao
            rotulo="Entrar na rede"
            icone="enter-outline"
            variante="action"
            carregando={entrando}
            style={styles.largura}
            onPress={() => void onEntrar()}
          />
        </Cartao>
        <Aviso190 />
      </ScrollView>
    );
  }

  const emergenciaAtual = EMERGENCIAS.find((e) => e.id === emergencia);
  const bloqueado = enviando || !validacao.valid || !posicao;

  return (
    <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
      {aceites.length > 0 && <CartaoAceites aceites={aceites} />}
      {meusPedidos.length > 0 && (
        <CartaoMeusPedidos pedidos={meusPedidos} aoEncerrar={onEncerrarPedido} />
      )}
      {chamados.length > 0 && (
        <CartaoChamados
          chamados={chamados}
          posicao={posicao}
          aoAtender={(c) => void atender(c)}
          aoDispensar={onDispensar}
        />
      )}
      {respostas.length > 0 && (
        <CartaoRespostas
          respostas={respostas}
          posicao={posicao}
          meusPedidos={meusPedidos}
          profile={profile}
          aoAceitar={(r) => void aceitar(r)}
        />
      )}

      <Cartao>
        <TituloCartao icone="medkit">Pedir ajuda</TituloCartao>

        <View style={styles.segmento}>
          {(['emergencia', 'apoio'] as const).map((t) => {
            const ativo = tipo === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTipo(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativo }}
                style={[styles.segmentoItem, ativo && styles.segmentoAtivo]}
              >
                <Ionicons
                  name={t === 'emergencia' ? 'warning-outline' : 'hand-left-outline'}
                  size={18}
                  color={ativo ? COLORS.onAction : COLORS.inkMuted}
                />
                <Text style={[styles.segmentoTexto, ativo && styles.segmentoTextoAtivo]}>
                  {t === 'emergencia' ? 'Socorro' : 'Apoio'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tipo === 'emergencia' && (
          <View style={styles.chips}>
            {EMERGENCIAS.map((e) => (
              <Chip
                key={e.id}
                rotulo={e.rotulo}
                icone={e.icone}
                ativo={emergencia === e.id}
                onPress={() => setEmergencia(e.id)}
              />
            ))}
          </View>
        )}

        <Rotulo icone="location-outline">Onde você está, com palavras</Rotulo>
        <Campo
          value={referencia}
          onChangeText={setReferencia}
          placeholder="Imigrantes km 28, sentido litoral, acostamento"
        />
        {/* O GPS erra, cai, é negado. Quem vai te socorrer chega pela frase. */}
        {!!validacao.errors.reference && referencia.length > 0 && (
          <Text style={estilosBase.erro}>{validacao.errors.reference}</Text>
        )}

        <Rotulo icone="call-outline">Seu telefone</Rotulo>
        <Campo
          value={telefone}
          onChangeText={setTelefone}
          placeholder="(11) 98765-4321"
          keyboardType="phone-pad"
        />
        <Ajuda>
          {telefone.trim()
            ? 'Não vai no alerta. Só quem você aceitar recebe este número, junto com o endereço exato.'
            : 'Sem telefone, quem for te ajudar chega pelo endereço mas não consegue te avisar nem confirmar nada.'}
        </Ajuda>

        <Rotulo icone="chatbox-ellipses-outline">O que houve</Rotulo>
        <Campo
          value={detalhes}
          onChangeText={setDetalhes}
          placeholder={
            tipo === 'emergencia'
              ? emergenciaAtual?.leva
              : 'Preciso que alguém pegue um pacote no Itaim'
          }
          multiline
          style={styles.campoAlto}
        />

        <Rotulo icone="radio-outline">Quem avisar</Rotulo>
        <View style={styles.chips}>
          {RAIOS.map((r) => (
            <Chip key={r} rotulo={`${r} km`} ativo={raioKm === r} onPress={() => setRaioKm(r)} />
          ))}
        </View>

        {!posicao && (
          <View style={styles.linhaIcone}>
            <Ionicons name="navigate-circle-outline" size={18} color={COLORS.dangerText} />
            <Text style={[estilosBase.erro, { flex: 1 }]}>
              Sem GPS agora. Sem posição não dá para saber quem está perto — e avisar
              gente aleatória seria pior que não avisar.
            </Text>
          </View>
        )}

        {/* O único vermelho cheio da tela. Apoio não é emergência, então usa o
            botão principal comum. */}
        <Botao
          rotulo={tipo === 'emergencia' ? 'Pedir socorro agora' : 'Pedir apoio'}
          icone={tipo === 'emergencia' ? 'warning' : 'hand-left'}
          variante={tipo === 'emergencia' ? 'sos' : 'action'}
          altura={tipo === 'emergencia' ? 72 : 60}
          carregando={enviando}
          disabled={bloqueado}
          onPress={() => void disparar()}
        />

        {!!resultado && (
          <View style={styles.resultado}>
            <Ionicons name="information-circle" size={20} color={COLORS.ink} />
            <Text style={styles.resultadoTexto}>{resultado}</Text>
          </View>
        )}
        {!!erro && <Text style={estilosBase.erro}>{erro}</Text>}

        <Ajuda>
          Seu endereço exato não vai no aviso — só a região de mais ou menos 1 km. Ele
          só chega a quem você aceitar.
        </Ajuda>
      </Cartao>

      <Aviso190 />

      <Cartao>
        <TituloCartao icone="pulse">Sua presença</TituloCartao>
        <Ajuda>
          Você fica alcançável por 45 minutos depois de abrir o app. Com o app fechado
          por mais tempo que isso, você sai da rede e deixa de receber chamados — e de
          poder ser encontrado por eles.
        </Ajuda>
        <Botao rotulo="Sair da rede" icone="exit-outline" onPress={() => void onSair()} />
      </Cartao>
    </ScrollView>
  );
};

/** Lembrete do socorro oficial, sempre visível, fora dos cartões. */
const Aviso190: React.FC = () => (
  <View style={styles.aviso}>
    <Ionicons name="call" size={20} color={COLORS.ink} />
    <Text style={styles.avisoTexto}>
      Em emergência com risco de vida, ligue 190 ou 192 primeiro. Isto aqui é ajuda
      de outros motociclistas, não substitui socorro oficial.
    </Text>
  </View>
);

const Chip: React.FC<{
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  icone?: NomeIcone;
}> = ({ rotulo, ativo, onPress, icone }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: ativo }}
    style={[styles.chip, ativo && styles.chipAtivo]}
  >
    {icone && <Ionicons name={icone} size={16} color={ativo ? COLORS.onAction : COLORS.inkMuted} />}
    <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  convite: { alignItems: 'stretch', paddingVertical: ESPACO.xl, gap: ESPACO.lg },
  conviteIcone: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { textAlign: 'center' },
  largura: { alignSelf: 'stretch' },
  linhaIcone: { flexDirection: 'row', gap: ESPACO.sm, alignItems: 'flex-start' },
  segmento: {
    flexDirection: 'row',
    gap: ESPACO.xs,
    padding: ESPACO.xs,
    borderRadius: RAIO.md,
    backgroundColor: COLORS.elevated,
  },
  segmentoItem: {
    flex: 1,
    minHeight: ALVO.min,
    borderRadius: RAIO.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.sm,
  },
  segmentoAtivo: { backgroundColor: COLORS.action },
  segmentoTexto: { color: COLORS.inkMuted, fontSize: 15, fontWeight: '700' },
  segmentoTextoAtivo: { color: COLORS.onAction, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  chip: {
    minHeight: ALVO.min,
    paddingHorizontal: ESPACO.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    borderRadius: RAIO.pill,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
  },
  chipAtivo: { backgroundColor: COLORS.action, borderColor: COLORS.action },
  chipTexto: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  chipTextoAtivo: { color: COLORS.onAction, fontWeight: '800' },
  campoAlto: { minHeight: 88, textAlignVertical: 'top' },
  resultado: {
    flexDirection: 'row',
    gap: ESPACO.sm,
    alignItems: 'flex-start',
    padding: ESPACO.md,
    borderRadius: RAIO.md,
    backgroundColor: COLORS.elevated,
  },
  resultadoTexto: { color: COLORS.ink, fontSize: 14, lineHeight: 20, flex: 1 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RAIO.lg,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    padding: ESPACO.lg,
    gap: ESPACO.md,
  },
  avisoTexto: { color: COLORS.ink, fontSize: 14, lineHeight: 20, flex: 1 },
});
