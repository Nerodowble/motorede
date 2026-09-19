import React, { useEffect, useRef } from 'react';
import { Radio, ShieldCheck, Wrench, Headphones } from 'lucide-react';
import type { useGoogleAuth } from '../hooks/useGoogleAuth';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';

/**
 * Porta de entrada do MotoRede.
 *
 * Antes o app criava sozinho uma sessão fictícia (`DEFAULT_USERS[0]`), então
 * todo mundo entrava como o mesmo piloto de demonstração sem perceber. Agora a
 * identidade é real: vem do Google, e é a mesma que o servidor verifica ao
 * liberar a entrada no comboio.
 */

interface LoginScreenProps {
  auth: ReturnType<typeof useGoogleAuth>;
}

const DESTAQUES = [
  { icon: Radio, texto: 'Comboio por voz, com a tela bloqueada' },
  { icon: ShieldCheck, texto: 'Socorro geolocalizado na estrada' },
  { icon: Wrench, texto: 'Manutenção prevista pela sua quilometragem' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ auth }) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();

  useEffect(() => {
    auth.renderButton(buttonRef.current);
  }, [auth.isReady, auth.renderButton]);

  return (
    // Centralizar com `items-center` transborda para os dois lados quando o
    // conteúdo passa da altura da tela, e o que sai por cima fica inalcançável
    // — não existe rolagem para área negativa. `my-auto` centraliza sem esse
    // efeito: sobrando espaço ele centraliza, faltando espaço ele rola.
    <div className="min-h-screen bg-canvas flex justify-center px-4 py-8">
      <div className="w-full max-w-sm my-auto">
        <div className="flex justify-end mb-4">
          <ThemeToggle choice={theme.choice} onChange={theme.escolher} />
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-soft mx-auto mb-4">
            <Headphones className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">MotoRede</h1>
          <p className="text-sm text-ink-muted mt-1">
            A rede de quem anda sobre duas rodas
          </p>
        </div>

        <div className="rounded-2xl bg-surface border border-line p-5 shadow-xl">
          <ul className="space-y-3 mb-6">
            {DESTAQUES.map(({ icon: Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center text-brand-soft shrink-0">
                  <Icone className="w-4 h-4" />
                </div>
                <span className="text-xs text-ink-muted">{texto}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-line">
            <p className="text-[11px] text-ink-muted mb-3 text-center">
              Entre para os outros pilotos te reconhecerem no comboio.
            </p>

            <div ref={buttonRef} className="flex justify-center" />

            {!auth.isReady && (
              <p className="text-[11px] text-ink-faint text-center mt-3 animate-pulse">
                Carregando...
              </p>
            )}
          </div>
        </div>

        <p className="text-[10px] text-ink-faint text-center mt-5 leading-relaxed">
          Usamos sua conta apenas para identificar você no comboio.
          <br />
          Não publicamos nada e não acessamos seus contatos.
        </p>
      </div>
    </div>
  );
};
