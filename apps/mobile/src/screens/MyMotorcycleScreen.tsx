import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  MAINTENANCE_LABELS,
  parseAnoMoto,
  parseIntervalKm,
  type ConsumableCategory,
  type MaintenanceItemStatus,
  type MaintenanceRecord,
  type Motorcycle,
} from '@motorede/shared';
import { Botao, BotaoIcone } from '../components/ui/Botao';
import { Campo, Cartao, Rotulo, estilosBase } from '../components/ui/Cartao';
import { Folha } from '../components/ui/Folha';
import { InfoAjuda } from '../components/InfoAjuda';
import { CampoIntervalo, FolhaIntervalo } from '../components/CampoIntervalo';
import { FichaIA } from '../components/FichaIA';
import { PlanoManutencao } from '../components/moto/PlanoManutencao';
import { CapaMoto } from '../components/capa/CapaMoto';
import { AssistenteCapa } from '../components/capa/AssistenteCapa';
import { FolhaOpcoesCapa } from '../components/capa/FolhaOpcoesCapa';
import { apagarImagem, escolherDaGaleria, guardarImagem, lerProgresso, type ProgressoCapa } from '../services/capaMoto';
import { COLORS, ESPACO, FONTE_CONDENSADA, TIPO } from '../theme';

/**
 * Minha moto — a mesma tela da web, adaptada ao app.
 *
 * O alvo é a frase do piloto: "troquei o óleo há 900 km, faltam 100 para os
 * 1.000". As duas metades aparecem juntas, e o botão de registrar fica dentro
 * do cartão, com o verbo dele.
 *
 * Registrar troca é um momento de celular — acontece na oficina, com o
 * comprovante na mão. Por isso esta tela existe aqui e não só na web.
 */

interface MyMotorcycleScreenProps {
  motorcycle: Motorcycle | null;
  maintenance: MaintenanceItemStatus[];
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onUpdateKm: (km: number) => void;
  onSaveMotorcycle: (moto: Motorcycle) => void;
  /** null volta ao padrão (ou a nenhum intervalo, no óleo). */
  onSetInterval: (category: ConsumableCategory, km: number | null) => void;
}


export const MyMotorcycleScreen: React.FC<MyMotorcycleScreenProps> = ({
  motorcycle,
  maintenance,
  records,
  onAddRecord,
  onUpdateKm,
  onSaveMotorcycle,
  onSetInterval,
}) => {
  const [registrando, setRegistrando] = useState<ConsumableCategory | null>(null);
  const [km, setKm] = useState('');
  const [produto, setProduto] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [erroIntervalo, setErroIntervalo] = useState(false);
  const [editandoIntervalo, setEditandoIntervalo] = useState<ConsumableCategory | null>(null);
  const [cadastrando, setCadastrando] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [kmInicial, setKmInicial] = useState('');
  const [anoCadastro, setAnoCadastro] = useState('');
  const [erroAno, setErroAno] = useState(false);
  const [editandoKm, setEditandoKm] = useState(false);
  const [kmMoto, setKmMoto] = useState('');
  const [assistente, setAssistente] = useState<ProgressoCapa | null>(null);
  const [opcoesCapa, setOpcoesCapa] = useState<'todas' | 'apelido' | null>(null);
  const motoId = motorcycle?.id;

  // O Android pode ter fechado o app enquanto o piloto estava na IA: retoma o assistente.
  useEffect(() => {
    if (!motoId) return;
    void lerProgresso(motoId).then((p) => {
      if (p && (p.passo === 'naIa' || p.passo === 'gerada' || p.passo === 'pronto')) {
        setAssistente(p.passo === 'naIa' ? { ...p, passo: 'gerada' } : p);
      }
    });
  }, [motoId]);

  const salvarCadastro = () => {
    if (!marca.trim() || !modelo.trim()) return;
    // Antes gravava o ano corrente para toda moto: a ficha pesquisada por IA
    // saía da versão errada (uma 2015 virava 2026).
    const ano = parseAnoMoto(anoCadastro);
    if (ano === null) {
      setErroAno(true);
      return;
    }
    onSaveMotorcycle({
      id: `moto-${Date.now()}`,
      brand: marca.trim(),
      model: modelo.trim(),
      year: ano,
      licensePlate: '',
      currentKm: parseInt(kmInicial, 10) || 0,
      avgKmPerMonth: 0,
      lastKmUpdate: new Date().toISOString(),
    });
    setCadastrando(false);
  };

  // Sem moto, a tela inteira vira o convite — inventar uma foi exatamente o
  // problema que esta tela tinha antes.
  if (!motorcycle) {
    return (
      <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
        <Cartao style={styles.convite}>
          <View style={styles.conviteIcone}>
            <Ionicons name="speedometer" size={36} color={COLORS.ink} />
          </View>
          <Text style={[TIPO.titulo, styles.centro]}>Cadastre sua moto</Text>
          <Text style={[TIPO.apoio, styles.centro]}>
            Marca, modelo e quilometragem para começar a acompanhar as trocas.
          </Text>

          {cadastrando ? (
            <View style={styles.formulario}>
              <Campo value={marca} onChangeText={setMarca} placeholder="Marca (ex: Honda)" accessibilityLabel="Marca" />
              <Campo value={modelo} onChangeText={setModelo} placeholder="Modelo (ex: CB 500X)" accessibilityLabel="Modelo" />
              <Campo
                value={anoCadastro}
                onChangeText={(t) => {
                  setAnoCadastro(t);
                  setErroAno(false);
                }}
                placeholder="Ano/modelo (ex: 2022)"
                keyboardType="number-pad"
                maxLength={4}
                erro={erroAno}
                accessibilityLabel="Ano/modelo"
              />
              {erroAno && <Text style={estilosBase.erro}>Informe o ano da moto, como está no documento (ex: 2022).</Text>}
              <Campo
                value={kmInicial}
                onChangeText={setKmInicial}
                placeholder="Quilometragem atual"
                keyboardType="number-pad"
                accessibilityLabel="Quilometragem atual"
              />
              <Botao rotulo="Salvar" variante="action" onPress={salvarCadastro} />
            </View>
          ) : (
            <Botao
              rotulo="Cadastrar minha moto"
              icone="add"
              variante="action"
              style={styles.largura}
              onPress={() => setCadastrando(true)}
            />
          )}
        </Cartao>
      </ScrollView>
    );
  }

  const abrirRegistro = (categoria: ConsumableCategory) => {
    const ultimo = [...records]
      .filter((r) => r.category === categoria)
      .sort((a, b) => b.km - a.km)[0];
    setRegistrando(categoria);
    setKm(motorcycle.currentKm.toString());
    setProduto(ultimo?.product ?? '');
    setIntervalo(motorcycle.customIntervals?.[categoria]?.toString() ?? '');
    setErroIntervalo(false);
  };

  const abrirIntervalo = (categoria: ConsumableCategory) => {
    setEditandoIntervalo(categoria);
    setIntervalo(motorcycle.customIntervals?.[categoria]?.toString() ?? '');
    setErroIntervalo(false);
  };

  /** Vazio limpa; preenchido precisa ser válido. Volta false se não deu. */
  const aplicarIntervalo = (categoria: ConsumableCategory): boolean => {
    if (!intervalo.trim()) {
      if (motorcycle.customIntervals?.[categoria]) onSetInterval(categoria, null);
      return true;
    }
    const valor = parseIntervalKm(intervalo);
    if (valor === null) {
      setErroIntervalo(true);
      return false;
    }
    if (valor !== motorcycle.customIntervals?.[categoria]) onSetInterval(categoria, valor);
    return true;
  };

  const mudarIntervalo = (v: string) => {
    setIntervalo(v);
    setErroIntervalo(false);
  };

  const salvarRegistro = () => {
    if (!registrando) return;
    const kmNum = parseInt(km, 10);
    if (isNaN(kmNum) || kmNum <= 0) return;
    if (!aplicarIntervalo(registrando)) return;

    onAddRecord({
      motorcycleId: motorcycle.id,
      date: new Date().toISOString(),
      km: kmNum,
      category: registrando,
      title: MAINTENANCE_LABELS[registrando],
      description: '',
      workshopName: '',
      product: produto.trim() || undefined,
      cost: 0,
      hasAttachment: false,
    });

    // A troca aconteceu com a moto nesse km: o odômetro não pode estar atrás.
    if (kmNum > motorcycle.currentKm) onUpdateKm(kmNum);
    setRegistrando(null);
  };

  const trocarCapa = async () => {
    setOpcoesCapa(null);
    const uri = await escolherDaGaleria();
    if (!uri) return;
    const nova = await guardarImagem(uri, 'capa');
    if (motorcycle.coverImageUrl !== nova) apagarImagem(motorcycle.coverImageUrl);
    onSaveMotorcycle({ ...motorcycle, coverImageUrl: nova, coverUpdatedAt: new Date().toISOString() });
  };

  return (
    <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
      {/* A capa substitui o título: o nome da moto já está nela. */}
      <CapaMoto
        motorcycle={motorcycle}
        aoCriar={() => setAssistente({ passo: 'convite' })}
        aoOpcoes={() => setOpcoesCapa('todas')}
        aoDarApelido={() => setOpcoesCapa('apelido')}
      />
      {/* Odômetro como número grande, logo abaixo da capa. */}
      <Cartao>
        {editandoKm ? (
          <View style={styles.linha}>
            <Campo
              value={kmMoto}
              onChangeText={setKmMoto}
              keyboardType="number-pad"
              autoFocus
              style={[styles.campoKm, { flex: 1 }]}
              accessibilityLabel="Quilometragem atual da moto"
            />
            <Botao
              rotulo="Salvar"
              variante="action"
              compacto
              altura={52}
              onPress={() => {
                const v = parseInt(kmMoto, 10);
                if (!isNaN(v) && v > 0) onUpdateKm(v);
                setEditandoKm(false);
              }}
            />
          </View>
        ) : (
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <View style={styles.linhaInfo}>
                <Rotulo>Odômetro</Rotulo>
                <InfoAjuda chave="odometro" />
              </View>
              <Text style={styles.km}>
                {motorcycle.currentKm.toLocaleString('pt-BR')}
                <Text style={styles.kmUnidade}> km</Text>
              </Text>
            </View>
            <BotaoIcone
              icone="pencil"
              rotulo="Editar quilometragem"
              onPress={() => {
                setKmMoto(motorcycle.currentKm.toString());
                setEditandoKm(true);
              }}
            />
          </View>
        )}
      </Cartao>

      <PlanoManutencao maintenance={maintenance} abrirRegistro={abrirRegistro} abrirIntervalo={abrirIntervalo} />

      <FichaIA motorcycle={motorcycle} onSetInterval={onSetInterval} onSaveMotorcycle={onSaveMotorcycle} />

      {records.length > 0 && (
        <Cartao>
          <Rotulo icone="time-outline">HISTÓRICO · {records.length}</Rotulo>
          {[...records]
            .sort((a, b) => b.km - a.km)
            .slice(0, 10)
            .map((r) => (
              <View key={r.id} style={styles.linhaHistorico}>
                <View style={styles.pontoHistorico} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historicoTitulo}>{r.title}</Text>
                  <Text style={styles.origem}>
                    {new Date(r.date).toLocaleDateString('pt-BR')}
                    {r.product ? ` · ${r.product}` : ''}
                  </Text>
                </View>
                <Text style={styles.historicoKm}>{r.km.toLocaleString('pt-BR')} km</Text>
              </View>
            ))}
        </Cartao>
      )}

      {assistente && (
        <AssistenteCapa
          visivel
          motorcycle={motorcycle}
          inicial={assistente}
          aoFechar={() => setAssistente(null)}
          aoSalvar={({ uri, ia, nickname }) => {
            if (motorcycle.coverImageUrl !== uri) apagarImagem(motorcycle.coverImageUrl);
            onSaveMotorcycle({
              ...motorcycle,
              coverImageUrl: uri,
              coverAi: ia,
              coverUpdatedAt: new Date().toISOString(),
              nickname: nickname ?? undefined,
            });
            setAssistente(null);
          }}
        />
      )}

      <FolhaOpcoesCapa
        visivel={opcoesCapa !== null}
        soApelido={opcoesCapa === 'apelido'}
        apelidoAtual={motorcycle.nickname}
        temCapa={!!motorcycle.coverImageUrl}
        aoFechar={() => setOpcoesCapa(null)}
        aoRefazer={() => { setOpcoesCapa(null); setAssistente({ passo: 'foto' }); }}
        aoTrocar={() => void trocarCapa()}
        aoApelido={(nickname) => { onSaveMotorcycle({ ...motorcycle, nickname: nickname ?? undefined }); setOpcoesCapa(null); }}
        aoRemover={() => {
          apagarImagem(motorcycle.coverImageUrl);
          onSaveMotorcycle({ ...motorcycle, coverImageUrl: undefined, coverAi: undefined, coverUpdatedAt: undefined });
          setOpcoesCapa(null);
        }}
      />

      <Folha
        visivel={registrando !== null}
        aoFechar={() => setRegistrando(null)}
        titulo={`Troquei: ${registrando ? MAINTENANCE_LABELS[registrando].toLowerCase() : ''}`}
      >
        <Rotulo>QUILOMETRAGEM NA TROCA</Rotulo>
        <Campo value={km} onChangeText={setKm} keyboardType="number-pad" style={styles.campoKm} accessibilityLabel="Quilometragem da troca" />

        <Rotulo>PRODUTO USADO (OPCIONAL)</Rotulo>
        <Campo value={produto} onChangeText={setProduto} placeholder="ex: Motul 5100 10W40" accessibilityLabel="Produto usado (opcional)" />

        {registrando && (
          <CampoIntervalo category={registrando} valor={intervalo} onChange={mudarIntervalo} erro={erroIntervalo} />
        )}

        <Botao rotulo="Salvar" variante="action" onPress={salvarRegistro} />
        <Botao rotulo="Cancelar" variante="fantasma" onPress={() => setRegistrando(null)} />
      </Folha>

      <FolhaIntervalo
        categoria={editandoIntervalo}
        valor={intervalo}
        onChange={mudarIntervalo}
        erro={erroIntervalo}
        aoFechar={() => setEditandoIntervalo(null)}
        aoSalvar={() => {
          if (editandoIntervalo && aplicarIntervalo(editandoIntervalo)) setEditandoIntervalo(null);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  convite: { alignItems: 'center', paddingVertical: ESPACO.xl, gap: ESPACO.lg },
  conviteIcone: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { textAlign: 'center' },
  formulario: { gap: ESPACO.md, alignSelf: 'stretch' },
  largura: { alignSelf: 'stretch' },
  linha: { flexDirection: 'row', gap: ESPACO.sm, alignItems: 'center' },
  km: {
    color: COLORS.ink,
    fontSize: 40,
    fontWeight: '800',
    fontFamily: FONTE_CONDENSADA,
    letterSpacing: 1,
    marginTop: ESPACO.xs,
  },
  kmUnidade: { color: COLORS.inkMuted, fontSize: 18, fontWeight: '700' },
  campoKm: { fontSize: 20, fontWeight: '700' },
  origem: { color: COLORS.inkMuted, fontSize: 13 },
  linhaHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  pontoHistorico: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lineStrong },
  historicoTitulo: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  historicoKm: { color: COLORS.inkMuted, fontSize: 14, fontWeight: '700' },
});
