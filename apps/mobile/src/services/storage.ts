import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaintenanceRecord, Motorcycle } from '@motorede/shared';

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
  MOTORCYCLE: 'motorede_motorcycle',
  RECORDS: 'motorede_maintenance_records',
  LAST_ROOM: 'motorede_last_room_code',
  PHONE: 'motorede_phone',
  FAVORITES: 'motorede_favorite_rooms',
} as const;

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
  /** A moto do piloto, ou null se ainda não cadastrou. */
  getMotorcycle: () => ler<Motorcycle>(CHAVES.MOTORCYCLE),
  saveMotorcycle: (moto: Motorcycle) => gravar(CHAVES.MOTORCYCLE, moto),

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
