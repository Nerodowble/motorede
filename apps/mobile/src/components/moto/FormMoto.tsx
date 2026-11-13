import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { parseAnoMoto, type Motorcycle } from '@motorede/shared';
import { Botao } from '../ui/Botao';
import { Campo, estilosBase } from '../ui/Cartao';
import { ESPACO } from '../../theme';

/**
 * Marca, modelo, ano, quilometragem e placa — o mesmo formulário para a
 * primeira moto, para uma moto a mais na garagem e para corrigir uma que já
 * existe. Editando, o resto da moto (capa, intervalos, ficha) é preservado.
 */
export const FormMoto: React.FC<{
  /** Moto a editar; sem ela, cadastra uma nova. */
  moto?: Motorcycle;
  aoSalvar: (moto: Motorcycle) => void;
  aoCancelar?: () => void;
}> = ({ moto, aoSalvar, aoCancelar }) => {
  const [marca, setMarca] = useState(moto?.brand ?? '');
  const [modelo, setModelo] = useState(moto?.model ?? '');
  const [ano, setAno] = useState(moto?.year ? String(moto.year) : '');
  const [km, setKm] = useState(moto ? String(moto.currentKm) : '');
  const [placa, setPlaca] = useState(moto?.licensePlate ?? '');
  const [erroAno, setErroAno] = useState(false);
  const [erroNome, setErroNome] = useState(false);

  const salvar = () => {
    if (!marca.trim() || !modelo.trim()) {
      setErroNome(true);
      return;
    }
    // Antes gravava o ano corrente para toda moto: a ficha pesquisada por IA
    // saía da versão errada (uma 2015 virava 2026).
    const anoNum = parseAnoMoto(ano);
    if (anoNum === null) {
      setErroAno(true);
      return;
    }
    const kmNum = parseInt(km, 10);
    const kmValido = !isNaN(kmNum) && kmNum >= 0 ? kmNum : moto?.currentKm ?? 0;
    const agora = new Date().toISOString();
    aoSalvar({
      ...(moto ?? { id: `moto-${Date.now()}`, avgKmPerMonth: 0 }),
      brand: marca.trim(),
      model: modelo.trim(),
      year: anoNum,
      licensePlate: placa.trim().toUpperCase(),
      currentKm: kmValido,
      lastKmUpdate: kmValido !== moto?.currentKm ? agora : moto?.lastKmUpdate ?? agora,
    } as Motorcycle);
  };

  return (
    <View style={styles.formulario}>
      <Campo
        value={marca}
        onChangeText={(t) => { setMarca(t); setErroNome(false); }}
        placeholder="Marca (ex: Honda)"
        erro={erroNome && !marca.trim()}
        accessibilityLabel="Marca"
      />
      <Campo
        value={modelo}
        onChangeText={(t) => { setModelo(t); setErroNome(false); }}
        placeholder="Modelo (ex: CB 500X)"
        erro={erroNome && !modelo.trim()}
        accessibilityLabel="Modelo"
      />
      {erroNome && <Text style={estilosBase.erro}>Informe a marca e o modelo.</Text>}
      <Campo
        value={ano}
        onChangeText={(t) => { setAno(t); setErroAno(false); }}
        placeholder="Ano/modelo (ex: 2022)"
        keyboardType="number-pad"
        maxLength={4}
        erro={erroAno}
        accessibilityLabel="Ano/modelo"
      />
      {erroAno && <Text style={estilosBase.erro}>Informe o ano da moto, como está no documento (ex: 2022).</Text>}
      <Campo
        value={km}
        onChangeText={setKm}
        placeholder="Quilometragem atual"
        keyboardType="number-pad"
        accessibilityLabel="Quilometragem atual"
      />
      <Campo
        value={placa}
        onChangeText={setPlaca}
        placeholder="Placa (opcional)"
        autoCapitalize="characters"
        maxLength={8}
        accessibilityLabel="Placa (opcional)"
      />
      <Botao rotulo="Salvar" variante="action" onPress={salvar} />
      {aoCancelar && <Botao rotulo="Cancelar" variante="fantasma" onPress={aoCancelar} />}
    </View>
  );
};

const styles = StyleSheet.create({
  formulario: { gap: ESPACO.md, alignSelf: 'stretch' },
});
