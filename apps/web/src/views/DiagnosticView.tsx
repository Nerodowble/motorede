import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  Send,
  Zap,
  Flame,
  Wrench,
} from 'lucide-react';
import { DiagnosticNode } from '@motorede/shared';
import { storageService } from '../services/storage';

interface DiagnosticViewProps {
  onExportToSOS: (diagnosisSummary: string, severity: 'safe_to_ride' | 'caution' | 'danger_stop') => void;
}

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({ onExportToSOS }) => {
  const tree = useMemo(() => storageService.getDiagnosticTree(), []);
  const [currentNodeId, setCurrentNodeId] = useState<string>('diag-root');
  const [history, setHistory] = useState<string[]>([]);

  const currentNode = tree[currentNodeId] || tree['diag-root'];

  const handleSelectOption = (nextNodeId: string) => {
    setHistory([...history, currentNodeId]);
    setCurrentNodeId(nextNodeId);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentNodeId(previous);
  };

  const handleReset = () => {
    setHistory([]);
    setCurrentNodeId('diag-root');
  };

  const isLeaf = !currentNode.options || currentNode.options.length === 0;

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Triagem Mecânica na Estrada
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                  Árvore de Decisão
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Diagnóstico guiado passo a passo para identificar a causa de falhas antes de acionar socorro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          </div>
        </div>
      </div>

      {/* Decision Tree Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
        {/* Progress breadcrumbs */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-4 pb-2 border-b border-slate-800">
          <span>Etapa {history.length + 1}</span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">{isLeaf ? 'Diagnóstico Concluído' : 'Em Avaliação'}</span>
        </div>

        {/* Question or Conclusion Title */}
        <div className="mb-5">
          <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
            {isLeaf ? 'Resultado e Recomendação' : 'Pergunta de Verificação'}
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-white mt-2 leading-snug">
            {currentNode.question}
          </h3>
        </div>

        {/* If node is intermediate question: render answer options */}
        {!isLeaf && currentNode.options && (
          <div className="space-y-2.5">
            {currentNode.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(option.nextNodeId)}
                className="w-full text-left p-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-200 transition active:scale-[0.99] flex items-center justify-between group shadow-sm"
              >
                <span className="text-xs sm:text-sm font-semibold group-hover:text-amber-400 transition">
                  {option.label}
                </span>
                <span className="text-slate-500 group-hover:text-amber-400 transition text-sm">→</span>
              </button>
            ))}
          </div>
        )}

        {/* If node is leaf: render diagnostic conclusion, safety advice & export to SOS */}
        {isLeaf && (
          <div className="space-y-4">
            <div
              className={`rounded-xl p-4 border ${
                currentNode.severity === 'danger_stop'
                  ? 'bg-red-950/30 border-red-800/50'
                  : currentNode.severity === 'caution'
                  ? 'bg-amber-950/30 border-amber-800/50'
                  : 'bg-emerald-950/30 border-emerald-800/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {currentNode.severity === 'danger_stop' ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : currentNode.severity === 'caution' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                <span
                  className={`text-xs font-black uppercase tracking-wider font-mono ${
                    currentNode.severity === 'danger_stop'
                      ? 'text-red-400'
                      : currentNode.severity === 'caution'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {currentNode.severity === 'danger_stop'
                    ? 'PERIGO: NÃO TENTE LIGAR O MOTOR'
                    : currentNode.severity === 'caution'
                    ? 'ATENÇÃO REQUERIDA NO ACOSTAMENTO'
                    : 'VERIFICAÇÃO BÁSICA'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-2">{currentNode.diagnosis}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{currentNode.recommendation}</p>
            </div>

            {/* Quick action: Export result to SOS */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Não conseguiu resolver sozinho?</p>
                <p className="text-[11px] text-slate-400">
                  Exporte este resumo técnico automaticamente para o radar de socorro SOS da comunidade.
                </p>
              </div>

              <button
                onClick={() =>
                  onExportToSOS(
                    `${currentNode.diagnosis}: ${currentNode.recommendation}`,
                    currentNode.severity || 'caution'
                  )
                }
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition border border-red-500/40 shrink-0"
              >
                <ShieldAlert className="w-4 h-4" />
                Exportar para SOS Comunitário
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Emergency road safety tips */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
        <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Segurança em primeiro lugar:</span>
          <p className="mt-0.5 leading-relaxed">
            Se estiver em rodovia, posicione sua moto além da faixa de acostamento, ligue o pisca-alerta e nunca fique de costas para o tráfego enquanto realiza inspeções mecânicas.
          </p>
        </div>
      </div>
    </div>
  );
};
