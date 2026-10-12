import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRotasNovas } from '../../packages/shared/src/domain/importacaoRotas.ts';

const valida = () => ({
  id: 'serra-teste-sc', nome: 'Serra Teste (SC-000)', regiao: 'SC, Brasil',
  inicio: { cidade: 'Início', lat: -28.1, lng: -49.1 }, fim: { cidade: 'Fim', lat: -28.3, lng: -49.4 },
  distanciaKm: 40, pavimento: 'asfalto', curvas: 'alto', trechoSemPostoKm: 25,
  pedagioIda: 5.5,
  pedagios: [
    { nome: 'Praça A', valorMoto: 2.25, sistema: 'fisica', fonte: 'https://exemplo.com/a' },
    { nome: 'Pórtico B', valorMoto: 3.25, sistema: 'free_flow' },
  ],
  pontosApoio: [{ nome: 'Posto', tipo: 'posto_gasolina', descricao: 'Último antes da serra.', lat: -28.1, lng: -49.1 }],
  revisao: '2026-10-12', descricao: 'Texto.', dificuldade: 'intermediario', melhorEpoca: 'Março a outubro.',
  observacoes: ['Neblina no topo.'], fontes: ['https://exemplo.com/1', 'https://exemplo.com/2'],
});

test('rota completa é aceita e mantém o formato do catálogo', () => {
  const { rotas, erros } = validarRotasNovas([valida()], ['outra-rota-sp']);
  assert.deepEqual(erros, []);
  assert.equal(rotas.length, 1);
  assert.equal(rotas[0].pedagios?.length, 2);
  assert.equal(rotas[0].pedagios?.[1].fonte, undefined);
});

test('id repetido no catálogo ou no próprio arquivo é rejeitado', () => {
  assert.match(validarRotasNovas([valida()], ['serra-teste-sc']).erros[0], /já existe/);
  assert.match(validarRotasNovas([{ ...valida(), fontes: [] }], ['serra-teste-sc']).erros.join(), /já existe/);
  const { rotas, erros } = validarRotasNovas([valida(), valida()], []);
  assert.equal(rotas.length, 0);
  assert.match(erros[0], /já existe/);
});

test('soma das praças precisa bater com pedagioIda', () => {
  const erros = validarRotasNovas([{ ...valida(), pedagioIda: 6 }], []).erros;
  assert.match(erros.join(), /soma das praças/);
});

test('pedágio zero exige lista explícita; desconhecido usa null sem praças', () => {
  const { pedagios: _p, ...semLista } = valida();
  assert.match(validarRotasNovas([{ ...semLista, pedagioIda: 0 }], []).erros.join(), /pedagios ausente/);
  assert.deepEqual(validarRotasNovas([{ ...semLista, pedagioIda: null }], []).erros, []);
  assert.deepEqual(validarRotasNovas([{ ...valida(), pedagioIda: 0, pedagios: [] }], []).erros, []);
  assert.match(validarRotasNovas([{ ...valida(), pedagioIda: null }], []).erros.join(), /pedagioIda null/);
});

test('coordenadas fora do Brasil ou invertidas são rejeitadas', () => {
  const invertida = { ...valida(), inicio: { cidade: 'Início', lat: -49.1, lng: -28.1 } };
  assert.match(validarRotasNovas([invertida], []).erros.join(), /inicio: lat\/lng fora do Brasil/);
});

test('exige posto, fontes, data e campos conhecidos', () => {
  const rota = {
    ...valida(), pontosApoio: [{ nome: 'Mirante', tipo: 'mirante', descricao: 'Vista.', lat: -28.2, lng: -49.2 }],
    fontes: ['https://exemplo.com/1'], revisao: '12/10/2026', pedagio_ida: 3,
  };
  const erros = validarRotasNovas([rota], []).erros.join('\n');
  assert.match(erros, /posto_gasolina/);
  assert.match(erros, /fontes/);
  assert.match(erros, /revisao/);
  assert.match(erros, /campos desconhecidos: pedagio_ida/);
});

test('rotas curtas, enums inválidos e entrada vazia são recusados', () => {
  const erros = validarRotasNovas([{ ...valida(), distanciaKm: 10, pavimento: 'cascalho', id: 'Sem Sigla' }], []).erros.join('\n');
  assert.match(erros, /distanciaKm/);
  assert.match(erros, /pavimento/);
  assert.match(erros, /kebab-case/);
  assert.equal(validarRotasNovas([], []).erros.length, 1);
  assert.equal(validarRotasNovas({}, []).erros.length, 1);
});
