import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Login com Google no navegador, via Google Identity Services.
 *
 * O Google devolve um `id_token` assinado — um JWT com nome, e-mail e foto,
 * válido por cerca de uma hora. Esse token **é** a sessão: não guardamos nada
 * no servidor, e cada pedido de entrada no comboio leva a prova de identidade
 * junto, que a função serverless verifica contra as chaves públicas do Google.
 *
 * Por isso não existe banco de dados nem gestão de sessão nesta etapa.
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const STORAGE_KEY = 'motorede_google_credential';

export interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
  /** O JWT que vai junto no pedido de token do LiveKit. */
  idToken: string;
  /** Momento em que o token expira (epoch em milissegundos). */
  expiresAt: number;
}

interface UseGoogleAuth {
  user: GoogleUser | null;
  isReady: boolean;
  isConfigured: boolean;
  signIn: () => void;
  signOut: () => void;
  /** Desenha o botão oficial do Google no elemento indicado. */
  renderButton: (el: HTMLElement | null) => void;
  /** Token válido, ou null se não há login ou já expirou. */
  getIdToken: () => string | null;
}

interface GoogleCredentialResponse {
  credential: string;
}

/** Lê o conteúdo do JWT sem verificar — a verificação real é no servidor. */
function decodeIdToken(idToken: string): GoogleUser | null {
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
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
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  // Retoma a sessão anterior, se ainda estiver válida.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const restored = decodeIdToken(saved);
    if (restored && restored.expiresAt > Date.now()) {
      setUser(restored);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Carrega o script do Google uma única vez.
  useEffect(() => {
    if (!clientId || initialized.current) return;
    initialized.current = true;

    const handleCredential = (response: GoogleCredentialResponse) => {
      const next = decodeIdToken(response.credential);
      if (!next) return;
      setUser(next);
      try {
        localStorage.setItem(STORAGE_KEY, response.credential);
      } catch {
        // Modo privado ou armazenamento bloqueado: a sessão vale só para esta aba.
      }
    };

    const setup = () => {
      const google = (window as unknown as { google?: any }).google;
      if (!google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
      });
      setIsReady(true);
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      setup();
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = setup;
    document.head.appendChild(script);
  }, [clientId]);

  const signIn = useCallback(() => {
    const google = (window as unknown as { google?: any }).google;
    google?.accounts?.id?.prompt();
  }, []);

  const renderButton = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !isReady) return;
      const google = (window as unknown as { google?: any }).google;
      google?.accounts?.id?.renderButton(el, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        locale: 'pt-BR',
      });
    },
    [isReady]
  );

  const signOut = useCallback(() => {
    const google = (window as unknown as { google?: any }).google;
    google?.accounts?.id?.disableAutoSelect();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const getIdToken = useCallback(() => {
    if (!user) return null;
    // Token vencido não serve: o servidor recusaria, e o erro seria confuso.
    if (user.expiresAt <= Date.now()) return null;
    return user.idToken;
  }, [user]);

  return {
    user,
    isReady,
    isConfigured: Boolean(clientId),
    signIn,
    signOut,
    renderButton,
    getIdToken,
  };
}
