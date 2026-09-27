import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { linkDoConvite } from '../services/convoyInvite';

/**
 * QR do convite do comboio. Saiu de ConvoyVoiceView para a tela caber no
 * limite de tamanho — e porque a geração do QR não tem nada a ver com a voz.
 */

interface ConvoyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  copiado: boolean;
  onCopiarLink: () => void;
}

export const ConvoyQRModal: React.FC<ConvoyQRModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  copiado,
  onCopiarLink,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const inviteUrl = linkDoConvite(roomCode);

  // Gera o QR de verdade quando o modal abre ou o comboio muda.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    QRCode.toDataURL(inviteUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 shadow-2xl text-center">
        <h3 className="text-base font-extrabold text-ink mb-1">Ingressar no Comboio</h3>
        <p className="text-xs text-ink-muted mb-4">
          Aponte a câmera do celular para entrar diretamente na sala de voz:
        </p>

        {/* Fundo branco fixo de propósito: leitor de QR precisa de contraste
            escuro-sobre-claro, em qualquer tema. */}
        <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code do comboio ${roomCode}`} className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-ink-muted text-xs">
              Gerando...
            </div>
          )}
        </div>

        <p className="font-mono text-sm font-bold text-code mb-4 tracking-wider">
          CÓDIGO: {roomCode}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCopiarLink}
            className="flex-1 min-h-11 px-3 bg-elevated hover:bg-line-strong text-ink text-xs font-bold rounded-lg border border-line-strong"
          >
            {copiado ? 'Link Copiado!' : 'Copiar Link'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-h-11 px-3 bg-action hover:opacity-90 text-on-action text-xs font-bold rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
