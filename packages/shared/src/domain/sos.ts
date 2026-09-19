/**
 * Pedido de ajuda: quem é avisado, quando, e o que cada um enxerga.
 *
 * O PROBLEMA CENTRAL
 *
 * Um pedido de socorro diz, em uma frase: "estou sozinho, parado, sem
 * condições de sair daqui, e este é o meu endereço exato". É exatamente a
 * informação que um assaltante quer. Transmitir isso para todo mundo num raio
 * de 25 km não cria uma rede de ajuda — cria uma lista de alvos.
 *
 * Não existe forma gratuita de provar que um desconhecido é bem-intencionado.
 * Quem tenta (e são sistemas caros) usa documento, antecedentes e seguro. O que
 * dá para fazer é outra coisa: **diminuir o que um mal-intencionado ganha e
 * aumentar o que ele arrisca.** Três decisões fazem esse trabalho:
 *
 * 1. O alerta carrega uma REGIÃO, não um ponto. O endereço exato só vai para
 *    quem o pedinte aceitar, um por um.
 * 2. Para responder é preciso estar identificado e aparecer de cara limpa —
 *    nome, moto, distância. Quem pede vê quem vem antes de liberar o endereço.
 * 3. O aviso vai primeiro para quem já andou junto. Só se ninguém conhecido
 *    atender é que ele abre para desconhecidos.
 *
 * Nada disso é garantia, e o app não deve dizer que é.
 */

/** Coordenada simples; o mesmo formato usado pelo GPS do aparelho. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Duas coisas diferentes, de propósito separadas.
 *
 * `emergencia` é o piloto parado na estrada. `apoio` é o motoboy pedindo uma
 * mão com uma entrega. Misturar as duas destrói a primeira: se a maior parte
 * dos alertas vermelhos for "alguém pega esse pacote pra mim?", as pessoas
 * param de reagir ao vermelho — e no dia do acidente ninguém olha.
 */
export type RequestKind = 'emergencia' | 'apoio';

export type EmergencyKind =
  | 'mechanical_breakdown'
  | 'flat_tire'
  | 'out_of_fuel'
  | 'electrical_battery'
  | 'accident_fall';

/**
 * Quem já andou com quem.
 *
 * `conhecido` é quem o pedinte guardou como contato. `comboio` é quem dividiu
 * um comboio com ele — não é amizade, mas é um passado em comum verificável
 * pelo app, e não se falsifica sozinho. `comunidade` é o resto.
 */
export type TrustTier = 'conhecido' | 'comboio' | 'comunidade';

export const TRUST_ORDER: readonly TrustTier[] = ['conhecido', 'comboio', 'comunidade'];

/**
 * Quanto tempo até o aviso abrir para o círculo seguinte.
 *
 * Esperar tem custo real — são minutos de alguém parado no acostamento. Por
 * isso a espera é curta, e some quando há risco de vida.
 */
export const ABERTURA_SEGUNDOS: Record<TrustTier, number> = {
  conhecido: 0,
  comboio: 45,
  comunidade: 120,
};

/** Lado do quadrado usado para embaralhar a posição divulgada. */
export const CELULA_APROXIMACAO_KM = 1;

export interface HelpRequest {
  id: string;
  kind: RequestKind;
  /** Só faz sentido em `emergencia`. */
  emergency?: EmergencyKind;
  requesterId: string;
  requesterName: string;
  /** Posição real. Nunca sai daqui para quem não foi aceito. */
  precise: GeoPoint;
  /** O que o pedinte escreveu: "BR-116, km 230, sentido Rio". */
  reference: string;
  details: string;
  radiusKm: number;
  createdAt: string;
  status: 'aberto' | 'a-caminho' | 'resolvido' | 'cancelado';
  /** Quem se ofereceu, na ordem em que chegou. */
  offers: HelpOffer[];
  /** Ids de quem o pedinte aceitou. Só estes recebem o endereço exato. */
  acceptedIds: string[];
}

export interface HelpOffer {
  helperId: string;
  helperName: string;
  /** Identificado pelo Google, ou só um perfil local. */
  verified: boolean;
  motorcycle: string;
  /** Aproximada também: a exposição é dos dois lados. */
  approx: GeoPoint;
  distanceKm: number;
  tier: TrustTier;
  /** Quantas vezes já ajudou com confirmação de quem pediu. */
  confirmedHelps: number;
  offeredAt: string;
}

/**
 * Embaralha a posição para um quadrado de ~1 km.
 *
 * Grade fixa, não deslocamento aleatório. Um deslocamento sorteado a cada
 * pedido parece mais seguro, mas vaza o contrário: com vários pedidos do mesmo
 * lugar, a média dos pontos sorteados converge para a posição verdadeira. A
 * grade é estável — o mesmo lugar sempre cai na mesma célula, então repetir o
 * pedido não revela nada de novo.
 *
 * O quadrado da longitude é corrigido pela latitude, senão as células ficam
 * estreitas perto do equador e largas no sul do país.
 */
export function coarsenLocation(p: GeoPoint, cellKm = CELULA_APROXIMACAO_KM): GeoPoint {
  const grauLat = cellKm / 111.32;
  const centro = (valor: number, passo: number) =>
    Number(((Math.floor(valor / passo) + 0.5) * passo).toFixed(6));

  const lat = centro(p.lat, grauLat);

  // O passo da longitude sai da latitude JÁ ENCAIXADA, não da original. Tirado
  // da latitude bruta, cada ponto calcularia um passo um pouco diferente e
  // portanto uma grade própria — duas pessoas lado a lado cairiam em células
  // distintas, e a "célula" voltaria a identificar uma pessoa só, que é
  // exatamente o que ela existe para evitar. Com a latitude encaixada, toda a
  // faixa compartilha a mesma grade.
  //
  // Perto dos polos o cosseno vai a zero e a divisão explode. Não é caso de
  // moto, mas um NaN virando coordenada é pior que um limite arbitrário.
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const grauLng = grauLat / Math.max(Math.abs(cosLat), 0.01);

  return { lat, lng: centro(p.lng, grauLng) };
}

/** Haversine. Em km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.min(1, Math.sqrt(h)))).toFixed(2));
}

/**
 * Em que círculo esta pessoa está, em relação a quem pediu.
 *
 * Note que `comboio` não vem de declaração: vem de ter dividido uma sala de
 * voz, que o servidor já registra. Ninguém se declara conhecido de ninguém.
 */
export function trustTier(
  helperId: string,
  contatos: readonly string[],
  companheirosDeComboio: readonly string[]
): TrustTier {
  if (contatos.includes(helperId)) return 'conhecido';
  if (companheirosDeComboio.includes(helperId)) return 'comboio';
  return 'comunidade';
}

/**
 * Quais círculos já foram avisados, passados tantos segundos.
 *
 * Queda ou acidente abre tudo na hora: ali o risco de demorar é maior que o
 * risco de quem atende. É uma escolha, e vale dizer que é.
 */
export function audienceAt(
  request: Pick<HelpRequest, 'kind' | 'emergency'>,
  segundosDecorridos: number
): TrustTier[] {
  if (request.kind === 'emergencia' && request.emergency === 'accident_fall') {
    return [...TRUST_ORDER];
  }
  return TRUST_ORDER.filter((tier) => segundosDecorridos >= ABERTURA_SEGUNDOS[tier]);
}

/** Quanto falta para o próximo círculo ser avisado. `null` quando já abriu tudo. */
export function secondsUntilNextTier(
  request: Pick<HelpRequest, 'kind' | 'emergency'>,
  segundosDecorridos: number
): { tier: TrustTier; segundos: number } | null {
  const jaAvisados = audienceAt(request, segundosDecorridos);
  const proximo = TRUST_ORDER.find((t) => !jaAvisados.includes(t));
  if (!proximo) return null;
  return { tier: proximo, segundos: ABERTURA_SEGUNDOS[proximo] - segundosDecorridos };
}

/**
 * O endereço exato só existe para quem foi aceito — e para o próprio pedinte.
 *
 * Esta é a função que sustenta a promessa toda. Tudo que for mostrar
 * coordenada para alguém passa por aqui, e o que ela devolve para os demais é
 * a célula aproximada, nunca o ponto.
 */
export function locationFor(
  request: Pick<HelpRequest, 'precise' | 'requesterId' | 'acceptedIds'>,
  viewerId: string
): { point: GeoPoint; exact: boolean } {
  const liberado =
    viewerId === request.requesterId || request.acceptedIds.includes(viewerId);
  return liberado
    ? { point: request.precise, exact: true }
    : { point: coarsenLocation(request.precise), exact: false };
}

/**
 * O que dizer sobre quem se ofereceu, sem inventar nota.
 *
 * Já houve aqui um "Score de Procedência" que era `75 + algo` e nunca saía de
 * "Excelente". Isto conta fato: quantas vezes ajudou com confirmação de quem
 * pediu, e se a identidade foi verificada. Quando não há histórico, diz que não
 * há — em vez de exibir um número que parece aprovação.
 */
export function describeHelper(offer: Pick<HelpOffer, 'verified' | 'confirmedHelps' | 'tier'>): string {
  const partes: string[] = [];

  if (offer.tier === 'conhecido') partes.push('Está nos seus contatos');
  else if (offer.tier === 'comboio') partes.push('Já andou em comboio com você');

  partes.push(offer.verified ? 'Identidade verificada pelo Google' : 'Perfil local, sem verificação');

  if (offer.confirmedHelps === 0) partes.push('Nunca ajudou por aqui');
  else if (offer.confirmedHelps === 1) partes.push('Ajudou 1 vez, confirmada por quem pediu');
  else partes.push(`Ajudou ${offer.confirmedHelps} vezes, confirmadas por quem pediu`);

  return partes.join(' · ');
}

/**
 * Ordem em que as ofertas aparecem para quem pediu.
 *
 * Círculo antes de distância: quem você conhece a 8 km vale mais que um
 * desconhecido a 2 km. Depois quem já ajudou, depois quem está mais perto.
 */
export function sortOffers(offers: readonly HelpOffer[]): HelpOffer[] {
  const peso = (t: TrustTier) => TRUST_ORDER.indexOf(t);
  return [...offers].sort(
    (a, b) =>
      peso(a.tier) - peso(b.tier) ||
      b.confirmedHelps - a.confirmedHelps ||
      a.distanceKm - b.distanceKm
  );
}

export interface RequestValidation {
  valid: boolean;
  errors: Partial<Record<'reference' | 'details' | 'location' | 'radiusKm', string>>;
}

/**
 * O que precisa estar preenchido antes de disparar.
 *
 * A referência escrita é obrigatória e não é burocracia: o GPS erra, cai, ou é
 * negado. Quem está a caminho chega pelo "km 230, depois do posto", não pela
 * quarta casa decimal. Sem ela, um erro de GPS manda o socorro para o lugar
 * errado sem ninguém perceber.
 */
export function validateRequest(input: {
  reference: string;
  details: string;
  location: GeoPoint | null;
  radiusKm: number;
}): RequestValidation {
  const errors: RequestValidation['errors'] = {};

  if (input.reference.trim().length < 6) {
    errors.reference = 'Diga onde você está com palavras — rodovia, km, sentido, algum ponto visível.';
  }
  if (input.details.trim().length < 6) {
    errors.details = 'Diga o que aconteceu, para quem for te ajudar saber o que levar.';
  }
  if (!input.location) {
    errors.location = 'Sem posição do GPS. Você ainda pode pedir ajuda, mas só pela referência escrita.';
  }
  if (!(input.radiusKm > 0 && input.radiusKm <= 50)) {
    errors.radiusKm = 'Escolha um raio entre 1 e 50 km.';
  }

  // A falta de GPS não bloqueia: uma referência escrita boa vale mais que
  // coordenada nenhuma, e bloquear deixaria a pessoa sem saída justo na hora.
  const bloqueia = errors.reference || errors.details || errors.radiusKm;
  return { valid: !bloqueia, errors };
}
