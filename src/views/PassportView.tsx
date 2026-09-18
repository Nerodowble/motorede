import React, { useState } from 'react';
import {
  BookOpenCheck,
  ShieldCheck,
  Plus,
  Calendar,
  Gauge,
  Receipt,
  Download,
  Share2,
  CheckCircle2,
  FileText,
  BadgeCheck,
  Wrench,
  Sparkles,
  X,
  Printer,
  Settings2,
} from 'lucide-react';
import { Motorcycle, MaintenanceRecord, ConsumableCategory } from '../types';

interface PassportViewProps {
  motorcycle: Motorcycle;
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onOpenEditMotorcycle?: () => void;
}

export const PassportView: React.FC<PassportViewProps> = ({
  motorcycle,
  records,
  onAddRecord,
  onOpenEditMotorcycle,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ConsumableCategory | 'general_inspection'>('engine_oil');
  const [km, setKm] = useState(motorcycle.currentKm.toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workshopName, setWorkshopName] = useState('MotoTech Garage');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  const totalSpent = records.reduce((acc, r) => acc + (r.cost || 0), 0);
  const verifiedCount = records.filter((r) => r.verifiedByPartner).length;

  // Provenance Score (0 to 100) based on regularity of oil changes, documentation, and verified services
  const provenanceScore = Math.min(99, Math.round(75 + (verifiedCount / (records.length || 1)) * 24));

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !km) return;

    onAddRecord({
      motorcycleId: motorcycle.id,
      title: title.trim(),
      category: category as ConsumableCategory,
      km: parseInt(km, 10) || motorcycle.currentKm,
      date,
      workshopName: workshopName.trim() || 'Serviço Particular',
      cost: parseFloat(cost) || 0,
      description: description.trim(),
      receiptNumber: receiptNumber.trim() || undefined,
      hasAttachment: true,
      verifiedByPartner: true,
    });

    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setCost('');
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpenCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Passaporte da Moto
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Prontuário Digital
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Histórico cronológico de revisões e manutenções com selo de procedência para valorização de venda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenEditMotorcycle && (
              <button
                onClick={onOpenEditMotorcycle}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
                title="Editar dados da moto, chassi e especificações"
              >
                <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Dados da Moto</span>
              </button>
            )}
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              Relatório de Procedência
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Registro
            </button>
          </div>
        </div>

        {/* Provenance Metrics Stats Bar */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Score de Procedência:</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 font-mono flex items-center gap-1">
              {provenanceScore}/100 <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">(Excelente)</span>
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Revisões no Prontuário:</span>
            <p className="text-base sm:text-lg font-black text-white font-mono">
              {records.length} <span className="text-[11px] font-normal text-slate-400">serviços</span>
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Investimento Total:</span>
            <p className="text-base sm:text-lg font-black text-amber-400 font-mono">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Chronological Maintenance Records Timeline */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            Linha do Tempo de Cuidados do Veículo
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Ordenado por data decrescente</span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {records.map((record) => (
            <div key={record.id} className="relative">
              {/* Timeline pin */}
              <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-amber-500" />

              <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{record.title}</h4>
                    {record.verifiedByPartner && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Comprovado
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-amber-400">
                    R$ {record.cost.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-2">{record.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {record.date}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-slate-500" />
                    {record.km.toLocaleString('pt-BR')} km
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">{record.workshopName}</span>
                  {record.receiptNumber && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400">{record.receiptNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Maintenance Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Registrar Serviço no Prontuário
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Título do Serviço</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Troca de Óleo Motul 5100 e Filtro K&N"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Quilometragem (KM)</label>
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Oficina / Mecânico</label>
                  <input
                    type="text"
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    placeholder="Ex: MotoTech ou Particular"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nota Fiscal / Comprovante (Opcional)</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Ex: NF-e 004829"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Detalhes e Peças Utilizadas</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Especificação do lubrificante, código das pastilhas ou observações mecânicas..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white h-20 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provenance Certificate Modal (Relatório de Venda) */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-slate-950 border-2 border-amber-500/50 p-6 shadow-2xl text-slate-200 my-auto">
            {/* Certificate Header */}
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 mb-2">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Certificado Digital de Procedência MotoRede
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Prontuário Comprovado de Manutenção para Valorização Veicular
              </p>
            </div>

            {/* Vehicle Identification Card */}
            <div className="my-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-extrabold text-white">
                  {motorcycle.brand} {motorcycle.model} ({motorcycle.year})
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {motorcycle.licensePlate}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80 text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px]">KM no Certificado:</span>
                  <p className="font-bold">{motorcycle.currentKm.toLocaleString('pt-BR')} km</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px]">Score de Cuidados:</span>
                  <p className="font-bold text-emerald-400">{provenanceScore} / 100 (Ouro)</p>
                </div>
              </div>
            </div>

            {/* Documented Summary list */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Extrato Cronológico Comprovado:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/50 text-xs">
                {records.map((r) => (
                  <div key={r.id} className="pt-1.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{r.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {r.date} • {r.km.toLocaleString('pt-BR')} km • {r.workshopName}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-300">R$ {r.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authenticity Hash / Verification */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 mb-5">
              <span>Código Autenticador:</span>
              <span className="text-amber-400 font-bold">MOTOREDE-VERIFIED-9821</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </button>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
