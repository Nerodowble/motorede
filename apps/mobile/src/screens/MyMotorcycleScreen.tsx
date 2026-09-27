import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  MAINTENANCE_LABELS,
  describeIntervalSource,
  sortByUrgency,
  type ConsumableCategory,
  type MaintenanceItemStatus,
  type MaintenanceRecord,
  type Motorcycle,
} from '@motorede/shared';
import { Botao, BotaoIcone, type NomeIcone } from '../components/ui/Botao';
import { Ajuda, Campo, Cartao, Rotulo, TituloCartao, estilosBase } from '../components/ui/Cartao';
import { Folha } from '../components/ui/Folha';
import { COLORS, ESPACO, FONTE_CONDENSADA, RAIO, TIPO } from '../theme';

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

/*
 * Status sem âmbar e sem verde: essas duas cores já querem dizer "falando" e
 * "microfone aberto". O que distingue o status é ícone + palavra + cor da
 * barra, em escala de atenção: vencido (vermelho claro), se aproximando
 * (branco, cheio), em dia (cinza, calmo).
 */
const CORES_STATUS: Record<MaintenanceItemStatus['status'], string> = {
  vencido: COLORS.dangerText,
  proximo: COLORS.ink,
  ok: COLORS.inkFaint,
  'sem-registro': COLORS.inkFaint,
};

const ICONES_STATUS: Record<MaintenanceItemStatus['status'], NomeIcone> = {
  vencido: 'alert-circle',
  proximo: 'time',
  ok: 'checkmark-circle',
  'sem-registro': 'ellipse-outline',
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
              <Campo value={marca} onChangeText={setMarca} placeholder="Marca (ex: Honda)" />
              <Campo value={modelo} onChangeText={setModelo} placeholder="Modelo (ex: CB 500X)" />
              <Campo
                value={kmInicial}
                onChangeText={setKmInicial}
                placeholder="Quilometragem atual"
                keyboardType="number-pad"
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
    <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
      {/* Painel da moto: nome em cima, o odômetro como número grande. */}
      <Cartao>
        <TituloCartao icone="speedometer">
          {motorcycle.brand} {motorcycle.model}
        </TituloCartao>
        {editandoKm ? (
          <View style={styles.linha}>
            <Campo
              value={kmMoto}
              onChangeText={setKmMoto}
              keyboardType="number-pad"
              autoFocus
              style={[styles.campoKm, { flex: 1 }]}
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
              <Rotulo>Odômetro</Rotulo>
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

      {sortByUrgency(maintenance).map((item) => {
        const cor = CORES_STATUS[item.status];
        const semRegistro = item.status === 'sem-registro';
        const progresso =
          item.intervalKm && item.kmSinceLast !== undefined
            ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
            : 0;

        return (
          <Cartao
            key={item.category}
            destaque={item.status === 'vencido' ? COLORS.dangerText : undefined}
          >
            <Rotulo
              direita={
                ROTULOS_STATUS[item.status] !== '' && (
                  <View style={styles.status}>
                    <Ionicons name={ICONES_STATUS[item.status]} size={16} color={cor} />
                    <Text style={[styles.statusTexto, { color: cor }]}>
                      {ROTULOS_STATUS[item.status]}
                    </Text>
                  </View>
                )
              }
            >
              {item.label.toUpperCase()}
            </Rotulo>

            {semRegistro ? (
              <Ajuda>Sem registro ainda.</Ajuda>
            ) : (
              <>
                {/* As duas metades da frase: o que passou e o que falta. */}
                <Text style={styles.frase}>
                  rodou {item.kmSinceLast!.toLocaleString('pt-BR')} km
                  <Text
                    style={[
                      styles.fraseResto,
                      { color: item.status === 'ok' ? COLORS.inkMuted : cor },
                    ]}
                  >
                    {item.kmRemaining! > 0
                      ? ` · faltam ${item.kmRemaining!.toLocaleString('pt-BR')}`
                      : ` · ${Math.abs(item.kmRemaining!).toLocaleString('pt-BR')} km além`}
                  </Text>
                </Text>

                <View style={styles.trilha}>
                  <View style={[styles.barra, { width: `${progresso}%`, backgroundColor: cor }]} />
                </View>

                <Text style={styles.detalhe}>
                  última: {item.last!.km.toLocaleString('pt-BR')} km ·{' '}
                  {new Date(item.last!.date).toLocaleDateString('pt-BR')}
                  {item.last!.product ? ` · ${item.last!.product}` : ''}
                </Text>

                <Text style={styles.origem}>
                  {describeIntervalSource(item.intervalSource!, item.intervalKm!, item.recordCount)}
                </Text>
              </>
            )}

            <Botao
              rotulo={semRegistro ? 'Registrar primeira' : `Troquei: ${item.label.toLowerCase()}`}
              icone="add"
              compacto
              onPress={() => abrirRegistro(item.category)}
            />
          </Cartao>
        );
      })}

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

      <Folha
        visivel={registrando !== null}
        aoFechar={() => setRegistrando(null)}
        titulo={`Troquei: ${registrando ? MAINTENANCE_LABELS[registrando].toLowerCase() : ''}`}
      >
        <Rotulo>QUILOMETRAGEM NA TROCA</Rotulo>
        <Campo value={km} onChangeText={setKm} keyboardType="number-pad" style={styles.campoKm} />

        <Rotulo>PRODUTO USADO (OPCIONAL)</Rotulo>
        <Campo value={produto} onChangeText={setProduto} placeholder="ex: Motul 5100 10W40" />

        <Botao rotulo="Salvar" variante="action" onPress={salvarRegistro} />
        <Botao rotulo="Cancelar" variante="fantasma" onPress={() => setRegistrando(null)} />
      </Folha>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  status: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs },
  statusTexto: { fontSize: 13, fontWeight: '800' },
  trilha: {
    height: 8,
    borderRadius: RAIO.pill,
    backgroundColor: COLORS.elevated,
    overflow: 'hidden',
  },
  barra: { height: '100%', borderRadius: RAIO.pill },
  frase: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  fraseResto: { fontWeight: '600' },
  detalhe: { color: COLORS.inkMuted, fontSize: 13 },
  origem: { color: COLORS.inkFaint, fontSize: 12 },
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
