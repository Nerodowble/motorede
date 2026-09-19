import {
  Motorcycle,
  MaintenanceRecord,
  SOSAlert,
  VoiceRoom,
  ShopPartner,
  Coupon,
  CommunitySymptom,
  UserRole,
  UserProfile,
  ConsumableCategory,
  SOSVolunteer,
  DiagnosticNode,
} from '@motorede/shared';
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
  LAST_ROOM_CODE: 'motorede_last_room_code',
  SEED_BIKE_CLEARED: 'motorede_seed_bike_cleared',
  FAKE_INTERVALS_CLEARED: 'motorede_fake_intervals_cleared',
  PHONE: 'motorede_phone',
  FAVORITE_ROOMS: 'motorede_favorite_rooms',
  LOCK_WARNING_DISMISSED: 'motorede_lock_warning_dismissed',
  HAD_CONVERSATION: 'motorede_had_conversation',
  INSTALL_DISMISSED: 'motorede_install_dismissed',
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

// A árvore de diagnóstico e o cálculo de desgaste vivem em @motorede/shared,
// para serem reaproveitados pelo app mobile e pelo backend.
// Reexportados aqui para não quebrar quem já importava de services/storage.
export { DIAGNOSTIC_DECISION_TREE } from '@motorede/shared';

/**
 * Storage Service Helper
 */
export const storageService = {
  /**
   * Telefone do piloto, guardado só neste aparelho.
   *
   * Nunca é gravado em servidor: viaja no pedido de entrada apenas para o
   * servidor derivar uma impressão digital, que é o que permite um amigo
   * encontrar o piloto sem que ninguém consiga ler telefones.
   */
  getPhone(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.PHONE) || '';
  },

  savePhone(phone: string): void {
    if (typeof window === 'undefined') return;
    if (phone) localStorage.setItem(STORAGE_KEYS.PHONE, phone);
    else localStorage.removeItem(STORAGE_KEYS.PHONE);
  },

  /**
   * Se o piloto já dispensou o aviso sobre tela bloqueada no navegador.
   *
   * Guardado para não reaparecer a cada visita: é informação que se aprende
   * uma vez, e repetir vira ruído.
   */
  isLockWarningDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.LOCK_WARNING_DISMISSED) === 'true';
  },

  dismissLockWarning(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LOCK_WARNING_DISMISSED, 'true');
  },

  /**
   * Marca que o piloto já conversou com alguém de verdade no comboio.
   *
   * É o gatilho do convite para instalar. Oferecer instalação antes disso é
   * pedir compromisso antes de entregar valor — a pessoa ainda não sabe se o
   * app serve para ela.
   */
  hasConversationHappened(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.HAD_CONVERSATION) === 'true';
  },

  markConversationHappened(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.HAD_CONVERSATION, 'true');
  },

  isInstallDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED) === 'true';
  },

  dismissInstall(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, 'true');
  },

  /** Comboios marcados como favoritos, para o admin voltar rápido. */
  getFavoriteRooms(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_ROOMS);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },

  toggleFavoriteRoom(code: string): string[] {
    const atuais = this.getFavoriteRooms();
    const proximos = atuais.includes(code)
      ? atuais.filter((c) => c !== code)
      : [...atuais, code];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FAVORITE_ROOMS, JSON.stringify(proximos));
    }
    return proximos;
  },

  /** Último comboio em que o piloto entrou, para reabrir direto nele. */
  getLastRoomCode(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.LAST_ROOM_CODE);
  },

  saveLastRoomCode(code: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LAST_ROOM_CODE, code);
  },

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

  /**
   * A moto do piloto, ou null se ele ainda não cadastrou.
   *
   * Antes esta função GRAVAVA a moto de exemplo na primeira leitura: quem
   * entrava pela primeira vez ganhava uma Honda CB 500X com placa e
   * quilometragem inventadas, como se fosse dele. Não existia o estado "ainda
   * não tenho moto", e por isso o app afirmava desgaste de um veículo que não
   * existia.
   */
  getMotorcycle(): Motorcycle | null {
    if (typeof window === 'undefined') return null;
    this.migrateSeedMotorcycle();
    this.migrateFakeDeclaredIntervals();
    const raw = localStorage.getItem(STORAGE_KEYS.MOTORCYCLE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Motorcycle;
    } catch {
      return null;
    }
  },

  /**
   * Remove a moto de exemplo de quem já usou o app antes desta mudança.
   *
   * Apagar o exemplo do código não limpa o que já está no navegador. Mas só
   * remove se a moto estiver EXATAMENTE como veio: se o piloto editou qualquer
   * campo, passou a ser dado dele e fica.
   */
  migrateSeedMotorcycle(): void {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEYS.SEED_BIKE_CLEARED) === 'true') return;

    const raw = localStorage.getItem(STORAGE_KEYS.MOTORCYCLE);
    if (raw) {
      try {
        const guardada = JSON.parse(raw) as Motorcycle;
        const intocada =
          guardada.id === DEFAULT_MOTORCYCLE.id &&
          guardada.brand === DEFAULT_MOTORCYCLE.brand &&
          guardada.model === DEFAULT_MOTORCYCLE.model &&
          guardada.licensePlate === DEFAULT_MOTORCYCLE.licensePlate &&
          guardada.currentKm === DEFAULT_MOTORCYCLE.currentKm;

        if (intocada) localStorage.removeItem(STORAGE_KEYS.MOTORCYCLE);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.MOTORCYCLE);
      }
    }

    localStorage.setItem(STORAGE_KEYS.SEED_BIKE_CLEARED, 'true');
  },

  /**
   * Remove intervalos "declarados" que o piloto nunca declarou.
   *
   * A ficha antiga vinha pré-preenchida com os valores padrão e os gravava ao
   * salvar. Quem abriu a ficha uma vez passou a ver "Você definiu 5.000 km" sem
   * nunca ter definido nada — e isso corrompe a distinção entre medido,
   * declarado e padrão, que é o que torna o app honesto.
   *
   * Só remove quando o valor é idêntico ao padrão: número diferente do padrão
   * é escolha real e fica.
   */
  migrateFakeDeclaredIntervals(): void {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEYS.FAKE_INTERVALS_CLEARED) === 'true') return;

    const padroes: Record<string, number> = {
      engine_oil: 5000,
      transmission_chain: 25000,
      brakes: 12000,
      tires: 15000,
    };

    const raw = localStorage.getItem(STORAGE_KEYS.MOTORCYCLE);
    if (raw) {
      try {
        const moto = JSON.parse(raw) as Motorcycle;
        if (moto.customIntervals) {
          for (const [chave, padrao] of Object.entries(padroes)) {
            const atual = moto.customIntervals[chave as ConsumableCategory];
            if (atual === padrao) delete moto.customIntervals[chave as ConsumableCategory];
          }
          localStorage.setItem(STORAGE_KEYS.MOTORCYCLE, JSON.stringify(moto));
        }
      } catch {
        // Dado ilegível: a leitura da moto já trata.
      }
    }

    localStorage.setItem(STORAGE_KEYS.FAKE_INTERVALS_CLEARED, 'true');
  },

  /** Sem moto cadastrada não há km a atualizar. */
  updateMotorcycleKm(newKm: number): Motorcycle | null {
    const current = this.getMotorcycle();
    if (!current) return null;
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

  /**
   * Atualiza a moto, ou cria a primeira a partir dos dados informados.
   *
   * Aceita criar do zero: é por aqui que o piloto sem moto cadastra a dele.
   */
  updateMotorcycle(data: Partial<Motorcycle>): Motorcycle {
    const current = this.getMotorcycle();
    const updated: Motorcycle = {
      id: current?.id || `moto-${Date.now()}`,
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      currentKm: 0,
      avgKmPerMonth: 0,
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

  respondToSOS(alertId: string, volunteer: SOSVolunteer): SOSAlert | null {
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

  getDiagnosticTree(): Record<string, DiagnosticNode> {
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

