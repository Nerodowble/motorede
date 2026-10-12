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
    titulo: 'Próxima troca e quanto falta',
    paragrafos: [
      'Próxima troca = km em que você trocou + de quantos em quantos km você troca.',
      'Faltam = km da próxima troca − km que a moto está agora.',
      'Exemplo: trocou o óleo hoje com 10.000 km e troca a cada 1.000. A próxima troca é com 11.000 km. Quando a moto estiver com 10.900, faltam 100.',
      'O app só usa números que você digitou. Por isso, mantenha o km da moto atualizado.',
    ],
  },
  situacao: {
    titulo: 'Em dia, se aproximando e vencido',
    paragrafos: [
      'A barra enche conforme você roda. Cheia quer dizer que chegou a hora da troca.',
      'Em dia: ainda falta bastante. Se aproximando: falta pouco (menos de 15% do intervalo). Hora de trocar: chegou no km da troca. Vencido: já passou, troque o quanto antes.',
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
