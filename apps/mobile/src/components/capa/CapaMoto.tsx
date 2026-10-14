import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rotuloCapa, type Motorcycle } from '@motorede/shared';
import { Botao, BotaoIcone } from '../ui/Botao';
import { COLORS, ESPACO, RAIO } from '../../theme';
import { HudGaragem } from './HudGaragem';

const MARCA = require('../../../assets/marca-pino.png');

/**
 * Capa do painel da moto: a imagem feita pela IA do piloto, colada nas bordas
 * da tela, com o painel "GARAGE / BIKE SELECT" por cima. Sem capa, o mesmo
 * espaço vira o convite para criar uma.
 *
 * A imagem é alinhada à direita: se precisar cortar, corta o lado esquerdo,
 * que a IA deixou escuro e vazio — a moto nunca é cortada.
 */
export const CapaMoto: React.FC<{
  motorcycle: Motorcycle;
  aoCriar: () => void;
  aoOpcoes: () => void;
  aoDarApelido: () => void;
  /** Prévia dentro do assistente: menor, sem botões. */
  compacta?: boolean;
  imagem?: string;
}> = ({ motorcycle, aoCriar, aoOpcoes, aoDarApelido, compacta = false, imagem }) => {
  const { width } = useWindowDimensions();
  const [inteira, setInteira] = useState(false);
  const uri = imagem ?? motorcycle.coverImageUrl;
  const altura = compacta ? 260 : Math.min(520, Math.max(380, width));

  return (
    <View
      style={[styles.capa, { height: altura }, compacta ? styles.compacta : styles.sangrada]}
      accessible={compacta}
      accessibilityRole={compacta ? 'image' : undefined}
      accessibilityLabel={rotuloCapa({ ...motorcycle, coverImageUrl: uri })}
    >
      {uri ? (
        <Pressable
          style={[styles.imagem, { width: altura }]}
          onPress={compacta ? undefined : () => setInteira(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={rotuloCapa({ ...motorcycle, coverImageUrl: uri })}
          accessibilityHint="Abre a imagem sem cortes"
          disabled={compacta}
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Pressable>
      ) : (
        <View style={styles.vazio} importantForAccessibility="no-hide-descendants">
          <View style={styles.brilho} />
          <MaterialCommunityIcons name="motorbike" size={160} color={COLORS.inkFaint} style={styles.motoVazia} />
        </View>
      )}

      {/* Esquerda→direita: legibilidade do painel. */}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        colors={['rgba(10,10,11,0.88)', 'rgba(10,10,11,0.6)', 'rgba(10,10,11,0)']} locations={[0, 0.38, 0.62]} />
      {/* Topo: título. Base: funde com a tela. */}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
        colors={['rgba(10,10,11,0.55)', 'rgba(10,10,11,0)', 'rgba(10,10,11,0)', 'rgba(10,10,11,0.6)', COLORS.canvas]}
        locations={[0, 0.22, 0.68, 0.86, 1]} />

      <HudGaragem
        brand={motorcycle.brand}
        model={motorcycle.model}
        year={motorcycle.year}
        nickname={motorcycle.nickname}
        aoDarApelido={compacta ? undefined : aoDarApelido}
        compacta={compacta}
      />

      {/* Marca d'água: o canto de cima à direita fica livre (o painel está à esquerda). */}
      {uri && (
        <View style={[styles.marca, compacta && styles.marcaCompacta]} pointerEvents="none"
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={MARCA} style={compacta ? styles.pinoCompacto : styles.pino} />
          <Text style={[styles.marcaTexto, compacta && { fontSize: 12 }]}>
            MOTO<Text style={{ color: COLORS.brand }}>REDE</Text>
          </Text>
        </View>
      )}

      {!compacta && (uri ? (
        <>
          <View style={styles.owned} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.ponto} />
            <Text style={styles.ownedTexto}>OWNED</Text>
          </View>
          <View style={styles.opcoes}>
            <BotaoIcone icone="images-outline" rotulo="Opções da capa" onPress={aoOpcoes} />
          </View>
        </>
      ) : (
        <View style={styles.convite}>
          <Text style={styles.conviteTexto}>Opcional. Grátis, usando uma IA do seu celular.</Text>
          <Botao rotulo="Criar capa com IA" icone="sparkles" variante="action" onPress={aoCriar} accessibilityLabel="Criar capa com IA, opcional" />
        </View>
      ))}

      {uri && (
        <Modal visible={inteira} animationType="fade" onRequestClose={() => setInteira(false)}>
          <SafeAreaView style={styles.telaCheia}>
            <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel={rotuloCapa({ ...motorcycle, coverImageUrl: uri })} />
            <Botao rotulo="Fechar" icone="close" onPress={() => setInteira(false)} style={{ margin: ESPACO.lg }} />
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  capa: { overflow: 'hidden', backgroundColor: COLORS.canvas },
  // Anula o padding de estilosBase.conteudo: a capa encosta nas bordas e no topo.
  sangrada: { marginHorizontal: -(ESPACO.xl - 4), marginTop: -(ESPACO.xl - 4) },
  compacta: { borderRadius: RAIO.md, borderWidth: 1, borderColor: COLORS.line },
  imagem: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  vazio: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.surface },
  brilho: { position: 'absolute', right: '5%', top: '18%', width: 260, height: 260, borderRadius: 130, backgroundColor: COLORS.elevated },
  motoVazia: { position: 'absolute', right: '8%', top: '28%', opacity: 0.35 },
  owned: {
    position: 'absolute', left: ESPACO.lg, bottom: ESPACO.lg, height: 28, flexDirection: 'row', alignItems: 'center',
    gap: ESPACO.sm, paddingHorizontal: ESPACO.md, borderWidth: 1, borderColor: COLORS.lineStrong, borderRadius: RAIO.pill,
  },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.ink },
  ownedTexto: { color: COLORS.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  opcoes: { position: 'absolute', right: ESPACO.md, bottom: ESPACO.md },
  convite: { position: 'absolute', left: ESPACO.lg, right: ESPACO.lg, bottom: ESPACO.lg, gap: ESPACO.sm },
  conviteTexto: { color: COLORS.inkMuted, fontSize: 13 },
  telaCheia: { flex: 1, backgroundColor: '#000' },
  marca: { position: 'absolute', top: ESPACO.lg, right: ESPACO.lg, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.9 },
  marcaCompacta: { top: ESPACO.md, right: ESPACO.md },
  pino: { width: 28, height: 28, borderRadius: 6 },
  pinoCompacto: { width: 22, height: 22, borderRadius: 5 },
  marcaTexto: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});
