import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AVISO_CARIMBO_PESSOAL, type CarimboPessoal, type MonumentoRotaBiker } from '@motorede/shared';
import { Ajuda } from './ui/Cartao';
import { Botao } from './ui/Botao';
import { COLORS, ESPACO, RAIO, TIPO } from '../theme';

const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Bloco do carimbo dentro do card do monumento: miniatura + botão. */
export function BlocoCarimbo({ monumento: m, ultimo, total, ocupado, carimbar, apagar }: {
  monumento: MonumentoRotaBiker;
  ultimo: CarimboPessoal | undefined;
  total: number;
  ocupado: boolean;
  carimbar: () => void;
  apagar: (c: CarimboPessoal) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return <View style={styles.bloco}>
    {ultimo && <Pressable accessibilityRole="button" accessibilityLabel={`Ver a foto do seu carimbo de ${data(ultimo.em)}`}
      onPress={() => setAberto(true)} style={styles.linha}>
      <Image source={{ uri: ultimo.foto }} style={styles.miniatura} resizeMode="cover" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.esteve}>Você esteve aqui em {data(ultimo.em)}</Text>
        <Text style={TIPO.apoio}>{total > 1 ? `${total} carimbos · ` : ''}Toque para ver a foto</Text>
      </View>
    </Pressable>}
    <Botao compacto rotulo={ultimo ? 'Carimbar de novo' : 'Carimbar (pessoal)'} icone="camera-outline"
      variante={ultimo ? 'secundario' : 'action'} carregando={ocupado} onPress={carimbar}
      accessibilityLabel={`Carimbar ${m.nome} com a sua localização de agora e uma foto`} />
    {ultimo && <FotoCarimbo visivel={aberto} fechar={() => setAberto(false)} carimbo={ultimo} monumento={m}
      apagar={() => { setAberto(false); apagar(ultimo); }} />}
  </View>;
}

function FotoCarimbo({ visivel, fechar, carimbo: c, monumento: m, apagar }: {
  visivel: boolean; fechar: () => void; carimbo: CarimboPessoal; monumento: MonumentoRotaBiker; apagar: () => void;
}) {
  const confirmar = () => Alert.alert('Apagar este carimbo?', 'Apaga a foto e o registro deste dia. Não dá para desfazer.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: apagar },
  ]);
  return <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
    <ScrollView style={{ backgroundColor: COLORS.canvas }} contentContainerStyle={styles.modal}>
      <Text style={TIPO.rotulo}>CARIMBO PESSOAL · Nº {m.numero}</Text>
      <Text style={TIPO.tituloCard}>{m.nome}</Text>
      <Image source={{ uri: c.foto }} style={styles.foto} resizeMode="cover" accessibilityLabel={`Sua foto em ${m.nome}`} />
      <Ajuda>{data(c.em)} às {hora(c.em)} · a {c.distanciaKm < 1 ? `${Math.round(c.distanciaKm * 1000)} m` : `${c.distanciaKm.toFixed(1).replace('.', ',')} km`} do monumento</Ajuda>
      <Ajuda>{AVISO_CARIMBO_PESSOAL}</Ajuda>
      <Botao rotulo="Fechar" variante="fantasma" onPress={fechar} />
      <Botao rotulo="Apagar este carimbo" icone="trash-outline" variante="perigo" onPress={confirmar} />
    </ScrollView>
  </Modal>;
}

const styles = StyleSheet.create({
  bloco: { gap: ESPACO.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: 56 },
  miniatura: { width: 56, height: 56, borderRadius: RAIO.md, backgroundColor: COLORS.elevated },
  esteve: { ...TIPO.corpo, color: COLORS.ink, fontWeight: '700' },
  modal: { padding: ESPACO.lg, gap: ESPACO.lg, paddingBottom: ESPACO.xxl },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: RAIO.lg, backgroundColor: COLORS.elevated },
});
