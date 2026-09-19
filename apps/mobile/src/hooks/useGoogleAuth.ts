import { useCallback, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_CLIENT_ID_ANDROID, GOOGLE_CLIENT_ID_WEB } from '../config';

/**
 * Login com Google no app.
 *
 * Espelha o contrato do hook da web: o `id_token` assinado pelo Google **é** a
 * sessão. Nada é guardado em servidor, e cada pedido de entrada no comboio leva
 * a prova de identidade junto, verificada contra as chaves públicas do Google.
 *
 * A diferença em relação à web é só o mecanismo: lá o Google Identity Services
 * desenha um botão; aqui o fluxo abre o navegador do sistema e volta pelo
 * scheme `motorede://`, que já está registrado no app.
 */

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = 'motorede_google_credential';

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
  idToken: string;
  expiresAt: number;
}

interface UseGoogleAuth {
  user: GoogleUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => string | null;
}

/** Lê o conteúdo do JWT sem verificar — a verificação real é no servidor. */
function decodeIdToken(idToken: string): GoogleUser | null {
  try {
    const base = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json);
    if (!payload.sub || !payload.exp) return null;
    return {
      name: payload.name || payload.email || 'Piloto',
      email: payload.email || '',
      picture: payload.picture,
      idToken,
      expiresAt: payload.exp * 1000,
    };
  } catch {
    return null;
  }
}

export function useGoogleAuth(): UseGoogleAuth {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientId = GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID_WEB;
  const isConfigured = Boolean(clientId);

  // Retoma a sessão anterior, se ainda válida.
  useEffect(() => {
    void (async () => {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);
        if (salvo) {
          const restaurado = decodeIdToken(salvo);
          if (restaurado && restaurado.expiresAt > Date.now()) {
            setUser(restaurado);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (!clientId) {
      setError('Login não configurado neste build.');
      return;
    }

    setError(null);

    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'motorede' });

      // `id_token` direto no fluxo implícito: é o que o servidor verifica, e
      // evita guardar segredo de cliente dentro do app — que seria inseguro,
      // já que qualquer um pode abrir um APK.
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        scopes: ['openid', 'profile', 'email'],
        extraParams: { nonce: String(Date.now()) },
      });

      const resultado = await request.promptAsync(DISCOVERY);

      if (resultado.type !== 'success') {
        if (resultado.type === 'error') setError('Não foi possível entrar.');
        return;
      }

      const idToken = resultado.params.id_token;
      if (!idToken) {
        setError('O Google não devolveu a identificação.');
        return;
      }

      const proximo = decodeIdToken(idToken);
      if (!proximo) {
        setError('Identificação inválida.');
        return;
      }

      setUser(proximo);
      await AsyncStorage.setItem(STORAGE_KEY, idToken);
    } catch {
      setError('Falha ao entrar com o Google.');
    }
  }, [clientId]);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const getIdToken = useCallback(() => {
    if (!user) return null;
    // Token vencido não serve: o servidor recusaria e o erro seria confuso.
    if (user.expiresAt <= Date.now()) return null;
    return user.idToken;
  }, [user]);

  return { user, isLoading, isConfigured, error, signIn, signOut, getIdToken };
}
