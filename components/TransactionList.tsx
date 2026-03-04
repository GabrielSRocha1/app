import React, { useState } from 'react';
import { Trash2, CheckCircle2, Clock } from 'lucide-react';
import { CATEGORIES } from '../constants.tsx';
import { Transaction, TransactionType } from '../types.ts';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void>;
  onTogglePaid?: (id: string) => Promise<void>;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onTogglePaid }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="bg-[#111] p-10 rounded-[32px] border border-dashed border-white/5 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-800">💰</div>
        <p className="uppercase tracking-widest text-gray-700 text-h5">Inicie sua jornada Zen anotando seus gastos.</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleToggle = async (id: string) => {
    if (!onTogglePaid) return;
    setTogglingId(id);
    await onTogglePaid(id);
    setTogglingId(null);
  };

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div key={t.id} className="bg-[#111] p-4 rounded-[22px] border border-white/5 flex items-center gap-4 group hover:bg-white/[0.03] transition-colors">
          {/* Ícone da categoria */}
          <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 ${CATEGORIES[t.category]?.color || 'bg-white/5 text-gray-400'}`}>
            {CATEGORIES[t.category]?.icon || '💰'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white line-clamp-1 tracking-tight text-h4">{t.description || t.category}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-600 uppercase tracking-wider text-h5 truncate">
                {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {t.category}
              </p>
              {t.type === TransactionType.EXPENSE && (
                <span className={`shrink-0 flex items-center gap-1 text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-[4px] ${t.isPaid
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
                  }`}>
                  {t.isPaid ? <CheckCircle2 size={8} strokeWidth={3} /> : <Clock size={8} />}
                  {t.isPaid ? 'Pago' : 'Pendente'}
                </span>
              )}
            </div>
          </div>

          {/* Valor + Ações */}
          <div className="flex items-center gap-2 shrink-0">
            <p className={`tracking-tighter font-black ${t.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'} text-h4`}>
              {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>

            {/* Botão: Marcar como pago/pendente */}
            {onTogglePaid && t.type === TransactionType.EXPENSE && (
              <button
                onClick={() => handleToggle(t.id)}
                disabled={togglingId === t.id}
                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-[6px] transition-all ${t.isPaid
                  ? 'text-yellow-600 hover:bg-yellow-500/10'
                  : 'text-green-600 hover:bg-green-500/10'
                  }`}
                title={t.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
              >
                <CheckCircle2 size={15} className={togglingId === t.id ? 'animate-pulse' : ''} />
              </button>
            )}

            {/* Botão: Excluir */}
            {onDelete && (
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-[6px] transition-all"
                title="Excluir lançamento"
              >
                <Trash2 size={15} className={deletingId === t.id ? 'animate-pulse' : ''} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;