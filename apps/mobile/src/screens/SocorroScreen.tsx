import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { distanceKm, validateRequest, type GeoPoint, type RiderProfile } from '@motorede/shared';
import { pedirSocorro, responderChamado } from '../services/socorro';
import type { ChamadoRecebido, RespostaRecebida, MeuPedido } from '../hooks/useSocorro';
import type { EstadoRede } from '../services/socorro';
import { COLORS } from '../theme';

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

const EMERGENCIAS: Array<{ id: string; rotulo: string; leva: string }> = [
  { id: 'flat_tire', rotulo: 'Pneu furado', leva: 'kit macarrão, bomba' },
  { id: 'mechanical_breakdown', rotulo: 'Pane mecânica', leva: 'ferramentas' },
  { id: 'out_of_fuel', rotulo: 'Sem combustível', leva: 'galão, mangueira' },
  { id: 'electrical_battery', rotulo: 'Bateria', leva: 'cabo de chupeta' },
  { id: 'accident_fall', rotulo: 'Queda / acidente', leva: 'avisa todo mundo na hora' },
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
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.tituloCard}>Rede de socorro</Text>
          <Text style={styles.ajuda}>
            Pilotos por perto recebem um aviso no celular quando você pede ajuda — e
            você recebe quando alguém precisa perto de você.
          </Text>
          <Text style={styles.ajuda}>
            Para funcionar nos dois sentidos, o app precisa avisar onde você está, de
            forma aproximada: um quadrado de cerca de 1 km, nunca o ponto exato. Seu
            endereço só vai para quem você aceitar.
          </Text>

          {rede.motivo && <Text style={styles.erro}>{rede.motivo}</Text>}

          <Pressable onPress={() => void onEntrar()} disabled={entrando} style={styles.botao}>
            {entrando ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.botaoTexto}>Entrar na rede</Text>
            )}
          </Pressable>

          <Text style={styles.rodape}>
            Em emergência com risco de vida, ligue 190 ou 192 primeiro. Isto aqui é
            ajuda de outros motociclistas, não substitui socorro oficial.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      {meusPedidos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.tituloCard}>Seu pedido está de pé</Text>
          {meusPedidos.map((p) => (
            <View key={p.pedidoId} style={styles.chamado}>
              <Text style={styles.chamadoNome}>
                {p.kind === 'emergencia' ? 'Socorro' : 'Apoio'} ·{' '}
                {new Date(p.em).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.chamadoRef}>{p.referencia}</Text>
              <Text style={styles.chamadoMeta}>
                {p.encontrados === 0
                  ? 'Ninguém estava no seu raio quando você pediu.'
                  : `${p.avisados} de ${p.encontrados} aparelho(s) avisados.`}
              </Text>
              <Pressable
                onPress={() => onEncerrarPedido(p.pedidoId)}
                style={[styles.botaoPequeno, styles.botaoResolver]}
              >
                <Text style={styles.botaoResolverTexto}>Já resolvi, encerrar</Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.ajuda}>
            Encerre assim que resolver. Um pedido esquecido continua aparecendo para
            quem está por perto por até 2 horas, e manda gente rodar atrás de você
            depois de você já ter ido embora.
          </Text>
        </View>
      )}

      {chamados.length > 0 && (
        <View style={[styles.card, styles.cardAlerta]}>
          <Text style={styles.tituloCard}>Pedindo ajuda perto de você</Text>
          {chamados.map((c) => {
            const longe =
              c.celula && posicao ? distanceKm(posicao, c.celula).toFixed(1) + ' km' : '—';
            return (
              <View key={c.pedidoId} style={styles.chamado}>
                <Text style={styles.chamadoNome}>
                  {c.nome}
                  {c.moto ? ` · ${c.moto}` : ''}
                </Text>
                <Text style={styles.chamadoRef}>{c.referencia}</Text>
                {!!c.detalhes && <Text style={styles.ajuda}>{c.detalhes}</Text>}
                <Text style={styles.chamadoMeta}>
                  ~{longe} daqui · {c.kind === 'emergencia' ? 'Socorro' : 'Apoio'} · região
                  aproximada
                </Text>

                <View style={styles.linhaBotoes}>
                  {c.respondido ? (
                    <Text style={styles.jaRespondeu}>Você avisou que vai</Text>
                  ) : (
                    <Pressable onPress={() => void atender(c)} style={styles.botaoPequeno}>
                      <Text style={styles.botaoPequenoTexto}>Posso ajudar</Text>
                    </Pressable>
                  )}
                  {!!c.celula && (
                    <Pressable
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${c.celula!.lat},${c.celula!.lng}`
                        )
                      }
                      style={styles.botaoVazado}
                    >
                      <Text style={styles.botaoVazadoTexto}>Ver a região</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => onDispensar(c.pedidoId)} style={styles.botaoVazado}>
                    <Text style={styles.botaoVazadoTexto}>Dispensar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {respostas.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.tituloCard}>Quem respondeu ao seu pedido</Text>
          {respostas.map((r, i) => (
            <View key={`${r.pedidoId}-${i}`} style={styles.chamado}>
              <Text style={styles.chamadoNome}>
                {r.nome}
                {r.moto ? ` · ${r.moto}` : ''}
              </Text>
              <Text style={styles.chamadoMeta}>
                {r.celula && posicao
                  ? `a ~${distanceKm(posicao, r.celula).toFixed(1)} km de você`
                  : 'região não informada'}
              </Text>
              <Text style={styles.ajuda}>
                Combine por telefone antes de passar o endereço exato. O app não verifica
                quem é ninguém.
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Pedir ajuda</Text>

        <View style={styles.abas}>
          {(['emergencia', 'apoio'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTipo(t)}
              style={[styles.aba, tipo === t && styles.abaAtiva]}
            >
              <Text style={[styles.abaTexto, tipo === t && styles.abaTextoAtivo]}>
                {t === 'emergencia' ? 'Socorro' : 'Apoio'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tipo === 'emergencia' && (
          <View style={styles.chips}>
            {EMERGENCIAS.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setEmergencia(e.id)}
                style={[styles.chip, emergencia === e.id && styles.chipAtivo]}
              >
                <Text style={[styles.chipTexto, emergencia === e.id && styles.chipTextoAtivo]}>
                  {e.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.rotulo}>Onde você está, com palavras</Text>
        <TextInput
          value={referencia}
          onChangeText={setReferencia}
          placeholder="Imigrantes km 28, sentido litoral, acostamento"
          placeholderTextColor={COLORS.faint}
          style={styles.input}
        />
        {/* O GPS erra, cai, é negado. Quem vai te socorrer chega pela frase. */}
        {!!validacao.errors.reference && referencia.length > 0 && (
          <Text style={styles.erro}>{validacao.errors.reference}</Text>
        )}

        <Text style={styles.rotulo}>O que houve</Text>
        <TextInput
          value={detalhes}
          onChangeText={setDetalhes}
          placeholder={
            tipo === 'emergencia'
              ? EMERGENCIAS.find((e) => e.id === emergencia)?.leva
              : 'Preciso que alguém pegue um pacote no Itaim'
          }
          placeholderTextColor={COLORS.faint}
          multiline
          style={[styles.input, styles.inputAlto]}
        />

        <Text style={styles.rotulo}>Quem avisar</Text>
        <View style={styles.chips}>
          {RAIOS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRaioKm(r)}
              style={[styles.chip, raioKm === r && styles.chipAtivo]}
            >
              <Text style={[styles.chipTexto, raioKm === r && styles.chipTextoAtivo]}>
                {r} km
              </Text>
            </Pressable>
          ))}
        </View>

        {!posicao && (
          <Text style={styles.erro}>
            Sem GPS agora. Sem posição não dá para saber quem está perto — e avisar
            gente aleatória seria pior que não avisar.
          </Text>
        )}

        <Pressable
          onPress={() => void disparar()}
          disabled={enviando || !validacao.valid || !posicao}
          style={[
            styles.botao,
            tipo === 'emergencia' && styles.botaoUrgente,
            (enviando || !validacao.valid || !posicao) && styles.botaoInativo,
          ]}
        >
          {enviando ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={[styles.botaoTexto, tipo === 'emergencia' && styles.botaoTextoUrgente]}>
              {tipo === 'emergencia' ? 'Pedir socorro agora' : 'Pedir apoio'}
            </Text>
          )}
        </Pressable>

        {!!resultado && <Text style={styles.resultado}>{resultado}</Text>}
        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <Text style={styles.rodape}>
          Seu endereço exato não vai no aviso — só a região de mais ou menos 1 km. Ele
          só chega a quem você aceitar. Em risco de vida, 190 ou 192 primeiro.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Sua presença</Text>
        <Text style={styles.ajuda}>
          Você fica alcançável por 45 minutos depois de abrir o app. Com o app fechado
          por mais tempo que isso, você sai da rede e deixa de receber chamados — e de
          poder ser encontrado por eles.
        </Text>
        <Pressable onPress={() => void onSair()} style={styles.botaoVazadoLargo}>
          <Text style={styles.botaoVazadoTexto}>Sair da rede</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 8,
  },
  cardAlerta: { borderColor: COLORS.danger },
  tituloCard: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  rotulo: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginTop: 6 },
  ajuda: { color: COLORS.faint, fontSize: 11, lineHeight: 16 },
  rodape: { color: COLORS.faint, fontSize: 10, lineHeight: 15, marginTop: 8 },
  erro: { color: COLORS.danger, fontSize: 11, lineHeight: 16, marginTop: 4 },
  resultado: { color: COLORS.success, fontSize: 12, lineHeight: 17, marginTop: 8 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 13,
  },
  inputAlto: { height: 72, textAlignVertical: 'top' },
  abas: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  aba: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  abaAtiva: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  abaTexto: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  abaTextoAtivo: { color: COLORS.background },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipAtivo: { borderColor: COLORS.accent, backgroundColor: COLORS.surfaceAlt },
  chipTexto: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  chipTextoAtivo: { color: COLORS.accent },
  botao: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoUrgente: { backgroundColor: '#dc2626' },
  botaoInativo: { opacity: 0.45 },
  botaoTexto: { color: COLORS.background, fontSize: 13, fontWeight: '800' },
  botaoTextoUrgente: { color: '#ffffff' },
  botaoPequeno: {
    backgroundColor: COLORS.accent,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  botaoPequenoTexto: { color: COLORS.background, fontSize: 11, fontWeight: '800' },
  botaoResolver: { backgroundColor: COLORS.success, alignSelf: 'flex-start', marginTop: 8 },
  botaoResolverTexto: { color: COLORS.background, fontSize: 11, fontWeight: '800' },
  botaoVazado: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  botaoVazadoLargo: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  botaoVazadoTexto: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  chamado: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 6,
    gap: 3,
  },
  chamadoNome: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  chamadoRef: { color: COLORS.text, fontSize: 12 },
  chamadoMeta: { color: COLORS.faint, fontSize: 10, fontFamily: 'monospace' },
  jaRespondeu: { color: COLORS.success, fontSize: 11, fontWeight: '700', paddingVertical: 8 },
  linhaBotoes: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
});
