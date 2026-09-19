import { useCallback, useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
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
 * POR QUE O PROVEDOR OFICIAL, E NÃO UM AuthRequest CRU
 *
 * A primeira versão montava o pedido à mão e mandava o Google redirecionar
 * para `motorede://`. O Google recusou com `400 invalid_request`, e a causa é
 * estrutural: o Client ID que tínhamos é do tipo **Web**, e esse tipo só aceita
 * redirecionamento `https://`. Esquema próprio exige um Client ID do tipo
 * **Android**, vinculado ao pacote e à assinatura do app.
 *
 * O provedor oficial conhece essas convenções — inclusive o formato de
 * redirecionamento que cada tipo de credencial espera — em vez de a gente
 * adivinhar.
 */

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = 'motorede_google_credential';

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

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID_ANDROID || undefined,
    webClientId: GOOGLE_CLIENT_ID_WEB || undefined,
    scopes: ['openid', 'profile', 'email'],
    // Sem responseType fixo, de propósito.
    //
    // A versão anterior forçava 'id_token', que é o formato do cliente Web.
    // Cliente do tipo Android NÃO aceita fluxo implícito: ele exige fluxo de
    // código com PKCE, e o Google recusa a combinação com 400 invalid_request.
    //
    // Deixando o provedor escolher, ele usa o fluxo certo para cada tipo de
    // credencial. O id_token chega no resultado de qualquer um dos dois.
  });

  // Sem credencial de Android, o Google recusa o esquema motorede:// com 400.
  const isConfigured = Boolean(GOOGLE_CLIENT_ID_ANDROID);

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

  // O resultado do fluxo chega por aqui, não pelo retorno de promptAsync.
  useEffect(() => {
    if (!response) return;

    if (response.type === 'error') {
      setError('O Google recusou o login. Verifique a credencial do app.');
      return;
    }

    if (response.type !== 'success') return;

    // O fluxo implícito devolve em params; o de código, em authentication.
    const idToken =
      response.params?.id_token ??
      (response.authentication as { idToken?: string } | undefined)?.idToken;

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
    setError(null);
    void AsyncStorage.setItem(STORAGE_KEY, idToken);
  }, [response]);

  const signIn = useCallback(async () => {
    if (!request) {
      setError('Login ainda não está pronto. Tente de novo em instantes.');
      return;
    }
    setError(null);
    await promptAsync();
  }, [request, promptAsync]);

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
