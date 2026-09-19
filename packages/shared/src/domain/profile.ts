import { normalizePhone } from './convoy.js';

/**
 * Perfil do piloto.
 *
 * Desenhado para migrar: hoje vive no aparelho, amanhã vira linha de tabela.
 * Por isso tem `id` estável, marcas de tempo e `source` — nada aqui depende de
 * ser local.
 *
 * `source` é o campo que evita uma mentira futura. Perfil local **não é
 * autenticação**: qualquer um edita o armazenamento do próprio aparelho e vira
 * quem quiser. Ele serve para o piloto ser reconhecido no comboio, não para
 * provar quem é ao servidor.
 *
 * Só `google` carrega verificação de verdade, porque o servidor confere a
 * assinatura contra as chaves públicas do Google. Quando houver banco e
 * privilégios (admin de evento, dono de comboio), é `source` que decide em quem
 * confiar.
 */

export type ProfileSource = 'local' | 'google';

export interface RiderProfile {
  /**
   * Identificador estável do piloto.
   * Local: gerado no aparelho. Google: `g-<sub>`. Com banco: o id da tabela.
   */
  id: string;
  name: string;
  email: string;
  /** Somente dígitos, normalizado. Vazio quando não informado. */
  phone: string;
  source: ProfileSource;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInput {
  name: string;
  email: string;
  phone: string;
}

export interface ProfileValidation {
  valid: boolean;
  errors: Partial<Record<keyof ProfileInput, string>>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida o que o piloto digitou.
 *
 * Só o nome é obrigatório: é o que aparece para os outros no comboio. E-mail e
 * telefone são úteis mas não impedem ninguém de conversar — exigir cadastro
 * completo para falar seria atrito sem contrapartida.
 */
export function validateProfile(input: ProfileInput): ProfileValidation {
  const errors: ProfileValidation['errors'] = {};

  if (!input.name.trim()) {
    errors.name = 'Como os outros pilotos vão te chamar?';
  } else if (input.name.trim().length < 2) {
    errors.name = 'Nome muito curto.';
  }

  if (input.email.trim() && !EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = 'E-mail parece incompleto.';
  }

  if (input.phone.trim() && !normalizePhone(input.phone)) {
    errors.phone = 'Telefone precisa ter DDD e número.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Monta um perfil novo a partir do que foi digitado. */
export function createLocalProfile(input: ProfileInput): RiderProfile {
  const agora = new Date().toISOString();
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: normalizePhone(input.phone),
    source: 'local',
    createdAt: agora,
    updatedAt: agora,
  };
}

/** Converte a identidade verificada do Google em perfil. */
export function profileFromGoogle(google: {
  sub: string;
  name: string;
  email: string;
}): RiderProfile {
  const agora = new Date().toISOString();
  return {
    id: `g-${google.sub}`,
    name: google.name,
    email: google.email.toLowerCase(),
    phone: '',
    source: 'google',
    createdAt: agora,
    updatedAt: agora,
  };
}

export function updateProfile(
  atual: RiderProfile,
  input: Partial<ProfileInput>
): RiderProfile {
  return {
    ...atual,
    name: input.name?.trim() || atual.name,
    email: input.email !== undefined ? input.email.trim().toLowerCase() : atual.email,
    phone: input.phone !== undefined ? normalizePhone(input.phone) : atual.phone,
    updatedAt: new Date().toISOString(),
  };
}
