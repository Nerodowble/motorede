import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  MAINTENANCE_LABELS,
  describeIntervalSource,
  sortByUrgency,
  type ConsumableCategory,
  type MaintenanceItemStatus,
  type MaintenanceRecord,
  type Motorcycle,
} from '@motorede/shared';
import { COLORS } from '../theme';

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
}

const CORES_STATUS: Record<MaintenanceItemStatus['status'], string> = {
  vencido: COLORS.danger,
  proximo: COLORS.accent,
  ok: COLORS.success,
  'sem-registro': COLORS.faint,
};

const ROTULOS_STATUS: Record<MaintenanceItemStatus['status'], string> = {
  vencido: 'vencido',
  proximo: 'se aproximando',
  ok: 'em dia',
  'sem-registro': '',
};

export const MyMotorcycleScreen: React.FC<MyMotorcycleScreenProps> = ({
  motorcycle,
  maintenance,
  records,
  onAddRecord,
  onUpdateKm,
  onSaveMotorcycle,
}) => {
  const [registrando, setRegistrando] = useState<ConsumableCategory | null>(null);
  const [km, setKm] = useState('');
  const [produto, setProduto] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [kmInicial, setKmInicial] = useState('');
  const [editandoKm, setEditandoKm] = useState(false);
  const [kmMoto, setKmMoto] = useState('');

  const salvarCadastro = () => {
    if (!marca.trim() || !modelo.trim()) return;
    onSaveMotorcycle({
      id: `moto-${Date.now()}`,
      brand: marca.trim(),
      model: modelo.trim(),
      year: new Date().getFullYear(),
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
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Você ainda não cadastrou a moto</Text>
          <Text style={styles.ajuda}>
            Cadastre marca, modelo e quilometragem para começar a acompanhar as trocas.
          </Text>

          {cadastrando ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={marca}
                onChangeText={setMarca}
                placeholder="Marca (ex: Honda)"
                placeholderTextColor={COLORS.faint}
                style={styles.input}
              />
              <TextInput
                value={modelo}
                onChangeText={setModelo}
                placeholder="Modelo (ex: CB 500X)"
                placeholderTextColor={COLORS.faint}
                style={styles.input}
              />
              <TextInput
                value={kmInicial}
                onChangeText={setKmInicial}
                placeholder="Quilometragem atual"
                placeholderTextColor={COLORS.faint}
                keyboardType="number-pad"
                style={styles.input}
              />
              <Pressable onPress={salvarCadastro} style={styles.botaoPrincipal}>
                <Text style={styles.botaoPrincipalTexto}>Salvar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setCadastrando(true)} style={styles.botaoPrincipal}>
              <Text style={styles.botaoPrincipalTexto}>Cadastrar minha moto</Text>
            </Pressable>
          )}
        </View>
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
  };

  const salvarRegistro = () => {
    if (!registrando) return;
    const kmNum = parseInt(km, 10);
    if (isNaN(kmNum) || kmNum <= 0) return;

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

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <View style={styles.card}>
        <Text style={styles.nomeMoto}>
          {motorcycle.brand} {motorcycle.model}
        </Text>
        {editandoKm ? (
          <View style={styles.linhaKm}>
            <TextInput
              value={kmMoto}
              onChangeText={setKmMoto}
              keyboardType="number-pad"
              autoFocus
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable
              onPress={() => {
                const v = parseInt(kmMoto, 10);
                if (!isNaN(v) && v > 0) onUpdateKm(v);
                setEditandoKm(false);
              }}
              style={styles.botaoPequeno}
            >
              <Text style={styles.botaoPequenoTexto}>Salvar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setKmMoto(motorcycle.currentKm.toString());
              setEditandoKm(true);
            }}
          >
            <Text style={styles.km}>
              {motorcycle.currentKm.toLocaleString('pt-BR')} km · tocar para editar
            </Text>
          </Pressable>
        )}
      </View>

      {sortByUrgency(maintenance).map((item) => {
        const cor = CORES_STATUS[item.status];
        const semRegistro = item.status === 'sem-registro';
        const progresso =
          item.intervalKm && item.kmSinceLast !== undefined
            ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
            : 0;

        return (
          <View key={item.category} style={styles.card}>
            <View style={styles.cabecalhoItem}>
              <Text style={styles.rotuloItem}>{item.label.toUpperCase()}</Text>
              {ROTULOS_STATUS[item.status] !== '' && (
                <Text style={[styles.statusItem, { color: cor }]}>
                  {ROTULOS_STATUS[item.status]}
                </Text>
              )}
            </View>

            {semRegistro ? (
              <Text style={styles.ajuda}>Sem registro ainda.</Text>
            ) : (
              <>
                <View style={styles.trilha}>
                  <View
                    style={[styles.barra, { width: `${progresso}%`, backgroundColor: cor }]}
                  />
                </View>

                {/* As duas metades da frase: o que passou e o que falta. */}
                <Text style={styles.frase}>
                  rodou {item.kmSinceLast!.toLocaleString('pt-BR')} km
                  <Text style={{ color: cor, fontWeight: '400' }}>
                    {item.kmRemaining! > 0
                      ? ` · faltam ${item.kmRemaining!.toLocaleString('pt-BR')}`
                      : ` · ${Math.abs(item.kmRemaining!).toLocaleString('pt-BR')} km além`}
                  </Text>
                </Text>

                <Text style={styles.detalhe}>
                  última: {item.last!.km.toLocaleString('pt-BR')} km ·{' '}
                  {new Date(item.last!.date).toLocaleDateString('pt-BR')}
                  {item.last!.product ? ` · ${item.last!.product}` : ''}
                </Text>

                <Text style={styles.origem}>
                  {describeIntervalSource(
                    item.intervalSource!,
                    item.intervalKm!,
                    item.recordCount
                  )}
                </Text>
              </>
            )}

            <Pressable
              onPress={() => abrirRegistro(item.category)}
              style={({ pressed }) => [styles.botaoSecundario, pressed && styles.pressionado]}
            >
              <Text style={styles.botaoSecundarioTexto}>
                {semRegistro
                  ? '+ Registrar primeira'
                  : `+ Troquei: ${item.label.toLowerCase()}`}
              </Text>
            </Pressable>
          </View>
        );
      })}

      {records.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.rotuloItem}>HISTÓRICO ({records.length})</Text>
          {[...records]
            .sort((a, b) => b.km - a.km)
            .slice(0, 10)
            .map((r) => (
              <View key={r.id} style={styles.linhaHistorico}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detalhe}>{r.title}</Text>
                  <Text style={styles.origem}>
                    {new Date(r.date).toLocaleDateString('pt-BR')}
                    {r.product ? ` · ${r.product}` : ''}
                  </Text>
                </View>
                <Text style={styles.detalhe}>{r.km.toLocaleString('pt-BR')} km</Text>
              </View>
            ))}
        </View>
      )}

      <Modal visible={registrando !== null} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.modal}>
            <Text style={styles.titulo}>
              Troquei: {registrando ? MAINTENANCE_LABELS[registrando].toLowerCase() : ''}
            </Text>

            <Text style={styles.rotuloCampo}>Quilometragem na troca</Text>
            <TextInput
              value={km}
              onChangeText={setKm}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.rotuloCampo}>Produto usado (opcional)</Text>
            <TextInput
              value={produto}
              onChangeText={setProduto}
              placeholder="ex: Motul 5100 10W40"
              placeholderTextColor={COLORS.faint}
              style={styles.input}
            />

            <Pressable onPress={salvarRegistro} style={styles.botaoPrincipal}>
              <Text style={styles.botaoPrincipalTexto}>Salvar</Text>
            </Pressable>
            <Pressable onPress={() => setRegistrando(null)} style={styles.botaoTexto}>
              <Text style={styles.ajuda}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 8,
  },
  nomeMoto: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  km: { color: COLORS.accent, fontSize: 13, fontFamily: 'monospace' },
  linhaKm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cabecalhoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rotuloItem: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statusItem: { fontSize: 10, fontWeight: '800' },
  trilha: { height: 5, borderRadius: 3, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  barra: { height: '100%' },
  frase: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  detalhe: { color: COLORS.muted, fontSize: 11 },
  origem: { color: COLORS.faint, fontSize: 10 },
  ajuda: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  titulo: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  rotuloCampo: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  botaoPrincipal: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPrincipalTexto: { color: COLORS.background, fontWeight: '800', fontSize: 14 },
  botaoSecundario: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoSecundarioTexto: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  botaoPequeno: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoPequenoTexto: { color: COLORS.background, fontWeight: '800', fontSize: 12 },
  botaoTexto: { alignItems: 'center', paddingVertical: 8 },
  pressionado: { opacity: 0.7 },
  linhaHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 20,
    gap: 8,
  },
});
