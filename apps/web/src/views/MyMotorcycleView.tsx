import React, { useState } from 'react';
import { ChevronDown, FileText, Pencil } from 'lucide-react';
import {
  Motorcycle,
  MaintenanceRecord,
  ConsumableCategory,
  MAINTENANCE_LABELS,
  parseIntervalKm,
  sortByUrgency,
  type MaintenanceItemStatus,
} from '@motorede/shared';
import { MotorcycleEmptyState } from '../components/MotorcycleEmptyState';
import { InfoAjuda } from '../components/InfoAjuda';
import { CampoIntervalo } from '../components/CampoIntervalo';
import { FolhaFormulario } from '../components/FolhaFormulario';
import { CartaoManutencao } from '../components/CartaoManutencao';

/**
 * Minha moto — uma aba só.
 *
 * Antes eram três superfícies para a mesma moto: a Ficha (modal de 17 campos),
 * a aba Manutenção e a aba Passaporte. Elas se sobrepunham de forma concreta —
 * dois formulários para o mesmo evento com campos diferentes, a mesma lista de
 * registros em dois layouts, e o mesmo botão de ficha com dois nomes. O
 * usuário precisava aprender onde ficava o quê antes de conseguir fazer
 * qualquer coisa.
 *
 * O alvo desta tela é uma frase: "troquei o óleo há 900 km, faltam 100 para os
 * 1.000". Ela tem duas metades, e a versão anterior mostrava só a segunda — o
 * `kmSinceLast` era calculado e nunca exibido.
 *
 * Por isso cada cartão mostra as duas, e o botão de registrar fica dentro do
 * cartão, com o verbo do piloto: "Troquei o óleo", não "Registrar".
 */

interface MyMotorcycleViewProps {
  motorcycle: Motorcycle | null;
  maintenance: MaintenanceItemStatus[];
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onUpdateKm: (km: number) => void;
  /** null volta ao padrão (ou a nenhum intervalo, no óleo). */
  onSetInterval: (category: ConsumableCategory, km: number | null) => void;
  onOpenEditMotorcycle?: () => void;
}

export const MyMotorcycleView: React.FC<MyMotorcycleViewProps> = ({
  motorcycle,
  maintenance,
  records,
  onAddRecord,
  onUpdateKm,
  onSetInterval,
  onOpenEditMotorcycle,
}) => {
  const [registrando, setRegistrando] = useState<ConsumableCategory | null>(null);
  const [km, setKm] = useState('');
  const [data, setData] = useState('');
  const [produto, setProduto] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [erroIntervalo, setErroIntervalo] = useState(false);
  const [editandoIntervalo, setEditandoIntervalo] = useState<ConsumableCategory | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [tecnicosAberto, setTecnicosAberto] = useState(false);
  const [editandoKm, setEditandoKm] = useState(false);
  const [kmMoto, setKmMoto] = useState('');

  if (!motorcycle) {
    return (
      <MotorcycleEmptyState
        telaInteira
        onCadastrar={onOpenEditMotorcycle}
        motivo="Cadastre marca, modelo e quilometragem para começar a acompanhar as trocas."
      />
    );
  }

  const abrirRegistro = (category: ConsumableCategory) => {
    // O último produto usado é a sugestão mais provável para o próximo.
    const ultimoDaCategoria = [...records]
      .filter((r) => r.category === category)
      .sort((a, b) => b.km - a.km)[0];

    setRegistrando(category);
    setKm(motorcycle.currentKm.toString());
    setData(new Date().toISOString().split('T')[0]);
    setProduto(ultimoDaCategoria?.product ?? '');
    setIntervalo(motorcycle.customIntervals?.[category]?.toString() ?? '');
    setErroIntervalo(false);
  };

  const abrirIntervalo = (category: ConsumableCategory) => {
    setEditandoIntervalo(category);
    setIntervalo(motorcycle.customIntervals?.[category]?.toString() ?? '');
    setErroIntervalo(false);
  };

  /** Vazio limpa; preenchido precisa ser válido. Volta false se não deu. */
  const aplicarIntervalo = (category: ConsumableCategory): boolean => {
    if (!intervalo.trim()) {
      if (motorcycle.customIntervals?.[category]) onSetInterval(category, null);
      return true;
    }
    const valor = parseIntervalKm(intervalo);
    if (valor === null) {
      setErroIntervalo(true);
      return false;
    }
    if (valor !== motorcycle.customIntervals?.[category]) onSetInterval(category, valor);
    return true;
  };

  const mudarIntervalo = (v: string) => {
    setIntervalo(v);
    setErroIntervalo(false);
  };

  const salvarIntervalo = (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoIntervalo && aplicarIntervalo(editandoIntervalo)) setEditandoIntervalo(null);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrando) return;

    const kmNum = parseInt(km, 10);
    if (isNaN(kmNum) || kmNum <= 0) return;
    if (!aplicarIntervalo(registrando)) return;

    onAddRecord({
      motorcycleId: motorcycle.id,
      // Meio-dia local: "2026-10-12" sozinho vira meia-noite UTC, que no
      // Brasil é o dia anterior — a troca aparecia com a data errada.
      date: new Date(`${data}T12:00:00`).toISOString(),
      km: kmNum,
      category: registrando,
      title: MAINTENANCE_LABELS[registrando],
      description: '',
      workshopName: '',
      product: produto.trim() || undefined,
      cost: 0,
      hasAttachment: false,
    });

    // A troca aconteceu com a moto nesse km: o odômetro não pode estar atrás.
    if (kmNum > motorcycle.currentKm) onUpdateKm(kmNum);

    setRegistrando(null);
  };

  const salvarKm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmMoto, 10);
    if (!isNaN(val) && val > 0) onUpdateKm(val);
    setEditandoKm(false);
  };

  const ordenados = sortByUrgency(maintenance);

  return (
    <div className="space-y-3 pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-4">
      {/* Identidade da moto */}
      <div className="rounded-2xl bg-gradient-to-b from-surface to-canvas border border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-ink truncate">
              {motorcycle.brand} {motorcycle.model}
              {motorcycle.licensePlate && (
                <span className="text-ink-faint font-mono text-xs ml-2">
                  {motorcycle.licensePlate}
                </span>
              )}
            </h2>
            {editandoKm ? (
              <form onSubmit={salvarKm} className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={kmMoto}
                  onChange={(e) => setKmMoto(e.target.value)}
                  autoFocus
                  className="w-28 px-2.5 py-1.5 rounded-lg bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-action text-on-action text-xs font-bold"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoKm(false)}
                  className="text-xs text-ink-muted px-2"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setKmMoto(motorcycle.currentKm.toString());
                    setEditandoKm(true);
                  }}
                  className="text-sm font-mono text-brand-soft flex items-center gap-1.5 hover:text-brand-soft transition"
                >
                  {motorcycle.currentKm.toLocaleString('pt-BR')} km
                  <Pencil className="w-3 h-3 opacity-60" />
                </button>
                <InfoAjuda chave="odometro" />
              </div>
            )}
          </div>

          {onOpenEditMotorcycle && (
            <button
              onClick={onOpenEditMotorcycle}
              className="px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink-muted text-xs font-semibold border border-line-strong transition active:scale-95 shrink-0"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Itens de manutenção, do mais urgente ao sem registro */}
      {ordenados.map((item) => (
        <CartaoManutencao
          key={item.category}
          item={item}
          onInformarIntervalo={() => abrirIntervalo(item.category)}
          onRegistrar={() => abrirRegistro(item.category)}
        />
      ))}

      {/* Histórico */}
      <div className="rounded-2xl bg-surface/80 border border-line overflow-hidden">
        <button
          onClick={() => setHistoricoAberto(!historicoAberto)}
          className="w-full p-4 flex items-center justify-between gap-2 hover:bg-elevated/40 transition"
        >
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider font-mono">
            Histórico completo ({records.length})
          </span>
          <ChevronDown
            className={`w-4 h-4 text-ink-faint transition-transform ${historicoAberto ? 'rotate-180' : ''}`}
          />
        </button>

        {historicoAberto && (
          <div className="px-4 pb-4">
            {records.length === 0 ? (
              <p className="text-[11px] text-ink-faint">Nenhum registro ainda.</p>
            ) : (
              <>
                <div className="divide-y divide-line/60">
                  {[...records]
                    .sort((a, b) => b.km - a.km)
                    .map((r) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-ink truncate">{r.title}</p>
                          <p className="text-[10px] text-ink-faint truncate">
                            {new Date(r.date).toLocaleDateString('pt-BR')}
                            {r.product && ` · ${r.product}`}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-ink-muted shrink-0">
                          {r.km.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => window.print()}
                  className="mt-3 w-full py-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-bold border border-line-strong transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-brand-soft" />
                  Gerar relatório
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dados técnicos */}
      <div className="rounded-2xl bg-surface/80 border border-line overflow-hidden">
        <button
          onClick={() => setTecnicosAberto(!tecnicosAberto)}
          className="w-full p-4 flex items-center justify-between gap-2 hover:bg-elevated/40 transition"
        >
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider font-mono">
            Dados técnicos e documento
          </span>
          <ChevronDown
            className={`w-4 h-4 text-ink-faint transition-transform ${tecnicosAberto ? 'rotate-180' : ''}`}
          />
        </button>

        {tecnicosAberto && (
          <div className="px-4 pb-4 space-y-2 text-[11px]">
            {[
              ['Ano', motorcycle.year?.toString()],
              ['Cilindrada', motorcycle.displacementCc && `${motorcycle.displacementCc} cc`],
              ['Tanque', motorcycle.tankCapacityLiters && `${motorcycle.tankCapacityLiters} L`],
              ['Consumo', motorcycle.avgConsumptionKmL && `${motorcycle.avgConsumptionKmL} km/l`],
              ['Chassi', motorcycle.chassisVin],
            ]
              .filter(([, valor]) => Boolean(valor))
              .map(([rotulo, valor]) => (
                <div key={rotulo as string} className="flex justify-between gap-3">
                  <span className="text-ink-faint flex items-center gap-1.5">
                    {rotulo}
                    {rotulo === 'Consumo' && <InfoAjuda chave="consumo" />}
                  </span>
                  <span className="text-ink-muted font-mono">{valor}</span>
                </div>
              ))}

            {motorcycle.tankCapacityLiters && motorcycle.avgConsumptionKmL && (
              <div className="flex justify-between gap-3 pt-2 border-t border-line">
                <span className="text-ink-faint flex items-center gap-1.5">
                  Autonomia estimada
                  <InfoAjuda chave="autonomia" />
                </span>
                <span className="text-brand-soft font-mono">
                  {Math.round(
                    motorcycle.tankCapacityLiters * motorcycle.avgConsumptionKmL
                  )}{' '}
                  km
                </span>
              </div>
            )}

            {onOpenEditMotorcycle && (
              <button
                onClick={onOpenEditMotorcycle}
                className="w-full mt-2 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink-muted text-xs font-semibold border border-line-strong transition"
              >
                Editar dados
              </button>
            )}
          </div>
        )}
      </div>

      {/* Registro: categoria vinda do cartão */}
      {registrando && (
        <FolhaFormulario
          titulo={`Troquei: ${MAINTENANCE_LABELS[registrando].toLowerCase()}`}
          onFechar={() => setRegistrando(null)}
          onSalvar={salvar}
        >
          <label className="block">
            <span className="text-[11px] text-ink-muted mb-1.5 block">Quilometragem na troca</span>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
            />
          </label>

          <label className="block">
            <span className="text-[11px] text-ink-muted mb-1.5 block">Quando foi</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-line-strong text-ink text-sm focus:outline-none focus:border-brand/60"
            />
          </label>

          <label className="block">
            <span className="text-[11px] text-ink-muted mb-1.5 block">
              Produto usado <span className="text-ink-faint">(opcional)</span>
            </span>
            <input
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              placeholder="ex: Motul 5100 10W40"
              className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-line-strong text-ink text-sm placeholder:text-ink-faint focus:outline-none focus:border-brand/60"
            />
          </label>

          <CampoIntervalo
            category={registrando}
            valor={intervalo}
            onChange={mudarIntervalo}
            erro={erroIntervalo}
          />
        </FolhaFormulario>
      )}

      {/* Só o intervalo, sem registrar troca */}
      {editandoIntervalo && (
        <FolhaFormulario
          titulo={MAINTENANCE_LABELS[editandoIntervalo]}
          onFechar={() => setEditandoIntervalo(null)}
          onSalvar={salvarIntervalo}
        >
          <CampoIntervalo
            category={editandoIntervalo}
            valor={intervalo}
            onChange={mudarIntervalo}
            erro={erroIntervalo}
            autoFocus
          />
        </FolhaFormulario>
      )}
    </div>
  );
};
