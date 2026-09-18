import type { DiagnosticDecisionStep } from '../types';

/**
 * Árvore de triagem mecânica de beira de estrada.
 * Dado puro: sem acesso a rede, storage ou DOM.
 */
export const DIAGNOSTIC_DECISION_TREE: Record<string, DiagnosticDecisionStep> = {
  root: {
    id: 'root',
    question: 'Qual é o sintoma ou área com mau funcionamento na sua moto?',
    options: [
      { label: 'Motor não liga ou engasga', nextStepId: 'motor_engine' },
      { label: 'Freios ou vibração no guidão / rodas', nextStepId: 'brakes_vibration' },
      { label: 'Pane Elétrica ou Bateria descarregada', nextStepId: 'electrical' },
      { label: 'Transmissão, corrente estalando ou embreagem', nextStepId: 'transmission' },
      { label: 'Superaquecimento / Temperatura alta', nextStepId: 'cooling' },
    ],
  },
  motor_engine: {
    id: 'motor_engine',
    question: 'Ao acionar o botão de partida, o que ocorre?',
    options: [
      {
        label: 'O motor de partida gira rápido, mas a moto não pega fogo',
        nextStepId: 'starter_turns_no_fire',
      },
      {
        label: 'Não gira nada (apenas um "click" ou silêncio total)',
        nextStepId: 'starter_silent',
      },
      {
        label: 'Liga, mas engasga em alta rotação ou morre na lenta',
        nextStepId: 'engine_stuttering',
      },
    ],
  },
  starter_silent: {
    id: 'starter_silent',
    question: 'O painel e os faróis acendem forte quando você liga a chave?',
    options: [
      {
        label: 'Sim, farol acende normal, mas nada acontece na partida',
        result: {
          title: 'Interruptor Corta-Corrente ou Sensor de Cavalete / Neutro',
          category: 'Elétrica de Segurança',
          probableCause: 'Interruptor vermelho "Killswitch" desativado, sensor do cavalete lateral travado com sujeira ou sensor da manete de embreagem desconectado.',
          urgency: 'low',
          roadsideCheckInstructions: [
            '1. Verifique se o botão vermelho corta-corrente no punho direito está na posição de ligar.',
            '2. Coloque a moto estritamente no Ponto Neutro (luz N verde acesa).',
            '3. Recolha o cavalete lateral e aperte a embreagem até o final.',
            '4. Se não resolver, dê leves batidinhas no sensor do cavalete com a chave de fenda.',
          ],
          estimatedCostRange: 'R$ 0 (ajuste simples) a R$ 120 (troca do sensor)',
          suggestedAction: 'Verificação rápida de segurança no local antes de acionar guincho.',
        },
      },
      {
        label: 'Não, o painel apaga ou pisca fraco ao apertar o botão',
        result: {
          title: 'Bateria com Carga Baixa ou Polo Frouxo',
          category: 'Bateria / Elétrica',
          probableCause: 'Tensão abaixo de 11.8V, terminais da bateria oxidados ou sulfatados, ou fuga de corrente por rastreador/alarme.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Remova o banco e verifique se os parafusos dos bornes positivo e negativo estão bem firmes.',
            '2. Se tiver cabos de chupeta, faça ligação com bateria de outra moto (nunca com motor de carro ligado).',
            '3. Em motos com injeção eletrônica, evite empurrar "no tranco" para não danificar o catalisador ou queimar a ECU.',
          ],
          estimatedCostRange: 'R$ 50 (recarga) a R$ 380 (bateria nova Yuasa/Moura)',
          suggestedAction: 'Recarga ou substituição da bateria.',
        },
      },
    ],
  },
  starter_turns_no_fire: {
    id: 'starter_turns_no_fire',
    question: 'Você escuta o zumbido fino de 2 segundos da bomba de combustível ao virar a chave?',
    options: [
      {
        label: 'Sim, escuto o zumbido da injeção normalmente',
        result: {
          title: 'Falha de Ignição (Vela ou Cachimbo) ou Combustível Adulterado',
          category: 'Ignição & Injeção',
          probableCause: 'Falta de centelha nas velas de ignição, cachimbo solto ou combustível adulterado com excesso de água/álcool.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Pressione firmemente o cachimbo (supressor de ruído) da vela contra o cabeçote.',
            '2. Verifique se há cheiro forte de gasolina crua saindo pelo escapamento.',
            '3. Se a moto ficou parada por meses, o combustível pode ter envelhecido na flauta.',
          ],
          estimatedCostRange: 'R$ 60 (jogo de velas) a R$ 250 (descarbonização)',
          suggestedAction: 'Checar velas e drenar gasolina velha se aplicável.',
        },
      },
      {
        label: 'Não, silêncio total, a bomba não injeta nada',
        result: {
          title: 'Fusível da Injeção / Bomba ou Relé Queimado',
          category: 'Alimentação & Fusíveis',
          probableCause: 'Fusível principal de 15A/20A da injeção eletrônica rompido ou relé principal travado.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Abra a caixa de fusíveis sob o banco ou lateral.',
            '2. Localize o fusível marcado como "FI", "IGN" ou "FUEL PUMP".',
            '3. Substitua pelo fusível reserva (SPARE) do mesmo valor em amperes.',
          ],
          estimatedCostRange: 'R$ 5 (fusível) a R$ 90 (relé original)',
          suggestedAction: 'Troca imediata do fusível de reserva.',
        },
      },
    ],
  },
  engine_stuttering: {
    id: 'engine_stuttering',
    question: 'Quando o motor engasga?',
    options: [
      {
        label: 'Engasga em altas rotações ou em aceleração forte na rodovia',
        result: {
          title: 'Filtro de Combustível Entupido ou Pré-Filtro da Bomba',
          category: 'Alimentação',
          probableCause: 'Refil da bomba de combustível ou pré-filtro obstruído por sujeira no tanque, não entregando vazão suficiente em alta demanda.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Evite acelerar a fundo e pilote em marcha mais alta e rotação baixa.',
            '2. Não deixe o tanque entrar na reserva para evitar superaquecimento da bomba.',
          ],
          estimatedCostRange: 'R$ 80 a R$ 220',
          suggestedAction: 'Substituição do pré-filtro e limpeza do tanque.',
        },
      },
      {
        label: 'Morre na marcha lenta ou rotação oscila muito parada no semáforo',
        result: {
          title: 'Atuador de Marcha Lenta ou Entrada Falsa de Ar',
          category: 'Corpo de Borboletas (TBI)',
          probableCause: 'Válvula IACV (atuador de marcha lenta) suja ou coletor de admissão com trinca ressecada puxando ar não medido.',
          urgency: 'low',
          roadsideCheckInstructions: [
            '1. Dê leves toques no acelerador para manter o motor ativo nas paradas.',
            '2. Verifique visualmente se a borracha do coletor está rachada.',
          ],
          estimatedCostRange: 'R$ 90 (limpeza TBI) a R$ 180',
          suggestedAction: 'Limpeza e equalização do corpo de borboleta.',
        },
      },
    ],
  },
  brakes_vibration: {
    id: 'brakes_vibration',
    question: 'Qual é o tipo de sintoma no conjunto de freio e rodas?',
    options: [
      {
        label: 'Ruído agudo de ferro raspando ao acionar a manete ou pedal de freio',
        result: {
          title: 'Pastilha de Freio no Limite Metal-com-Metal',
          category: 'Sistema de Freio',
          probableCause: 'Material de atrito da pastilha 100% desgastado. A placa de aço está riscando o disco de freio.',
          urgency: 'critical',
          roadsideCheckInstructions: [
            '1. PERIGO: Pare de pilotar de forma agressiva imediatamente.',
            '2. A distância de frenagem pode aumentar em mais de 60%.',
            '3. Dirija-se imediatamente à oficina mais próxima em velocidade reduzida usando freio motor.',
          ],
          estimatedCostRange: 'R$ 85 (pastilhas) a R$ 450 (se danificar o disco)',
          suggestedAction: 'Troca imediata de pastilhas antes de condenar o disco de freio.',
        },
      },
      {
        label: 'Guidão trepida ou "shimmy" em velocidades acima de 70 km/h',
        result: {
          title: 'Roda Desbalanceada, Pneu Deformado ou Calibragem Muito Baixa',
          category: 'Rodas & Ciclística',
          probableCause: 'Chumbo de balanceamento solto, pneu dianteiro "escamado" ou deformado, ou pressão abaixo de 24 PSI.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Pare no primeiro posto de combustível e calibre os pneus conforme a etiqueta na balança da moto (ex: 33 dianteiro / 36 traseiro).',
            '2. Verifique se o aro da roda tem algum amassado por impacto de buraco.',
          ],
          estimatedCostRange: 'R$ 30 (balanceamento) a R$ 90 (desempeno de aro)',
          suggestedAction: 'Calibragem imediata e balanceamento de rodas.',
        },
      },
    ],
  },
  electrical: {
    id: 'electrical',
    question: 'Qual é a falha elétrica apresentada?',
    options: [
      {
        label: 'A bateria descarrega após algumas horas de viagem mesmo com moto rodando',
        result: {
          title: 'Falha no Estator ou Regulador Retificador de Voltagem',
          category: 'Sistema de Carga',
          probableCause: 'O gerador elétrico (estator) queimou uma das fases ou o retificador superaqueceu, não recarregando a bateria enquanto roda.',
          urgency: 'critical',
          roadsideCheckInstructions: [
            '1. Desligue todos os acessórios auxiliares (faróis de milha, carregadores USB, manoplas aquecidas).',
            '2. Se a moto apagar, não terá carga nem para o painel ou bomba.',
            '3. Procure um autoelétrico de motos antes que a moto desligue em movimento.',
          ],
          estimatedCostRange: 'R$ 220 a R$ 680 (retificador/estator novo)',
          suggestedAction: 'Teste com multímetro: tensão na bateria com motor ligado a 5.000 RPM deve ser entre 13.8V e 14.5V.',
        },
      },
    ],
  },
  transmission: {
    id: 'transmission',
    question: 'Qual é a anomalia na transmissão?',
    options: [
      {
        label: 'Estalos secos "tlec-tlec" na aceleração ou corrente batendo na balança',
        result: {
          title: 'Corrente de Transmissão Frouxa ou Travada por Elos Gripados',
          category: 'Conjunto de Transmissão',
          probableCause: 'Folga da corrente acima do limite recomendado (ideal é 25-35mm) ou falta grave de lubrificação causando elos duros.',
          urgency: 'warning',
          roadsideCheckInstructions: [
            '1. Se a corrente pular dente na coroa, ela pode travar a roda traseira.',
            '2. Ajuste a folga nos esticadores da balança usando a chave do estojo original.',
            '3. Aplique graxa ou lubrificante spray apropriado para correntes.',
          ],
          estimatedCostRange: 'R$ 25 (regulagem e lubrificação) a R$ 420 (kit relação completo)',
          suggestedAction: 'Ajuste imediato da folga da corrente e lubrificação.',
        },
      },
    ],
  },
  cooling: {
    id: 'cooling',
    question: 'Qual é o sintoma de temperatura?',
    options: [
      {
        label: 'Luz vermelha de temperatura acesa ou ventoinha disparada o tempo todo',
        result: {
          title: 'Nível Baixo de Líquido de Arrefecimento ou Radiador Obstruído',
          category: 'Sistema de Refrigeração',
          probableCause: 'Vazamento em mangueiras, tampa do radiador perdendo pressão ou colmeia do radiador bloqueada por barro/insetos.',
          urgency: 'critical',
          roadsideCheckInstructions: [
            '1. Desligue o motor imediatamente para evitar empenar o cabeçote ou queimar a junta.',
            '2. NUNCA abra a tampa do radiador com o motor quente (risco grave de queimadura por vapor d\'água sob pressão).',
            '3. Verifique o reservatório de expansão e complete apenas com líquido pronto para uso ou água destilada em emergência.',
          ],
          estimatedCostRange: 'R$ 45 (líquido Motul/Honda) a R$ 350',
          suggestedAction: 'Parada imediata para resfriamento do motor.',
        },
      },
    ],
  },
};
