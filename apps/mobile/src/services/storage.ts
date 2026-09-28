import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaintenanceRecord, Motorcycle, RiderProfile } from '@motorede/shared';

/**
 * Persistência local do app.
 *
 * Espelha o que a web guarda no localStorage, com as mesmas chaves conceituais.
 * Ainda é por aparelho: o piloto que trocar de celular recomeça. Sincronizar
 * entre aparelhos é trabalho do backend, e entra quando houver banco.
 *
 * Tudo é assíncrono porque o AsyncStorage é assíncrono — diferente do
 * localStorage da web, que é síncrono. É a única diferença real de forma entre
 * as duas implementações.
 */

const CHAVES = {
  PROFILE: 'motorede_profile',
  MOTORCYCLE: 'motorede_motorcycle',
  RECORDS: 'motorede_maintenance_records',
  LAST_ROOM: 'motorede_last_room_code',
  PHONE: 'motorede_phone',
  FAVORITES: 'motorede_favorite_rooms',
  MEUS_PEDIDOS: 'motorede_meus_pedidos',
  MODO_AUDIO: 'motorede_modo_audio',
} as const;

/**
 * Como o Android trata o som do comboio.
 *
 * - conversa: modo "ligação". O aparelho aplica o tratamento de
 *   chamada — supressão de ruído, controle automático de volume, cancelamento
 *   de eco pelo hardware. Ótimo para voz.
 * - musica: modo "mídia" — O PADRÃO. Sem o tratamento de chamada, que em música faz o
 *   volume subir e descer e o som "quebrar", mesmo com o microfone mudo.
 *   Os botões de volume passam a controlar o volume de mídia.
 *
 * Música virou o padrão (2026-09-27): medido no aparelho, o sinal do plugin
 * chegava perfeito e o modo ligação o abafava. Sem cancelamento de eco de
 * chamada — o uso previsto é com capacete/fone. ATENÇÃO: o microfone de
 * intercomunicador Bluetooth só abre no modo ligação; se ele falhar, Conversa
 * em Ajustes resolve.
 */
export type ModoAudio = 'conversa' | 'musica';

async function ler<T>(chave: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function gravar(chave: string, valor: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou indisponível: a sessão continua em memória.
  }
}

export const storage = {
  getModoAudio: async (): Promise<ModoAudio> => {
    try {
      return (await AsyncStorage.getItem(CHAVES.MODO_AUDIO)) === 'conversa' ? 'conversa' : 'musica';
    } catch {
      return 'musica';
    }
  },
  saveModoAudio: async (modo: ModoAudio) => {
    try {
      await AsyncStorage.setItem(CHAVES.MODO_AUDIO, modo);
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  },

  /** Perfil do piloto, ou null se ainda não cadastrou. */
  getProfile: () => ler<RiderProfile>(CHAVES.PROFILE),
  saveProfile: (perfil: RiderProfile) => gravar(CHAVES.PROFILE, perfil),
  clearProfile: async () => {
    try {
      await AsyncStorage.removeItem(CHAVES.PROFILE);
    } catch {
      // segue com o perfil em memória
    }
  },

  /** A moto do piloto, ou null se ainda não cadastrou. */
  getMotorcycle: () => ler<Motorcycle>(CHAVES.MOTORCYCLE),
  saveMotorcycle: (moto: Motorcycle) => gravar(CHAVES.MOTORCYCLE, moto),

  /**
   * Pedidos de socorro que VOCÊ abriu e ainda estão de pé.
   *
   * Guardado porque o próprio pedido é excluído da lista de chamados alheios
   * — senão você se veria ali como se fosse outra pessoa. Sem isto, abrir um
   * socorro e fechar o app significaria perdê-lo de vista sem saber que
   * continua de pé nem como encerrar.
   */
  getMeusPedidos: async (): Promise<unknown[]> =>
    (await ler<unknown[]>(CHAVES.MEUS_PEDIDOS)) ?? [],
  saveMeusPedidos: (lista: unknown[]) => gravar(CHAVES.MEUS_PEDIDOS, lista),

  getRecords: async (): Promise<MaintenanceRecord[]> =>
    (await ler<MaintenanceRecord[]>(CHAVES.RECORDS)) ?? [],
  saveRecords: (registros: MaintenanceRecord[]) => gravar(CHAVES.RECORDS, registros),

  getLastRoom: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(CHAVES.LAST_ROOM);
    } catch {
      return null;
    }
  },
  saveLastRoom: async (codigo: string) => {
    try {
      await AsyncStorage.setItem(CHAVES.LAST_ROOM, codigo);
    } catch {
      // segue sem lembrar
    }
  },

  /**
   * Telefone do piloto. Fica só neste aparelho e viaja no pedido de entrada
   * apenas para o servidor derivar a impressão digital da busca.
   */
  getPhone: async (): Promise<string> => {
    try {
      return (await AsyncStorage.getItem(CHAVES.PHONE)) ?? '';
    } catch {
      return '';
    }
  },
  savePhone: async (telefone: string) => {
    try {
      await AsyncStorage.setItem(CHAVES.PHONE, telefone);
    } catch {
      // segue sem lembrar
    }
  },

  getFavorites: async (): Promise<string[]> =>
    (await ler<string[]>(CHAVES.FAVORITES)) ?? [],
  saveFavorites: (codigos: string[]) => gravar(CHAVES.FAVORITES, codigos),
};
