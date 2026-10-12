/**
 * Textos do botão "i" da tela Minha moto.
 *
 * Escritos para quem não entende de mecânica nem de conta: frases curtas, um
 * exemplo com números redondos, nenhuma sigla. Ficam aqui, e não em cada tela,
 * para a web e o app explicarem exatamente a mesma coisa.
 */

export type ChaveAjudaMoto =
  | 'odometro'
  | 'intervalo'
  | 'rodouFaltam'
  | 'situacao'
  | 'consumo'
  | 'autonomia';

export interface AjudaMoto {
  titulo: string;
  /** Cada item é um parágrafo curto. */
  paragrafos: string[];
}

export const AJUDA_MOTO: Record<ChaveAjudaMoto, AjudaMoto> = {
  odometro: {
    titulo: 'Quilometragem da moto',
    paragrafos: [
      'É o número que aparece no painel da sua moto (o "marcador de km").',
      'Todas as contas da tela usam esse número. Sempre que puder, atualize: toque no número e digite o que está no painel.',
      'Quando você registra uma troca com um km maior, o app atualiza sozinho.',
    ],
  },
  intervalo: {
    titulo: 'De quantos em quantos km você troca',
    paragrafos: [
      'É a distância que você roda entre uma troca e outra.',
      'Exemplo: se você troca o óleo a cada 1.000 km, informe 1.000. Se não sabe, pergunte ao seu mecânico ou veja no manual da moto.',
      'O app usa esse número para avisar quando a próxima troca está chegando.',
    ],
  },
  rodouFaltam: {
    titulo: 'Rodou e faltam',
    paragrafos: [
      '"Rodou" é quanto você andou desde a última troca: km de agora menos o km da troca.',
      '"Faltam" é quanto ainda dá para rodar até a próxima: o intervalo menos o que você rodou.',
      'Exemplo: trocou o óleo com 10.000 km e troca a cada 1.000. Hoje a moto está com 10.900. Rodou 900, faltam 100.',
    ],
  },
  situacao: {
    titulo: 'Em dia, se aproximando e vencido',
    paragrafos: [
      'A barra enche conforme você roda. Cheia quer dizer que chegou a hora da troca.',
      'Em dia: ainda falta bastante. Se aproximando: falta pouco (menos de 15% do intervalo). Vencido: já passou do ponto, troque o quanto antes.',
      'Se você ainda não informou de quantos em quantos km troca, o app mostra só quanto você rodou.',
    ],
  },
  consumo: {
    titulo: 'Consumo médio',
    paragrafos: [
      'Quantos km sua moto anda com 1 litro de combustível.',
      'Para descobrir: encha o tanque, zere o marcador parcial (ou anote o km) e rode. Na próxima vez que encher, divida os km rodados pelos litros que entraram.',
      'Exemplo: rodou 300 km e entraram 10 litros. 300 ÷ 10 = 30 km por litro.',
    ],
  },
  autonomia: {
    titulo: 'Autonomia',
    paragrafos: [
      'É até onde você chega com o tanque cheio, sem parar para abastecer.',
      'A conta é: tamanho do tanque × consumo médio.',
      'Exemplo: tanque de 15 litros e moto que faz 30 km por litro. 15 × 30 = 450 km. É uma estimativa: com garupa, bagagem ou acelerando mais, a moto gasta mais.',
    ],
  },
};
