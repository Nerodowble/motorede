import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { distanceKm, type GeoPoint, type RiderProfile } from '@motorede/shared';
import type {
  AceiteRecebido,
  ChamadoRecebido,
  MeuPedido,
  RespostaRecebida,
} from '../../hooks/useSocorro';
import { COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import { Botao } from '../ui/Botao';
import { Ajuda, Cartao, TituloCartao, estilosBase } from '../ui/Cartao';

/**
 * Os cartões de chamado da aba SOS: quem aceitou sua ajuda, seu pedido de pé,
 * quem pede perto de você e quem respondeu ao seu pedido.
 *
 * Só o chamado de alguém perto leva a faixa vermelha cheia: é a emergência de
 * outra pessoa acontecendo agora. O resto é informação, em neutro.
 */

/** Aceitaram sua ajuda: telefone e navegação até o ponto exato. */
export const CartaoAceites: React.FC<{ aceites: AceiteRecebido[] }> = ({ aceites }) => (
  <Cartao destaque={COLORS.ink}>
    <TituloCartao icone="navigate">Aceitaram sua ajuda — vá até lá</TituloCartao>
    {aceites.map((a, i) => (
      <View key={`${a.pedidoId}-${i}`} style={estilos.chamado}>
        <Text style={estilos.nome}>{a.nome}</Text>
        {!!a.referencia && <Text style={estilos.referencia}>{a.referencia}</Text>}

        {a.telefone ? (
          <>
            {/* `selectable` permite copiar com toque longo, sem depender
                de biblioteca de área de transferência. */}
            <Text selectable style={estilos.telefone}>
              {a.telefone}
            </Text>
            <Ajuda>Toque e segure o número para copiar.</Ajuda>
            <Botao
              rotulo="Ligar agora"
              icone="call"
              variante="action"
              onPress={() => void Linking.openURL(`tel:${a.telefone!.replace(/\D/g, '')}`)}
            />
          </>
        ) : (
          <Text style={estilosBase.erro}>
            Quem pediu está sem telefone no perfil — só dá para chegar pelo endereço.
          </Text>
        )}

        {!!a.exato && (
          <View style={estilosBase.linhaBotoes}>
            <Botao
              rotulo="Waze"
              icone="navigate-outline"
              flex
              onPress={() =>
                void Linking.openURL(
                  `https://waze.com/ul?ll=${a.exato!.lat},${a.exato!.lng}&navigate=yes`
                )
              }
            />
            <Botao
              rotulo="Google Maps"
              icone="map-outline"
              flex
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${a.exato!.lat},${a.exato!.lng}`
                )
              }
            />
          </View>
        )}

        <Ajuda>Agora a navegação vai até o ponto exato, não mais até a região.</Ajuda>
      </View>
    ))}
  </Cartao>
);

/** Seu pedido ainda aberto, com o botão de encerrar. */
export const CartaoMeusPedidos: React.FC<{
  pedidos: MeuPedido[];
  aoEncerrar: (pedidoId: string) => void;
}> = ({ pedidos, aoEncerrar }) => (
  <Cartao destaque={COLORS.sos}>
    <FaixaSos texto="Seu pedido está de pé" />
    {pedidos.map((p) => (
      <View key={p.pedidoId} style={estilos.chamado}>
        <Text style={estilos.nome}>
          {p.kind === 'emergencia' ? 'Socorro' : 'Apoio'} ·{' '}
          {new Date(p.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={estilos.referencia}>{p.referencia}</Text>
        <Text style={estilos.meta}>
          {p.encontrados === 0
            ? 'Ninguém estava no seu raio quando você pediu.'
            : `${p.avisados} de ${p.encontrados} aparelho(s) avisados.`}
        </Text>
        <Botao
          rotulo="Já resolvi, encerrar"
          icone="checkmark-done"
          onPress={() => aoEncerrar(p.pedidoId)}
        />
      </View>
    ))}
    <Ajuda>
      Encerre assim que resolver. Um pedido esquecido continua aparecendo para
      quem está por perto por até 2 horas, e manda gente rodar atrás de você
      depois de você já ter ido embora.
    </Ajuda>
  </Cartao>
);

/** Alguém perto pedindo ajuda. */
export const CartaoChamados: React.FC<{
  chamados: ChamadoRecebido[];
  posicao: GeoPoint | null;
  aoAtender: (c: ChamadoRecebido) => void;
  aoDispensar: (pedidoId: string) => void;
}> = ({ chamados, posicao, aoAtender, aoDispensar }) => (
  <Cartao destaque={COLORS.sos} style={estilos.cartaoChamado}>
    <FaixaSos texto="Pedindo ajuda perto de você" />
    {chamados.map((c) => {
      const longe =
        c.celula && posicao ? distanceKm(posicao, c.celula).toFixed(1) + ' km' : '—';
      return (
        <View key={c.pedidoId} style={estilos.chamado}>
          <Text style={estilos.nome}>
            {c.nome}
            {c.moto ? ` · ${c.moto}` : ''}
          </Text>
          <Text style={estilos.referencia}>{c.referencia}</Text>
          {!!c.detalhes && <Ajuda>{c.detalhes}</Ajuda>}
          <Text style={estilos.meta}>
            ~{longe} daqui · {c.kind === 'emergencia' ? 'Socorro' : 'Apoio'} · região
            aproximada
          </Text>

          {c.respondido ? (
            <JaFeito texto="Você avisou que vai" />
          ) : (
            <Botao
              rotulo="Posso ajudar"
              icone="hand-left"
              variante="action"
              onPress={() => aoAtender(c)}
            />
          )}
          <View style={estilosBase.linhaBotoes}>
            {!!c.celula && (
              <Botao
                rotulo="Ver a região"
                icone="map-outline"
                compacto
                flex
                onPress={() =>
                  void Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${c.celula!.lat},${c.celula!.lng}`
                  )
                }
              />
            )}
            <Botao rotulo="Dispensar" compacto flex onPress={() => aoDispensar(c.pedidoId)} />
          </View>
        </View>
      );
    })}
  </Cartao>
);

/** Quem respondeu ao seu pedido: aceitar envia endereço e telefone. */
export const CartaoRespostas: React.FC<{
  respostas: RespostaRecebida[];
  posicao: GeoPoint | null;
  meusPedidos: MeuPedido[];
  profile: RiderProfile;
  aoAceitar: (r: RespostaRecebida) => void;
}> = ({ respostas, posicao, meusPedidos, profile, aoAceitar }) => (
  <Cartao>
    <TituloCartao icone="people">Quem respondeu ao seu pedido</TituloCartao>
    {respostas.map((r, i) => (
      <View key={`${r.pedidoId}-${i}`} style={estilos.chamado}>
        <Text style={estilos.nome}>
          {r.nome}
          {r.moto ? ` · ${r.moto}` : ''}
        </Text>
        <Text style={estilos.meta}>
          {r.celula && posicao
            ? `a ~${distanceKm(posicao, r.celula).toFixed(1)} km de você`
            : 'região não informada'}
        </Text>
        {r.aceita ? (
          <JaFeito texto={`Você enviou seu endereço e telefone para ${r.nome}`} />
        ) : (
          <Botao
            rotulo="Aceitar e enviar meu endereço"
            icone="send"
            variante="action"
            disabled={!r.ofertaId || !posicao}
            onPress={() => aoAceitar(r)}
          />
        )}
        {!meusPedidos.find((p) => p.pedidoId === r.pedidoId)?.telefone &&
          !profile.phone &&
          !r.aceita && (
            <Text style={estilosBase.erro}>
              Você pediu sem informar telefone. Quem aceitar vai receber o endereço e
              não vai ter como te ligar.
            </Text>
          )}
        <Ajuda>
          Aceitar envia seu endereço exato e telefone só para esta pessoa. O app não
          verifica a identidade de ninguém — aceite quem você tem alguma razão para
          aceitar.
        </Ajuda>
      </View>
    ))}
  </Cartao>
);

/** Faixa vermelha cheia: o único lugar, além do botão, com sos de fundo. */
const FaixaSos: React.FC<{ texto: string }> = ({ texto }) => (
  <View style={estilos.faixa}>
    <Ionicons name="warning" size={20} color={COLORS.onSos} />
    <Text style={estilos.faixaTexto}>{texto}</Text>
  </View>
);

const JaFeito: React.FC<{ texto: string }> = ({ texto }) => (
  <View style={estilos.jaFeito}>
    <Ionicons name="checkmark-circle" size={18} color={COLORS.ink} />
    <Text style={estilos.jaFeitoTexto}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  cartaoChamado: { backgroundColor: COLORS.sosTint },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    backgroundColor: COLORS.sos,
    borderRadius: RAIO.sm,
    paddingHorizontal: ESPACO.md,
    minHeight: 44,
  },
  faixaTexto: { color: COLORS.onSos, fontSize: 16, fontWeight: '800', flex: 1 },
  chamado: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: ESPACO.md,
    gap: ESPACO.sm,
  },
  nome: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  referencia: { ...TIPO.corpo },
  meta: { color: COLORS.inkFaint, fontSize: 13 },
  telefone: {
    color: COLORS.ink,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  jaFeito: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm, minHeight: 44 },
  jaFeitoTexto: { color: COLORS.ink, fontSize: 14, fontWeight: '700', flex: 1 },
});
