import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apkNovoDisponivel, lerVersao } from '../../packages/shared/src/domain/versaoApk.ts';

test('lê a tag da release e a versão do app', () => {
  assert.deepEqual(lerVersao('v0.4.0'), [0, 4, 0]);
  assert.deepEqual(lerVersao('0.10'), [0, 10, 0]);
  assert.equal(lerVersao('latest'), null);
});

test('só avisa quando a release é mais nova que a instalada', () => {
  assert.equal(apkNovoDisponivel('0.4.0', 'v0.5.0'), true);
  assert.equal(apkNovoDisponivel('0.4.0', 'v0.4.1'), true);
  assert.equal(apkNovoDisponivel('0.4.0', 'v0.10.0'), true); // não compara como texto
  assert.equal(apkNovoDisponivel('0.4.0', 'v0.4.0'), false);
  assert.equal(apkNovoDisponivel('0.5.0', 'v0.4.0'), false);
});

test('na dúvida não incomoda', () => {
  assert.equal(apkNovoDisponivel(null, 'v0.5.0'), false);
  assert.equal(apkNovoDisponivel('0.4.0', null), false);
  assert.equal(apkNovoDisponivel('0.4.0', 'nightly'), false);
});
