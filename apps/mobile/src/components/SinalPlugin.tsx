import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RemoteAudioTrack, type Room } from 'livekit-client';
import { COLORS, ESPACO } from '../theme';

/**
 * Qualidade do sinal do plugin, medida neste aparelho.
 *
 * POR QUE EXISTE
 *
 * "O som fica abafado até quase sumir" tem três causas possíveis, e cada uma
 * pede um conserto diferente:
 *  - taxa baixa (kbps caindo): o codificador está economizando porque a
 *    conexão de ENVIO do computador do plugin não aguenta — o som perde os
 *    agudos primeiro, daí o "abafado";
 *  - perda de pacotes / buracos: a rede no caminho está falhando, e o celular
 *    "inventa" som para tapar os buracos;
 *  - números bons e som ruim: o problema é o próprio aparelho.
 *
 * Aqui os números aparecem a cada 2 s, com um veredito em português.
 */

interface Sinal {
  kbps: number;
  perda: number; // % de pacotes perdidos no intervalo
  buracos: number; // % do tempo em que o celular precisou inventar som
  jitterMs: number;
}

const INTERVALO_MS = 2000;
const TAXA_AMOSTRA = 48000;

function useSinal(room: Room | null, identidade: string | null): Sinal | null {
  const [sinal, setSinal] = useState<Sinal | null>(null);

  useEffect(() => {
    if (!room || !identidade) {
      setSinal(null);
      return;
    }
    let anterior: { t: number; bytes: number; recebidos: number; perdidos: number; inventadas: number } | null = null;

    const medir = async () => {
      const p = room.getParticipantByIdentity(identidade);
      const pub = p ? [...p.audioTrackPublications.values()][0] : undefined;
      const faixa = pub?.track;
      if (!(faixa instanceof RemoteAudioTrack)) return;
      const s = await faixa.getReceiverStats().catch(() => undefined);
      if (!s) return;
      const atual = {
        t: s.timestamp,
        bytes: s.bytesReceived ?? 0,
        recebidos: s.packetsReceived ?? 0,
        perdidos: s.packetsLost ?? 0,
        inventadas: s.concealedSamples ?? 0,
      };
      if (anterior && atual.t > anterior.t) {
        const seg = (atual.t - anterior.t) / 1000;
        const recebidos = atual.recebidos - anterior.recebidos;
        const perdidos = Math.max(0, atual.perdidos - anterior.perdidos);
        const inventadas = Math.max(0, atual.inventadas - anterior.inventadas);
        setSinal({
          kbps: Math.round(((atual.bytes - anterior.bytes) * 8) / seg / 1000),
          perda: recebidos + perdidos > 0 ? Math.round((perdidos / (recebidos + perdidos)) * 100) : 0,
          buracos: Math.min(100, Math.round((inventadas / (TAXA_AMOSTRA * seg)) * 100)),
          jitterMs: Math.round((s.jitter ?? 0) * 1000),
        });
      }
      anterior = atual;
    };

    void medir();
    const t = setInterval(() => void medir(), INTERVALO_MS);
    return () => clearInterval(t);
  }, [room, identidade]);

  return sinal;
}

function veredito(s: Sinal): { texto: string; ruim: boolean } {
  if (s.kbps === 0) return { texto: 'Nenhum áudio chegando do plugin', ruim: true };
  if (s.perda >= 5 || s.buracos >= 10) {
    return { texto: 'A rede está perdendo pedaços do som no caminho', ruim: true };
  }
  if (s.kbps < 24) {
    return { texto: 'Taxa baixa: o envio do computador do plugin não está aguentando', ruim: true };
  }
  return { texto: 'Sinal bom chegando neste aparelho', ruim: false };
}

export const SinalPlugin: React.FC<{ room: Room | null; identidade: string | null }> = ({
  room,
  identidade,
}) => {
  const s = useSinal(room, identidade);
  if (!s) return null;
  const v = veredito(s);
  // Só aparece quando há problema: sinal bom não precisa ocupar o card.
  if (!v.ruim) return null;
  const cor = v.ruim ? COLORS.dangerText : COLORS.inkFaint;
  return (
    <View style={styles.linha} accessibilityLabel={`Sinal do plugin: ${v.texto}`}>
      <Ionicons name={v.ruim ? 'warning-outline' : 'pulse-outline'} size={14} color={cor} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.veredito, { color: cor }]}>{v.texto}</Text>
        <Text style={styles.numeros}>
          {s.kbps} kbps · perda {s.perda}% · buracos {s.buracos}% · jitter {s.jitterMs} ms
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', gap: ESPACO.sm, alignItems: 'flex-start', paddingTop: ESPACO.xs },
  veredito: { fontSize: 12, fontWeight: '700' },
  numeros: { color: COLORS.inkFaint, fontSize: 11, fontVariant: ['tabular-nums'] },
});
