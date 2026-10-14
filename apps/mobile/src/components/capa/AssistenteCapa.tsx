import React, { useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AVISO_CAPA, IAS_CAPA, TEXTOS_CAPA, APELIDO_MAX, comIa, montarPromptCapa, validarApelido,
  type IaCapa, type Motorcycle,
} from '@motorede/shared';
import { Botao, type NomeIcone } from '../ui/Botao';
import { Ajuda, Campo } from '../ui/Cartao';
import { Folha } from '../ui/Folha';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import { CapaMoto } from './CapaMoto';
import {
  abrirLoja, copiarPrompt, enviarParaIa, escolherDaGaleria, estaInstalada, guardarImagem,
  limparProgresso, salvarProgresso, type PassoCapa, type ProgressoCapa,
} from '../../services/capaMoto';

/**
 * Assistente da capa: o piloto escolhe uma foto, escolhe a IA que já tem no
 * celular, o MotoRede copia o texto e entrega a foto, e na volta ele escolhe
 * a imagem gerada. O progresso fica salvo a cada passo, porque o Android pode
 * fechar o MotoRede enquanto o piloto está na IA.
 */

const NUMERO: Partial<Record<PassoCapa, number>> = { foto: 1, ia: 2, naIa: 3, gerada: 4, pronto: 5 };
const T = TEXTOS_CAPA;

export const AssistenteCapa: React.FC<{
  visivel: boolean;
  motorcycle: Motorcycle;
  inicial: ProgressoCapa;
  aoFechar: () => void;
  aoSalvar: (capa: { uri: string; ia: IaCapa; nickname: string | null }) => void;
}> = ({ visivel, motorcycle, inicial, aoFechar, aoSalvar }) => {
  const [p, setP] = useState<ProgressoCapa>(inicial);
  const [apelido, setApelido] = useState(motorcycle.nickname ?? '');
  const [aviso, setAviso] = useState('');
  const [naoAbriu, setNaoAbriu] = useState(false);
  const [semIa, setSemIa] = useState(false);
  const [comTexto, setComTexto] = useState(false);
  const enviado = useRef(false);

  useEffect(() => {
    if (!visivel) return;
    setP(inicial);
    setApelido(motorcycle.nickname ?? '');
    setAviso(''); setNaoAbriu(false); setSemIa(false); setComTexto(false);
  }, [visivel, inicial, motorcycle.nickname]);

  const ir = (proximo: ProgressoCapa) => {
    setP(proximo);
    setAviso('');
    void salvarProgresso(motorcycle.id, proximo);
  };

  // Voltou da IA: segue para escolher a imagem gerada.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && enviado.current) {
        enviado.current = false;
        setP((atual) => {
          if (atual.passo !== 'naIa') return atual;
          const proximo = { ...atual, passo: 'gerada' as const };
          void salvarProgresso(motorcycle.id, proximo);
          return proximo;
        });
      }
    });
    return () => sub.remove();
  }, [motorcycle.id]);

  const fechar = () => {
    if (p.passo === 'convite') void limparProgresso(motorcycle.id);
    aoFechar();
  };

  const escolherFoto = async () => {
    const uri = await escolherDaGaleria();
    if (uri) ir({ ...p, fotoUri: await guardarImagem(uri, 'foto') });
  };

  const escolherGerada = async () => {
    const uri = await escolherDaGaleria();
    if (uri) ir({ ...p, geradaUri: await guardarImagem(uri, 'capa') });
  };

  const abrirIa = async () => {
    if (!p.fotoUri || !p.ia) return;
    try {
      enviado.current = true;
      const r = await enviarParaIa(p.fotoUri, p.ia, montarPromptCapa(motorcycle));
      if (r === 'falhou') {
        enviado.current = false;
        setAviso(`${T.naIa.copiado} Não deu para abrir o app; abra o ${nomeIa} e anexe a foto.`);
      } else if (r === 'lista') setAviso(T.naIa.copiado);
    } catch {
      enviado.current = false;
      setAviso('Não deu para abrir a IA. Tente de novo.');
    }
  };

  const nomeIa = IAS_CAPA.find((i) => i.id === p.ia)?.nome ?? 'IA';
  const numero = NUMERO[p.passo];
  const titulo = p.passo === 'convite' ? T.convite.titulo
    : p.passo === 'foto' ? T.foto.titulo
    : p.passo === 'ia' ? T.ia.titulo
    : p.passo === 'naIa' ? comIa(T.naIa.titulo, p.ia ?? 'gemini')
    : p.passo === 'gerada' ? T.gerada.titulo : T.pronto.titulo;

  const conteudo = () => {
    switch (p.passo) {
      case 'convite':
        return <>
          <Text style={TIPO.corpo}>{T.convite.texto}</Text>
          <Item icone="checkmark-circle" texto={T.convite.itens[0]} />
          <Item icone="phone-portrait-outline" texto={T.convite.itens[1]} />
          <Item icone="time-outline" texto={T.convite.itens[2]} />
          <Botao rotulo={T.convite.sim} variante="action" onPress={() => ir({ ...p, passo: 'foto' })} />
          <Botao rotulo={T.convite.nao} variante="fantasma" onPress={fechar} />
        </>;
      case 'foto':
        return <>
          <Text style={TIPO.corpo}>{T.foto.texto}</Text>
          {p.fotoUri ? <>
            <Image source={{ uri: p.fotoUri }} style={styles.previa} resizeMode="cover" accessibilityLabel="Foto escolhida da moto" />
            <Botao rotulo={T.foto.usar} variante="action" onPress={() => ir({ ...p, passo: 'ia' })} />
            <Botao rotulo={T.foto.outra} onPress={() => void escolherFoto()} />
          </> : <>
            <View style={styles.dicas}>
              <Item icone="scan-outline" texto={T.foto.dicas[0]} />
              <Item icone="swap-horizontal-outline" texto={T.foto.dicas[1]} />
              <Item icone="sunny-outline" texto={T.foto.dicas[2]} />
            </View>
            <Botao rotulo={T.foto.escolher} icone="images-outline" variante="action" onPress={() => void escolherFoto()} />
            <Ajuda>{T.foto.rodape}</Ajuda>
          </>}
        </>;
      case 'ia':
        return <>
          {IAS_CAPA.map((ia) => {
            const instalada = estaInstalada(ia.id);
            const ativa = p.ia === ia.id;
            return <Pressable key={ia.id} onPress={() => setP({ ...p, ia: ia.id })} accessibilityRole="radio"
              accessibilityState={{ checked: ativa }} accessibilityLabel={`${ia.nome}. ${ia.subtexto}`}
              style={[styles.opcaoIa, ativa && styles.opcaoIaAtiva]}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.linha}>
                  <Text style={TIPO.tituloCard}>{ia.nome}</Text>
                  {ia.recomendado && <Text style={styles.selo}>Recomendado</Text>}
                </View>
                <Text style={TIPO.apoio}>{instalada === false ? 'Não encontramos no seu celular.' : ia.subtexto}</Text>
              </View>
              <Ionicons name={ativa ? 'radio-button-on' : 'radio-button-off'} size={24} color={COLORS.ink} />
            </Pressable>;
          })}
          <Botao rotulo={T.ia.continuar} variante="action" disabled={!p.ia}
            onPress={() => { if (p.ia) ir({ ...p, passo: 'naIa' }); }} />
          <Botao rotulo={T.ia.nenhuma} variante="fantasma" onPress={() => setSemIa(!semIa)} />
          {semIa && <>
            <Ajuda>{T.ia.nenhumaTexto}</Ajuda>
            <Botao rotulo="Instalar o Gemini" icone="download-outline" onPress={() => void abrirLoja('gemini')} />
          </>}
        </>;
      case 'naIa': {
        const ia = p.ia ?? 'gemini';
        if (naoAbriu) return <>
          <Text style={TIPO.tituloCard}>{comIa(T.naIa.naoInstaladoTitulo, ia)}</Text>
          <Text style={TIPO.corpo}>{T.naIa.naoInstaladoTexto}</Text>
          <Botao rotulo={comIa(T.naIa.instalar, ia)} icone="download-outline" variante="action" onPress={() => void abrirLoja(ia)} />
          <Botao rotulo={T.naIa.outraIa} onPress={() => { setNaoAbriu(false); ir({ ...p, passo: 'ia' }); }} />
        </>;
        const dica = IAS_CAPA.find((i) => i.id === ia)?.dicaAnexo;
        const passos = [
          ...(estaInstalada(ia) === null ? [comIa(T.naIa.passoLista, ia)] : []),
          ...(dica ? [dica] : []),
          ...T.naIa.passos,
        ];
        return <>
          <Text style={TIPO.corpo}>{comIa(T.naIa.texto, ia)}</Text>
          {passos.map((texto, i) => (
            <View key={texto} style={styles.passo}>
              <View style={styles.numero}><Text style={styles.numeroTexto}>{i + 1}</Text></View>
              <Text style={[TIPO.corpo, { flex: 1 }]}>{texto}</Text>
            </View>
          ))}
          <Botao rotulo={comIa(T.naIa.botao, ia)} icone="open-outline" variante="action" onPress={() => void abrirIa()} />
          {aviso !== '' && <Text style={TIPO.apoio} accessibilityLiveRegion="polite">{aviso}</Text>}
          <Botao rotulo={T.naIa.jaBaixei} variante="secundario" onPress={() => ir({ ...p, passo: 'gerada' })} />
          <Botao rotulo={T.naIa.copiarDeNovo} variante="fantasma"
            onPress={() => void copiarPrompt(montarPromptCapa(motorcycle)).then(() => setAviso(T.naIa.copiado))} />
          <Botao rotulo={comIa(T.naIa.naoInstalado, ia)} variante="fantasma" onPress={() => setNaoAbriu(true)} />
        </>;
      }
      case 'gerada':
        return <>
          <Text style={TIPO.corpo}>{T.gerada.texto}</Text>
          {p.geradaUri ? <>
            <CapaMoto motorcycle={motorcycle} imagem={p.geradaUri} compacta aoCriar={() => {}} aoOpcoes={() => {}} aoDarApelido={() => {}} />
            <Botao rotulo={T.gerada.usar} variante="action" onPress={() => ir({ ...p, passo: 'pronto' })} />
            <Botao rotulo={T.gerada.outra} onPress={() => void escolherGerada()} />
          </> : <Botao rotulo={T.gerada.escolher} icone="images-outline" variante="action" onPress={() => void escolherGerada()} />}
          <View style={styles.linha}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.inkMuted} />
            <Text style={[TIPO.apoio, { flex: 1 }]}>{AVISO_CAPA}</Text>
          </View>
          <Botao rotulo={T.gerada.naoPronta} variante="fantasma" onPress={() => ir({ ...p, passo: 'naIa' })} />
          <Botao rotulo={T.gerada.comTexto} variante="fantasma" onPress={() => setComTexto(!comTexto)} />
          {comTexto && <Ajuda>{T.gerada.comTextoDica}</Ajuda>}
        </>;
      case 'pronto':
        return <>
          {p.geradaUri && <CapaMoto motorcycle={{ ...motorcycle, nickname: validarApelido(apelido) ?? undefined }} imagem={p.geradaUri}
            compacta aoCriar={() => {}} aoOpcoes={() => {}} aoDarApelido={() => {}} />}
          <Text style={TIPO.rotulo}>{T.pronto.apelido}</Text>
          <Campo value={apelido} onChangeText={setApelido} placeholder={T.pronto.apelidoExemplo} maxLength={APELIDO_MAX}
            accessibilityLabel={T.pronto.apelido} />
          <Botao rotulo={T.pronto.salvar} variante="action" disabled={!p.geradaUri || !p.ia} onPress={() => {
            if (!p.geradaUri || !p.ia) return;
            void limparProgresso(motorcycle.id);
            aoSalvar({ uri: p.geradaUri, ia: p.ia, nickname: validarApelido(apelido) });
          }} />
        </>;
    }
  };

  return (
    <Folha visivel={visivel} aoFechar={fechar} titulo={titulo}>
      <ScrollView contentContainerStyle={styles.corpo} keyboardShouldPersistTaps="handled">
        {numero !== undefined && <Text style={TIPO.rotulo} accessibilityRole="header">Passo {numero} de 5</Text>}
        {conteudo()}
        {numero !== undefined && numero > 1 && p.passo !== 'pronto' && (
          <Botao rotulo="Voltar" icone="arrow-back" variante="fantasma"
            onPress={() => ir({ ...p, passo: (['foto', 'ia', 'naIa', 'gerada'] as const)[numero - 2] })} />
        )}
      </ScrollView>
    </Folha>
  );
};

const Item: React.FC<{ icone: NomeIcone; texto: string }> = ({ icone, texto }) => (
  <View style={styles.linha}>
    <Ionicons name={icone} size={22} color={COLORS.ink} />
    <Text style={[TIPO.corpo, { flex: 1, fontSize: 15 }]}>{texto}</Text>
  </View>
);

const styles = StyleSheet.create({
  corpo: { gap: ESPACO.md, paddingBottom: ESPACO.lg },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  dicas: { gap: ESPACO.sm },
  previa: { width: '100%', aspectRatio: 4 / 3, borderRadius: RAIO.md, backgroundColor: COLORS.elevated },
  opcaoIa: {
    minHeight: ALVO.grande, flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, padding: ESPACO.md,
    borderWidth: 1, borderColor: COLORS.lineStrong, borderRadius: RAIO.md,
  },
  opcaoIaAtiva: { borderColor: COLORS.ink, backgroundColor: COLORS.elevated },
  selo: {
    color: COLORS.ink, fontSize: 12, fontWeight: '800', backgroundColor: COLORS.elevated,
    paddingHorizontal: ESPACO.sm, paddingVertical: 2, borderRadius: RAIO.pill, overflow: 'hidden',
  },
  passo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  numero: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { color: COLORS.ink, fontWeight: '800' },
});
