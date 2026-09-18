export type UserRole = 'rider' | 'partner_shop' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  createdAt: string;
  motorcycle?: Motorcycle;
  shopName?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  specialties?: string[];
  department?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}

export type EmergencyType = 
  | 'mechanical_breakdown' 
  | 'flat_tire' 
  | 'out_of_fuel' 
  | 'accident_fall' 
  | 'electrical_battery';

export type ConsumableCategory = 
  | 'engine_oil' 
  | 'transmission_chain' 
  | 'tires' 
  | 'brakes' 
  | 'air_filter_spark_plug'
  | 'battery';

export interface Motorcycle {
  id: string;
  brand: string;
  model: string;
  year: number;
  displacementCc?: number; // Cilindrada (ex: 500cc, 160cc, 1200cc)
  fuelType?: 'gasoline' | 'flex' | 'ethanol'; // Tipo de combustível
  avgConsumptionKmL?: number; // Média real de consumo km/l
  tankCapacityLiters?: number; // Capacidade do tanque em litros
  ridingStyle?: 'calm' | 'mixed' | 'aggressive' | 'commuter_heavy'; // Estilo de pilotagem (influencia desgaste de óleo e relação)
  licensePlate: string;
  chassisVin?: string; // Chassi / Renavam (opcional para passaporte)
  currentKm: number;
  avgKmPerMonth: number;
  lastKmUpdate: string; // ISO date
  photoUrl?: string;
  notes?: string;
  // Custom consumable intervals set by the user or manual:
  customIntervals?: Partial<Record<ConsumableCategory, number>>;
}

export interface ConsumableStatus {
  id: string;
  category: ConsumableCategory;
  name: string;
  intervalKm: number;
  intervalMonths: number;
  lastChangedKm: number;
  lastChangedDate: string;
  currentWearPercentage: number; // 0 to 100
  estimatedRemainingKm: number;
  estimatedRemainingDays: number;
  status: 'optimal' | 'warning' | 'critical'; // optimal (>30% left), warning (10-30%), critical (<10%)
}

export interface MaintenanceRecord {
  id: string;
  motorcycleId: string;
  date: string;
  km: number;
  category: ConsumableCategory | 'general_inspection' | 'accessories' | 'other';
  title: string;
  description: string;
  workshopName: string; // e.g. "MotoTech Especializada" or "Feito pelo Piloto"
  cost: number; // BRL
  receiptNumber?: string;
  hasAttachment: boolean;
  verifiedByPartner?: boolean;
}

export interface SOSVolunteer {
  id: string;
  name: string;
  motorcycle: string;
  phone?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: 'en_route' | 'arrived' | 'supporting';
  joinedAt: string;
}

export interface SOSChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isQuickPhrase?: boolean;
}

export type ShopPartner = {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  lat: number;
  lng: number;
  coverageRadiusKm: number;
  rating: number;
  verified: boolean;
  specialties?: string[];
  isVerified?: boolean;
};

export type PartnerShop = ShopPartner;

export interface SOSAlert {
  id: string;
  petitionerId: string;
  petitionerName: string;
  petitionerPhone: string;
  motorcycleInfo: string;
  type: EmergencyType;
  details: string;
  lat: number;
  lng: number;
  locationReference: string;
  radiusKm: number;
  createdAt: string;
  timestamp?: string;
  status: 'active' | 'in_progress' | 'resolved' | 'cancelled';
  volunteers: SOSVolunteer[];
  chatMessages: SOSChatMessage[];
}

export interface VoiceParticipant {
  id: string;
  name: string;
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  volume: number; // 0 to 100
  distanceToHostKm?: number;
  deviceType?: 'headset' | 'phone' | 'intercom';
}

export interface VoiceRoom {
  id: string;
  code: string;
  name: string;
  creatorId: string;
  creatorName: string;
  isActive: boolean;
  createdAt: string;
  destinationName?: string;
  destinationLat?: number;
  destinationLng?: number;
  participants: VoiceParticipant[];
}

export interface Coupon {
  id: string;
  shopId: string;
  shopName: string;
  shopCity: string;
  shopState?: string;
  shopDistanceKm: number;
  title: string;
  description: string;
  discountPercentage: number;
  targetCategory: ConsumableCategory;
  promoCode: string;
  validUntil: string;
  minPurchaseValue?: number;
  isActive?: boolean;
  redemptionsCount?: number;
}

export interface DiagnosticNode {
  id: string;
  question: string;
  diagnosis?: string;
  recommendation?: string;
  severity?: 'safe_to_ride' | 'caution' | 'danger_stop';
  options?: {
    label: string;
    nextNodeId: string;
  }[];
}

export interface DiagnosticDecisionStep {

  id: string;
  question: string;
  options: {
    label: string;
    nextStepId?: string;
    result?: DiagnosticResult;
  }[];
}

export interface DiagnosticResult {
  title: string;
  category: string;
  probableCause: string;
  urgency: 'critical' | 'warning' | 'low';
  roadsideCheckInstructions: string[];
  estimatedCostRange: string;
  suggestedAction: string;
}

export interface CommunitySymptom {
  id: string;
  brand: string;
  model: string;
  yearRange: string;
  symptom: string;
  cause: string;
  solution: string;
  authorName: string;
  createdAt: string;
  status: 'approved' | 'pending' | 'rejected';
  upvotes: number;
}
