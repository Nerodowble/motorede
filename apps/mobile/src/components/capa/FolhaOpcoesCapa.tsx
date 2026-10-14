import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { APELIDO_MAX, TEXTOS_CAPA, validarApelido } from '@motorede/shared';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Cartao';
import { Folha } from '../ui/Folha';
import { TIPO } from '../../theme';

const T = TEXTOS_CAPA.opcoes;

/** Opções da capa já criada, e também a edição rápida do apelido. */
export const FolhaOpcoesCapa: React.FC<{
  visivel: boolean;
  soApelido: boolean;
  apelidoAtual?: string;
  temCapa: boolean;
  aoFechar: () => void;
  aoRefazer: () => void;
  aoTrocar: () => void;
  aoApelido: (apelido: string | null) => void;
  aoRemover: () => void;
}> = ({ visivel, soApelido, apelidoAtual, temCapa, aoFechar, aoRefazer, aoTrocar, aoApelido, aoRemover }) => {
  const [editando, setEditando] = useState(soApelido);
  const [confirmando, setConfirmando] = useState(false);
  const [apelido, setApelido] = useState(apelidoAtual ?? '');

  useEffect(() => {
    if (!visivel) return;
    setEditando(soApelido);
    setConfirmando(false);
    setApelido(apelidoAtual ?? '');
  }, [visivel, soApelido, apelidoAtual]);

  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={editando ? TEXTOS_CAPA.pronto.apelido : T.titulo}>
      {editando ? <>
        <Campo value={apelido} onChangeText={setApelido} placeholder={TEXTOS_CAPA.pronto.apelidoExemplo}
          maxLength={APELIDO_MAX} autoFocus accessibilityLabel={TEXTOS_CAPA.pronto.apelido} />
        <Botao rotulo="Salvar" variante="action" onPress={() => aoApelido(validarApelido(apelido))} />
      </> : confirmando ? <>
        <Text style={TIPO.corpo}>{T.removerConfirma}</Text>
        <Botao rotulo="Remover" variante="perigo" onPress={aoRemover} />
        <Botao rotulo="Cancelar" variante="fantasma" onPress={() => setConfirmando(false)} />
      </> : <>
        <Botao rotulo={T.refazer} icone="sparkles" onPress={aoRefazer} />
        <Botao rotulo={T.trocar} icone="images-outline" onPress={aoTrocar} />
        <Botao rotulo={T.apelido} icone="pencil" onPress={() => setEditando(true)} />
        {temCapa && <Botao rotulo={T.remover} icone="trash-outline" variante="perigo" onPress={() => setConfirmando(true)} />}
      </>}
    </Folha>
  );
};
