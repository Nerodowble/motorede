import {
  Motorcycle,
  ConsumableStatus,
  MaintenanceRecord,
  SOSAlert,
  VoiceRoom,
  ShopPartner,
  Coupon,
  CommunitySymptom,
  DiagnosticDecisionStep,
  UserRole,
  UserProfile,
} from '../types';
import { calculateDistanceKm } from './geolocation';

export interface StoredUser extends UserProfile {
  password: string;
}

// Storage keys
const STORAGE_KEYS = {
  USER_ROLE: 'motorede_user_role',
  USERS: 'motorede_registered_users',
  CURRENT_USER: 'motorede_current_user',
  MOTORCYCLE: 'motorede_motorcycle',
  MAINTENANCE_RECORDS: 'motorede_maintenance_records',
  SOS_ALERTS: 'motorede_sos_alerts',
  VOICE_ROOM: 'motorede_voice_room',
  SHOP_PARTNERS: 'motorede_shop_partners',
  COUPONS: 'motorede_coupons',
  COMMUNITY_SYMPTOMS: 'motorede_community_symptoms',
  MY_COUPONS: 'motorede_my_coupons',
  CONSUMABLES_CUSTOM: 'motorede_consumables_custom',
};

// Seed Motorcycle: Honda CB 500X 2022
const DEFAULT_MOTORCYCLE: Motorcycle = {
  id: 'moto-cb500x-01',
  brand: 'Honda',
  model: 'CB 500X ABS',
  year: 2022,
  licensePlate: 'BRA-5X92',
  currentKm: 24850,
  avgKmPerMonth: 1200,
  lastKmUpdate: new Date().toISOString(),
  photoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
  notes: 'Revisões regulares em oficina especializada. Uso misto (cidade e estrada).',
};

export const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'user-pilot-01',
    name: 'Carlos Mendonça',
    email: 'piloto@motorede.com.br',
    password: '123',
    role: 'rider',
    phone: '(11) 98765-4321',
    createdAt: '2026-01-15T10:00:00.000Z',
    motorcycle: DEFAULT_MOTORCYCLE,
  },
  {
    id: 'user-shop-01',
    name: 'Roberto - MotoTech',
    email: 'oficina@motovila.com.br',
    password: '123',
    role: 'partner_shop',
    phone: '(11) 97123-8899',
    shopName: 'MotoTech Garage Especializada',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Corifeu de Azevedo Marques, 1840',
    city: 'São Paulo - SP',
    specialties: ['Injeção Eletrônica', 'Freios e ABS', 'Troca de Óleo', 'Revisão Geral'],
    createdAt: '2026-02-10T14:30:00.000Z',
  },
  {
    id: 'user-admin-01',
    name: 'Coordenação MotoRede',
    email: 'admin@motorede.com.br',
    password: 'admin',
    role: 'admin',
    phone: '(11) 99999-0000',
    department: 'Supervisão Geral de Segurança & Homologação de Oficinas',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

// Seed Maintenance Records (Passaporte da Moto)
const DEFAULT_RECORDS: MaintenanceRecord[] = [
  {
    id: 'rec-01',
    motorcycleId: 'moto-cb500x-01',
    date: '2026-07-10',
    km: 24000,
    category: 'engine_oil',
    title: 'Troca de Óleo e Filtro (24.000 km)',
    description: 'Substituição por óleo Motul 5100 10W40 Semissintético (2.7L) e filtro K&N KN-204.',
    workshopName: 'MotoTech Garage Especializada',
    cost: 320.0,
    receiptNumber: 'NF-e 004829',
    hasAttachment: true,
    verifiedByPartner: true,
  },
  {
    id: 'rec-02',
    motorcycleId: 'moto-cb500x-01',
    date: '2026-05-18',
    km: 21500,
    category: 'brakes',
    title: 'Pastilhas de Freio Traseiras Cobreq Racing',
    description: 'Substituição do par de pastilhas traseiras e sangria com fluido DOT 5.1.',
    workshopName: 'Oficina Rota Sul Motopeças',
    cost: 185.0,
    receiptNumber: 'NF-e 003912',
    hasAttachment: true,
    verifiedByPartner: true,
  },
  {
    id: 'rec-03',
    motorcycleId: 'moto-cb500x-01',
    date: '2026-02-14',
    km: 18000,
    category: 'engine_oil',
    title: 'Revisão Intermediária e Troca de Óleo',
    description: 'Óleo Motul 5100, verificação de folga de válvulas e lubrificação de cabos.',
    workshopName: 'MotoTech Garage Especializada',
    cost: 410.0,
    receiptNumber: 'NF-e 002991',
    hasAttachment: true,
    verifiedByPartner: true,
  },
  {
    id: 'rec-04',
    motorcycleId: 'moto-cb500x-01',
    date: '2025-10-05',
    km: 14200,
    category: 'tires',
    title: 'Troca Pneu Traseiro Michelin Anakee Adventure',
    description: 'Instalação de pneu 160/60 R17 novo, bico metálico e balanceamento eletrônico.',
    workshopName: 'Pneus & Cia Motocenter',
    cost: 980.0,
    receiptNumber: 'NF-e 001844',
    hasAttachment: true,
    verifiedByPartner: true,
  },
  {
    id: 'rec-05',
    motorcycleId: 'moto-cb500x-01',
    date: '2025-06-20',
    km: 10000,
    category: 'general_inspection',
    title: 'Revisão dos 10.000 km na Concessionária',
    description: 'Revisão oficial com carimbo no manual, reaperto geral e troca de velas NGK.',
    workshopName: 'Concessionária Honda Dream',
    cost: 650.0,
    receiptNumber: 'NF-e 008123',
    hasAttachment: true,
    verifiedByPartner: true,
  },
];

// Seed SOS Alerts in user region
const DEFAULT_SOS_ALERTS: SOSAlert[] = [
  {
    id: 'sos-01',
    petitionerId: 'user-lucas-77',
    petitionerName: 'Lucas Andrade',
    petitionerPhone: '(11) 98722-4155',
    motorcycleInfo: 'Yamaha MT-07 Cinza (Placa GHK-3190)',
    type: 'mechanical_breakdown',
    details: 'Cabo de embreagem estourou subindo a serra. Estou no acostamento seguro após a praça de pedágio.',
    lat: -23.5912,
    lng: -46.6821,
    locationReference: 'Rodovia dos Imigrantes KM 26 - Sentido Litoral',
    radiusKm: 15,
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 mins ago
    status: 'in_progress',
    volunteers: [
      {
        id: 'vol-01',
        name: 'Carlos Mendes (Tiger 900)',
        motorcycle: 'Triumph Tiger 900',
        phone: '(11) 99182-3021',
        lat: -23.5855,
        lng: -46.6710,
        distanceKm: 2.3,
        status: 'en_route',
        joinedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
    chatMessages: [
      {
        id: 'msg-01',
        senderId: 'user-lucas-77',
        senderName: 'Lucas Andrade',
        text: 'Pessoal, rompeu bem no manete. Se alguém tiver um quebra-galho ou alicate de pressão ajuda muito!',
        timestamp: '15:42',
      },
      {
        id: 'msg-02',
        senderId: 'vol-01',
        senderName: 'Carlos Mendes',
        text: 'Lucas, estou com kit de emenda de cabo na mala da moto. Chego em 8 minutos, aguenta aí!',
        timestamp: '15:45',
      },
    ],
  },
  {
    id: 'sos-02',
    petitionerId: 'user-felipe-12',
    petitionerName: 'Felipe Santana',
    petitionerPhone: '(11) 97103-9988',
    motorcycleInfo: 'BMW G310 GS Vermelha',
    type: 'flat_tire',
    details: 'Pneu traseiro furou com parafuso. Preciso de kit macarrão e bombinha de CO2 ou compressor portátil.',
    lat: -23.5430,
    lng: -46.6390,
    locationReference: 'Av. 23 de Maio - Próximo ao Viaduto Santa Ifigênia',
    radiusKm: 10,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    status: 'active',
    volunteers: [],
    chatMessages: [
      {
        id: 'msg-f1',
        senderId: 'user-felipe-12',
        senderName: 'Felipe Santana',
        text: 'Estou encostado embaixo do viaduto com pisca alerta ligado. Algum irmão motociclista por perto com kit reparo?',
        timestamp: '15:30',
      },
    ],
  },
];

// Seed Voice Room (Comboio)
const DEFAULT_VOICE_ROOM: VoiceRoom = {
  id: 'room-graciosa-2026',
  code: 'SERRA-88',
  name: 'Comboio Rota da Serra • MotoClube Brasil',
  creatorId: 'user-marcos-leader',
  creatorName: 'Marcos Viana (Líder)',
  isActive: true,
  createdAt: new Date().toISOString(),
  destinationName: 'Parque Estadual da Serra do Mar - Núcleo Curucutu',
  destinationLat: -23.9856,
  destinationLng: -46.7412,
  participants: [
    {
      id: 'p-leader',
      name: 'Marcos Viana (Líder)',
      isHost: true,
      isSpeaking: false,
      isMuted: false,
      volume: 90,
      distanceToHostKm: 0,
      deviceType: 'intercom',
    },
    {
      id: 'p-user',
      name: 'Você (CB 500X)',
      isHost: false,
      isSpeaking: false,
      isMuted: false,
      volume: 85,
      distanceToHostKm: 0.3,
      deviceType: 'headset',
    },
    {
      id: 'p-mariana',
      name: 'Mariana Lima (MT-07)',
      isHost: false,
      isSpeaking: true,
      isMuted: false,
      volume: 95,
      distanceToHostKm: 0.7,
      deviceType: 'intercom',
    },
    {
      id: 'p-rodrigo',
      name: 'Rodrigo B. (F 850 GS)',
      isHost: false,
      isSpeaking: false,
      isMuted: true,
      volume: 75,
      distanceToHostKm: 1.4,
      deviceType: 'phone',
    },
  ],
};

// Seed Local Shop Partners
const DEFAULT_SHOPS: ShopPartner[] = [
  {
    id: 'shop-01',
    name: 'MotoTech Garage & Custom',
    cnpj: '34.892.110/0001-44',
    address: 'Av. Brigadeiro Luís Antônio, 2810 - Jardins',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 3284-9090',
    lat: -23.5682,
    lng: -46.6511,
    coverageRadiusKm: 15,
    rating: 4.9,
    verified: true,
  },
  {
    id: 'shop-02',
    name: 'Rota Bandeirantes Motopeças',
    cnpj: '28.190.443/0001-92',
    address: 'Rua Guaicurus, 1420 - Lapa',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 3832-1144',
    lat: -23.5245,
    lng: -46.6989,
    coverageRadiusKm: 20,
    rating: 4.8,
    verified: true,
  },
  {
    id: 'shop-03',
    name: 'Velox Pneus e Freios MotoCenter',
    cnpj: '41.002.399/0001-08',
    address: 'Av. Santo Amaro, 4510 - Brooklin',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 5092-7722',
    lat: -23.6190,
    lng: -46.6812,
    coverageRadiusKm: 12,
    rating: 4.7,
    verified: true,
  },
];

// Seed Discount Coupons created by partner shops
const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'cupom-01',
    shopId: 'shop-01',
    shopName: 'MotoTech Garage & Custom',
    shopCity: 'São Paulo',
    shopState: 'SP',
    shopDistanceKm: 2.1,
    title: 'Troca de Óleo Motul 5100 + Filtro Grátis',
    description: 'Na compra de 3 litros de óleo Motul 5100, ganhe o filtro de óleo K&N e mão de obra de substituição.',
    discountPercentage: 25,
    targetCategory: 'engine_oil',
    promoCode: 'MOTOREDE-OLEO25',
    validUntil: '2026-10-30',
    minPurchaseValue: 180,
    isActive: true,
    redemptionsCount: 38,
  },
  {
    id: 'cupom-02',
    shopId: 'shop-02',
    shopName: 'Rota Bandeirantes Motopeças',
    shopCity: 'São Paulo',
    shopState: 'SP',
    shopDistanceKm: 4.6,
    title: '18% OFF no Kit Transmissão DID / KMC com Retentor',
    description: 'Desconto direto em qualquer kit de relação coroa + pinhão + corrente com retentor X-Ring.',
    discountPercentage: 18,
    targetCategory: 'transmission_chain',
    promoCode: 'MOTOREDE-RELACAO18',
    validUntil: '2026-11-15',
    minPurchaseValue: 350,
    isActive: true,
    redemptionsCount: 22,
  },
  {
    id: 'cupom-03',
    shopId: 'shop-03',
    shopName: 'Velox Pneus e Freios MotoCenter',
    shopCity: 'São Paulo',
    shopState: 'SP',
    shopDistanceKm: 5.4,
    title: 'Pastilhas de Freio EBC / Brembo - 20% OFF',
    description: 'Desconto em pastilhas sinterizadas com instalação e sangria de fluido de freio grátis.',
    discountPercentage: 20,
    targetCategory: 'brakes',
    promoCode: 'MOTOREDE-FREIO20',
    validUntil: '2026-10-15',
    minPurchaseValue: 120,
    isActive: true,
    redemptionsCount: 45,
  },
  {
    id: 'cupom-04',
    shopId: 'shop-03',
    shopName: 'Velox Pneus e Freios MotoCenter',
    shopCity: 'São Paulo',
    shopState: 'SP',
    shopDistanceKm: 5.4,
    title: 'Par de Pneus Michelin ou Pirelli - 15% OFF + Balanceamento',
    description: 'Válido para linhas Anakee, Pilot Road, Diablo Rosso e Scorpion com montagem inclusa.',
    discountPercentage: 15,
    targetCategory: 'tires',
    promoCode: 'MOTOREDE-PNEUS15',
    validUntil: '2026-11-01',
    minPurchaseValue: 800,
    isActive: true,
    redemptionsCount: 19,
  },
];

// Seed Community Symptoms for Triage
const DEFAULT_COMMUNITY_SYMPTOMS: CommunitySymptom[] = [
  {
    id: 'sym-01',
    brand: 'Honda',
    model: 'CB 500X / CB 500F',
    yearRange: '2019-2024',
    symptom: 'Barulho metálico na frente ao passar em buracos ou frenagem forte',
    cause: 'Folga comum na mesa/caixa de direção de esferas original que afrouxa após rodar em calçamento.',
    solution: 'Reaperto com chave estriada no torque de 45Nm ou troca por rolamento cônico All Balls.',
    authorName: 'Thiago "Biela" SP',
    createdAt: '2026-08-12',
    status: 'approved',
    upvotes: 64,
  },
  {
    id: 'sym-02',
    brand: 'Yamaha',
    model: 'MT-07 / Tracer 700',
    yearRange: '2016-2023',
    symptom: 'Moto apaga repentinamente em baixa rotação ao reduzir marchas com embreagem puxada',
    cause: 'Corpo de borboleta carbonizado e regulagem de marcha lenta abaixo de 1.150 RPM.',
    solution: 'Limpeza do corpo de injeção TBI com descarbonizante e calibração do sensor TPS.',
    authorName: 'Eduardo R.',
    createdAt: '2026-08-20',
    status: 'approved',
    upvotes: 49,
  },
  {
    id: 'sym-03',
    brand: 'BMW',
    model: 'F 750 GS / F 850 GS',
    yearRange: '2019-2023',
    symptom: 'Luz de advertência de freio e ABS pisca em amarelo no painel TFT ao dar a partida',
    cause: 'Queda de tensão momentânea na bateria de 12V durante o acionamento do motor de partida.',
    solution: 'Carga lenta na bateria ou substituição por modelo AGM com CCA superior a 200A.',
    authorName: 'Marcão GS Brasil',
    createdAt: '2026-09-02',
    status: 'approved',
    upvotes: 31,
  },
];

// Diagnostic Decision Tree definition
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

/**
 * Calculates wear of consumables for the given motorcycle with real user parameters
 */
export function calculateConsumablesStatus(motorcycle: Motorcycle): ConsumableStatus[] {
  const currentKm = motorcycle.currentKm;

  // Retrieve user custom intervals/last changes if stored
  let customOverrides: Record<string, { intervalKm?: number; lastChangedKm?: number; lastChangedDate?: string }> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONSUMABLES_CUSTOM);
      if (raw) customOverrides = JSON.parse(raw);
    } catch {
      // fallback
    }
  }

  // Riding style degradation multiplier:
  // Aggressive riding wears chain, oil, brakes faster; calm riding extends life
  let wearMultiplier = 1.0;
  if (motorcycle.ridingStyle === 'aggressive') wearMultiplier = 1.25;
  else if (motorcycle.ridingStyle === 'commuter_heavy') wearMultiplier = 1.15;
  else if (motorcycle.ridingStyle === 'calm') wearMultiplier = 0.9;

  const baseConfig: {
    category: import('../types').ConsumableCategory;
    name: string;
    intervalKm: number;
    intervalMonths: number;
    lastChangedKm: number;
    lastChangedDate: string;
  }[] = [
    {
      category: 'engine_oil',
      name: 'Óleo do Motor & Filtro',
      intervalKm: motorcycle.customIntervals?.engine_oil || 5000,
      intervalMonths: 6,
      lastChangedKm: Math.max(0, currentKm - 850),
      lastChangedDate: '2026-07-10',
    },
    {
      category: 'transmission_chain',
      name: 'Kit Transmissão (Relação)',
      intervalKm: motorcycle.customIntervals?.transmission_chain || 25000,
      intervalMonths: 24,
      lastChangedKm: Math.max(0, currentKm - 24000),
      lastChangedDate: '2024-01-10',
    },
    {
      category: 'brakes',
      name: 'Pastilhas de Freio (Diant/Tras)',
      intervalKm: motorcycle.customIntervals?.brakes || 12000,
      intervalMonths: 18,
      lastChangedKm: Math.max(0, currentKm - 3350),
      lastChangedDate: '2026-05-18',
    },
    {
      category: 'tires',
      name: 'Pneus (Dianteiro & Traseiro)',
      intervalKm: motorcycle.customIntervals?.tires || 15000,
      intervalMonths: 36,
      lastChangedKm: Math.max(0, currentKm - 10650),
      lastChangedDate: '2025-10-05',
    },
    {
      category: 'air_filter_spark_plug',
      name: 'Filtro de Ar & Velas de Ignição',
      intervalKm: motorcycle.customIntervals?.air_filter_spark_plug || 12000,
      intervalMonths: 18,
      lastChangedKm: Math.max(0, currentKm - 10650),
      lastChangedDate: '2025-10-05',
    },
    {
      category: 'battery',
      name: 'Bateria 12V e Sistema de Carga',
      intervalKm: motorcycle.customIntervals?.battery || 40000,
      intervalMonths: 30,
      lastChangedKm: 0,
      lastChangedDate: '2024-01-10',
    },
  ];

  return baseConfig.map((item) => {
    const override = customOverrides[item.category];
    const effectiveInterval = override?.intervalKm || item.intervalKm;
    const effectiveLastChangedKm = override?.lastChangedKm !== undefined ? override.lastChangedKm : item.lastChangedKm;
    const effectiveLastChangedDate = override?.lastChangedDate || item.lastChangedDate;

    const kmSinceChange = Math.max(0, currentKm - effectiveLastChangedKm);
    const adjustedWear = kmSinceChange * wearMultiplier;
    const wearRatio = Math.min(1.2, adjustedWear / effectiveInterval);
    const wearPercentage = Math.min(100, Math.round(wearRatio * 100));
    const remainingKm = Math.max(0, Math.round(effectiveInterval - adjustedWear));

    // Calculate remaining days based on user's real monthly average km
    const avgMonthly = motorcycle.avgKmPerMonth > 0 ? motorcycle.avgKmPerMonth : 1000;
    const dailyKm = avgMonthly / 30;
    const remainingDays = Math.max(0, Math.round(remainingKm / dailyKm));

    let status: 'optimal' | 'warning' | 'critical' = 'optimal';
    if (wearPercentage >= 90 || remainingKm <= 500) {
      status = 'critical';
    } else if (wearPercentage >= 75 || remainingKm <= 1500) {
      status = 'warning';
    }

    return {
      id: `cons-${item.category}`,
      category: item.category,
      name: item.name,
      intervalKm: effectiveInterval,
      intervalMonths: item.intervalMonths,
      lastChangedKm: effectiveLastChangedKm,
      lastChangedDate: effectiveLastChangedDate,
      currentWearPercentage: wearPercentage,
      estimatedRemainingKm: remainingKm,
      estimatedRemainingDays: remainingDays,
      status,
    };
  });
}

/**
 * Storage Service Helper
 */
export const storageService = {
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return DEFAULT_USERS[0];
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
      return DEFAULT_USERS[0];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: UserProfile | null): void {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.setUserRole(user.role);
      if (user.motorcycle) {
        this.saveMotorcycle(user.motorcycle);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    window.dispatchEvent(new CustomEvent('motorede:user_changed', { detail: user }));
  },

  getUsers(): StoredUser[] {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_USERS;
    }
  },

  login(emailOrUser: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanInput = emailOrUser.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.name.toLowerCase() === cleanInput ||
        (cleanInput === 'piloto' && u.role === 'rider') ||
        (cleanInput === 'oficina' && u.role === 'partner_shop') ||
        (cleanInput === 'admin' && u.role === 'admin')
    );

    if (!found) {
      return { success: false, error: 'Usuário ou e-mail não encontrado.' };
    }

    if (found.password !== password.trim()) {
      return { success: false, error: 'Senha incorreta. Verifique e tente novamente.' };
    }

    const { password: _, ...safeUser } = found;
    this.setCurrentUser(safeUser);
    return { success: true, user: safeUser };
  },

  register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
    motorcycleBrand?: string;
    motorcycleModel?: string;
    motorcycleYear?: number;
    motorcyclePlate?: string;
    motorcycleKm?: number;
    shopName?: string;
    cnpj?: string;
    address?: string;
    city?: string;
    specialties?: string[];
  }): { success: boolean; user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanEmail = data.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um cadastro ativo com este e-mail.' };
    }

    let userMotorcycle: Motorcycle | undefined = undefined;
    if (data.role === 'rider') {
      userMotorcycle = {
        id: `moto-${Date.now()}`,
        brand: data.motorcycleBrand || 'Honda',
        model: data.motorcycleModel || 'Titan 160',
        year: data.motorcycleYear || new Date().getFullYear(),
        licensePlate: (data.motorcyclePlate || 'BRA-1A23').toUpperCase(),
        currentKm: Number(data.motorcycleKm) || 12500,
        avgKmPerMonth: 1000,
        lastKmUpdate: new Date().toISOString(),
        photoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
        notes: 'Cadastro criado pelo piloto.',
      };
      this.saveMotorcycle(userMotorcycle);
    }

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password.trim(),
      role: data.role,
      phone: data.phone.trim() || '(11) 98765-4321',
      createdAt: new Date().toISOString(),
      motorcycle: userMotorcycle,
      shopName: data.shopName?.trim(),
      cnpj: data.cnpj?.trim(),
      address: data.address?.trim(),
      city: data.city?.trim() || 'São Paulo - SP',
      specialties: data.specialties || ['Mecânica Geral', 'Injeção Eletrônica'],
      department: data.role === 'admin' ? 'Supervisão Geral de Segurança' : undefined,
    };

    const updatedUsers = [...users, newUser];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    }

    // If workshop, also add to shop partners list so it appears on maps and coupons
    if (data.role === 'partner_shop' && data.shopName) {
      const currentShops = this.getShops();
      const newShop: ShopPartner = {
        id: `shop-${Date.now()}`,
        name: data.shopName,
        cnpj: data.cnpj || '00.000.000/0001-00',
        address: data.address || 'Rua das Oficinas, 100',
        city: data.city || 'São Paulo',
        state: 'SP',
        phone: data.phone || '(11) 99999-9999',
        lat: -23.5505 + (Math.random() - 0.5) * 0.05,
        lng: -46.6333 + (Math.random() - 0.5) * 0.05,
        coverageRadiusKm: 15,
        rating: 5.0,
        verified: true,
        specialties: data.specialties || ['Mecânica Geral', 'Revisão'],
      };
      this.savePartnerShops([...currentShops, newShop]);
    }

    const { password: _, ...safeUser } = newUser;
    this.setCurrentUser(safeUser);
    return { success: true, user: safeUser };
  },

  logout(): void {
    this.setCurrentUser(null);
  },

  getUserRole(): UserRole {
    const user = this.getCurrentUser();
    if (user?.role) return user.role;
    if (typeof window === 'undefined') return 'rider';
    return (localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole) || 'rider';
  },

  setUserRole(role: UserRole) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    window.dispatchEvent(new CustomEvent('motorede:role_changed', { detail: role }));
  },

  getMotorcycle(): Motorcycle {
    if (typeof window === 'undefined') return DEFAULT_MOTORCYCLE;
    const raw = localStorage.getItem(STORAGE_KEYS.MOTORCYCLE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MOTORCYCLE, JSON.stringify(DEFAULT_MOTORCYCLE));
      return DEFAULT_MOTORCYCLE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MOTORCYCLE;
    }
  },

  updateMotorcycleKm(newKm: number): Motorcycle {
    const current = this.getMotorcycle();
    const updated: Motorcycle = {
      ...current,
      currentKm: newKm,
      lastKmUpdate: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOTORCYCLE, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:motorcycle_updated', { detail: updated }));
    }
    return updated;
  },

  updateMotorcycle(data: Partial<Motorcycle>): Motorcycle {
    const current = this.getMotorcycle();
    const updated: Motorcycle = {
      ...current,
      ...data,
      lastKmUpdate: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOTORCYCLE, JSON.stringify(updated));
      // Also update currently logged in user if they own this motorcycle
      const user = this.getCurrentUser();
      if (user && user.role === 'rider') {
        user.motorcycle = updated;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      }
      window.dispatchEvent(new CustomEvent('motorede:motorcycle_updated', { detail: updated }));
    }
    return updated;
  },

  updateConsumableItem(
    category: import('../types').ConsumableCategory,
    details: { lastChangedKm?: number; lastChangedDate?: string; intervalKm?: number }
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONSUMABLES_CUSTOM);
      const current = raw ? JSON.parse(raw) : {};
      current[category] = { ...(current[category] || {}), ...details };
      localStorage.setItem(STORAGE_KEYS.CONSUMABLES_CUSTOM, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('motorede:consumables_updated', { detail: current }));
    } catch {
      // fallback
    }
  },

  getCustomConsumables(): Record<string, { intervalKm?: number; lastChangedKm?: number; lastChangedDate?: string }> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONSUMABLES_CUSTOM);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getMaintenanceRecords(): MaintenanceRecord[] {
    if (typeof window === 'undefined') return DEFAULT_RECORDS;
    const raw = localStorage.getItem(STORAGE_KEYS.MAINTENANCE_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE_RECORDS, JSON.stringify(DEFAULT_RECORDS));
      return DEFAULT_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_RECORDS;
    }
  },

  addMaintenanceRecord(record: Omit<MaintenanceRecord, 'id'>): MaintenanceRecord {
    const records = this.getMaintenanceRecords();
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `rec-${Date.now()}`,
    };
    const updated = [newRecord, ...records];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE_RECORDS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:records_updated', { detail: updated }));
    }
    return newRecord;
  },

  getSOSAlerts(): SOSAlert[] {
    if (typeof window === 'undefined') return DEFAULT_SOS_ALERTS;
    const raw = localStorage.getItem(STORAGE_KEYS.SOS_ALERTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(DEFAULT_SOS_ALERTS));
      return DEFAULT_SOS_ALERTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SOS_ALERTS;
    }
  },

  createSOSAlert(alertData: Omit<SOSAlert, 'id' | 'createdAt' | 'status' | 'volunteers' | 'chatMessages'>): SOSAlert {
    const alerts = this.getSOSAlerts();
    const newAlert: SOSAlert = {
      ...alertData,
      id: `sos-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      volunteers: [],
      chatMessages: [
        {
          id: `msg-init-${Date.now()}`,
          senderId: alertData.petitionerId,
          senderName: alertData.petitionerName,
          text: `🚨 SOS ACIONADO: ${alertData.details}. Referência: ${alertData.locationReference}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    const updated = [newAlert, ...alerts];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:sos_updated', { detail: updated }));
    }
    return newAlert;
  },

  respondToSOS(alertId: string, volunteer: import('../types').SOSVolunteer): SOSAlert | null {
    const alerts = this.getSOSAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return null;

    const existingVolunteer = alert.volunteers.find((v) => v.id === volunteer.id);
    if (!existingVolunteer) {
      alert.volunteers.push(volunteer);
    }
    if (alert.status === 'active') {
      alert.status = 'in_progress';
    }

    alert.chatMessages.push({
      id: `msg-${Date.now()}`,
      senderId: volunteer.id,
      senderName: volunteer.name,
      text: `Estou a caminho para prestar apoio! Distância aproximada: ${volunteer.distanceKm} km.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isQuickPhrase: true,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(alerts));
      window.dispatchEvent(new CustomEvent('motorede:sos_updated', { detail: alerts }));
    }
    return alert;
  },

  sendSOSMessage(alertId: string, senderId: string, senderName: string, text: string): SOSAlert | null {
    const alerts = this.getSOSAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return null;

    alert.chatMessages.push({
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(alerts));
      window.dispatchEvent(new CustomEvent('motorede:sos_updated', { detail: alerts }));
    }
    return alert;
  },

  resolveSOSAlert(alertId: string): boolean {
    const alerts = this.getSOSAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.chatMessages.push({
      id: `msg-res-${Date.now()}`,
      senderId: 'system',
      senderName: 'Sistema MotoRede',
      text: '✅ Resgate concluído com sucesso. Motociclista seguro!',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(alerts));
      window.dispatchEvent(new CustomEvent('motorede:sos_updated', { detail: alerts }));
    }
    return true;
  },

  getVoiceRoom(): VoiceRoom {
    if (typeof window === 'undefined') return DEFAULT_VOICE_ROOM;
    const raw = localStorage.getItem(STORAGE_KEYS.VOICE_ROOM);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VOICE_ROOM, JSON.stringify(DEFAULT_VOICE_ROOM));
      return DEFAULT_VOICE_ROOM;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_VOICE_ROOM;
    }
  },

  updateVoiceRoom(data: Partial<VoiceRoom>): VoiceRoom {
    const current = this.getVoiceRoom();
    const updated: VoiceRoom = { ...current, ...data };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VOICE_ROOM, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:voice_room_updated', { detail: updated }));
    }
    return updated;
  },

  getShops(): ShopPartner[] {
    if (typeof window === 'undefined') return DEFAULT_SHOPS;
    const raw = localStorage.getItem(STORAGE_KEYS.SHOP_PARTNERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SHOP_PARTNERS, JSON.stringify(DEFAULT_SHOPS));
      return DEFAULT_SHOPS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SHOPS;
    }
  },

  addShop(shopData: Omit<ShopPartner, 'id' | 'rating' | 'verified'>): ShopPartner {
    const shops = this.getShops();
    const newShop: ShopPartner = {
      ...shopData,
      id: `shop-${Date.now()}`,
      rating: 5.0,
      verified: true,
    };
    const updated = [...shops, newShop];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SHOP_PARTNERS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:shops_updated', { detail: updated }));
    }
    return newShop;
  },

  getCoupons(): Coupon[] {
    if (typeof window === 'undefined') return DEFAULT_COUPONS;
    const raw = localStorage.getItem(STORAGE_KEYS.COUPONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(DEFAULT_COUPONS));
      return DEFAULT_COUPONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_COUPONS;
    }
  },

  addCoupon(couponData: Omit<Coupon, 'id' | 'redemptionsCount'>): Coupon {
    const coupons = this.getCoupons();
    const newCoupon: Coupon = {
      ...couponData,
      id: `cupom-${Date.now()}`,
      redemptionsCount: 0,
    };
    const updated = [newCoupon, ...coupons];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:coupons_updated', { detail: updated }));
    }
    return newCoupon;
  },

  redeemCoupon(code: string): { success: boolean; message: string; coupon?: Coupon } {
    const coupons = this.getCoupons();
    const coupon = coupons.find(
      (c) => c.promoCode.trim().toUpperCase() === code.trim().toUpperCase() && c.isActive
    );

    if (!coupon) {
      return { success: false, message: 'Cupom não encontrado ou expirado.' };
    }

    coupon.redemptionsCount += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
      window.dispatchEvent(new CustomEvent('motorede:coupons_updated', { detail: coupons }));
    }

    return {
      success: true,
      message: `Cupom ${coupon.promoCode} validado com sucesso! (${coupon.discountPercentage}% OFF em ${coupon.title})`,
      coupon,
    };
  },

  getCommunitySymptoms(): CommunitySymptom[] {
    if (typeof window === 'undefined') return DEFAULT_COMMUNITY_SYMPTOMS;
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNITY_SYMPTOMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMMUNITY_SYMPTOMS, JSON.stringify(DEFAULT_COMMUNITY_SYMPTOMS));
      return DEFAULT_COMMUNITY_SYMPTOMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_COMMUNITY_SYMPTOMS;
    }
  },

  addCommunitySymptom(data: Omit<CommunitySymptom, 'id' | 'createdAt' | 'status' | 'upvotes'>): CommunitySymptom {
    const symptoms = this.getCommunitySymptoms();
    const newSymptom: CommunitySymptom = {
      ...data,
      id: `sym-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending', // Starts in moderation queue
      upvotes: 1,
    };
    const updated = [newSymptom, ...symptoms];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COMMUNITY_SYMPTOMS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('motorede:symptoms_updated', { detail: updated }));
    }
    return newSymptom;
  },

  moderateSymptom(id: string, newStatus: 'approved' | 'rejected'): boolean {
    const symptoms = this.getCommunitySymptoms();
    const item = symptoms.find((s) => s.id === id);
    if (!item) return false;

    item.status = newStatus;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COMMUNITY_SYMPTOMS, JSON.stringify(symptoms));
      window.dispatchEvent(new CustomEvent('motorede:symptoms_updated', { detail: symptoms }));
    }
    return true;
  },

  saveMotorcycle(bike: Motorcycle): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOTORCYCLE, JSON.stringify(bike));
    }
  },

  getConsumables(currentKm?: number): ConsumableStatus[] {
    const bike = this.getMotorcycle();
    if (currentKm !== undefined) {
      bike.currentKm = currentKm;
    }
    return calculateConsumablesStatus(bike);
  },

  calculateConsumablesWear(km: number): ConsumableStatus[] {
    const bike = this.getMotorcycle();
    bike.currentKm = km;
    return calculateConsumablesStatus(bike);
  },

  saveSOSAlerts(alerts: SOSAlert[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(alerts));
    }
  },

  saveVoiceRoom(vr: VoiceRoom): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VOICE_ROOM, JSON.stringify(vr));
    }
  },

  saveMaintenanceRecords(records: MaintenanceRecord[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE_RECORDS, JSON.stringify(records));
    }
  },

  saveCoupons(coupons: Coupon[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    }
  },

  getPartnerShops(): ShopPartner[] {
    return this.getShops();
  },

  savePartnerShops(shops: ShopPartner[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SHOP_PARTNERS, JSON.stringify(shops));
    }
  },

  getDiagnosticTree(): Record<string, import('../types').DiagnosticNode> {
    return {
      'diag-root': {
        id: 'diag-root',
        question: 'Qual é a falha apresentada na sua moto?',
        options: [
          { label: 'O motor de partida gira rápido, mas não pega', nextNodeId: 'diag-cranks' },
          { label: 'Não dá nenhum sinal de partida (nem estalo ou luzes fracas)', nextNodeId: 'diag-no-crank' },
          { label: 'A moto liga, mas apaga ou falha na aceleração', nextNodeId: 'diag-dies' },
          { label: 'Barulho de ferro raspando ao frear ou pedal borrachudo', nextNodeId: 'diag-brakes' },
          { label: 'Luz vermelha de temperatura acesa ou vapor saindo', nextNodeId: 'diag-cooling' },
        ],
      },
      'diag-cranks': {
        id: 'diag-cranks',
        question: 'Você escuta o zumbido fino de 2 segundos da bomba de combustível ao ligar a chave?',
        options: [
          { label: 'Sim, escuto o barulho característico da bomba', nextNodeId: 'diag-ignition' },
          { label: 'Não, fica em silêncio total (não injeta combustível)', nextNodeId: 'diag-fuel-pump' },
        ],
      },
      'diag-ignition': {
        id: 'diag-ignition',
        question: 'Diagnóstico: Falha no Sistema de Ignição ou Combustível Adulterado',
        diagnosis: 'Falta de centelha nas velas ou água/solvente no combustível.',
        recommendation: 'Verifique se o cachimbo da vela está bem encaixado. Não force a partida para não descarregar a bateria.',
        severity: 'caution',
      },
      'diag-fuel-pump': {
        id: 'diag-fuel-pump',
        question: 'Diagnóstico: Fusível da Bomba / Injeção ou Relé Principal Queimado',
        diagnosis: 'A bomba de combustível não está sendo alimentada eletricamente.',
        recommendation: 'Abra a caixa de fusíveis sob o banco e inspecione o fusível de 15A marcado como "FI/IGN". Troque pelo fusível reserva (SPARE).',
        severity: 'caution',
      },
      'diag-no-crank': {
        id: 'diag-no-crank',
        question: 'O farol dianteiro e o painel acendem normalmente?',
        options: [
          { label: 'Sim, painel e farol acendem forte', nextNodeId: 'diag-safety-switch' },
          { label: 'Não, tudo apagado ou pisca bem fraquinho', nextNodeId: 'diag-dead-battery' },
        ],
      },
      'diag-safety-switch': {
        id: 'diag-safety-switch',
        question: 'Diagnóstico: Corta-Corrente Acionado ou Sensor de Cavalete Lateral',
        diagnosis: 'Circuito de corte de segurança impedindo o motor de partida.',
        recommendation: '1. Verifique o botão vermelho "Killswitch" no punho direito. 2. Coloque no Ponto Neutro (N). 3. Recolha o cavalete lateral e aperte a embreagem.',
        severity: 'safe_to_ride',
      },
      'diag-dead-battery': {
        id: 'diag-dead-battery',
        question: 'Diagnóstico: Bateria Descarregada ou Terminais Frouxos',
        diagnosis: 'Tensão elétrica insuficiente para acionar o relé de partida.',
        recommendation: 'Verifique os parafusos dos polos (+) e (-). Em motos com injeção eletrônica evite dar tranco para não danificar o módulo da ECU.',
        severity: 'caution',
      },
      'diag-dies': {
        id: 'diag-dies',
        question: 'A moto morre na marcha lenta (semáforo) ou ao acelerar fundo na rodovia?',
        options: [
          { label: 'Morre na marcha lenta parada no semáforo', nextNodeId: 'diag-idle' },
          { label: 'Engasga ao abrir o acelerador em alta velocidade', nextNodeId: 'diag-filter' },
        ],
      },
      'diag-idle': {
        id: 'diag-idle',
        question: 'Diagnóstico: Atuador de Marcha Lenta (IACV) ou Entrada Falsa de Ar',
        diagnosis: 'Carbonização no corpo de borboletas ou trinca no coletor de admissão.',
        recommendation: 'Mantenha leves toques no acelerador para não apagar. Faça a limpeza do TBI assim que chegar a uma oficina.',
        severity: 'safe_to_ride',
      },
      'diag-filter': {
        id: 'diag-filter',
        question: 'Diagnóstico: Filtro de Combustível ou Pré-Filtro Obstruído',
        diagnosis: 'Vazão de gasolina insuficiente em regimes de alta rotação.',
        recommendation: 'Pilote em rotação moderada sem acelerar até o batente. Evite rodar na reserva.',
        severity: 'caution',
      },
      'diag-brakes': {
        id: 'diag-brakes',
        question: 'Diagnóstico: Pastilhas de Freio no Limite ou Ar no Sistema Hidráulico',
        diagnosis: 'Desgaste crítico do material de atrito ou vazamento de fluido DOT.',
        recommendation: 'PERIGO: Se houver barulho de ferro com ferro, a distância de frenagem é gravemente comprometida. Reduza a velocidade e procure oficina imediatamente.',
        severity: 'danger_stop',
      },
      'diag-cooling': {
        id: 'diag-cooling',
        question: 'Diagnóstico: Superaquecimento do Motor / Nível Baixo de Líquido',
        diagnosis: 'Risco iminente de empenamento de cabeçote ou queima de junta.',
        recommendation: 'PERIGO GRAVE: Desligue o motor imediatamente no acostamento. NUNCA abra a tampa do radiador enquanto o motor estiver quente!',
        severity: 'danger_stop',
      },
    };
  },
};

