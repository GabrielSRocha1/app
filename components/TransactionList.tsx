import React from 'react';
import { CATEGORIES } from '../constants.tsx';
import { Transaction, TransactionType } from '../types.ts';

interface TransactionListProps {
  transactions: Transaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-[#111] p-10 rounded-[32px] border border-dashed border-white/5 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-800">💰</div>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-700">Inicie sua jornada Zen anotando seus gastos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((t) => (
        <div key={t.id} className="bg-[#111] p-5 rounded-[28px] border border-white/5 flex items-center gap-5 hover:bg-white/5 transition-colors">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400 shadow-inner`}>
            {CATEGORIES[t.category]?.icon || '💰'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white line-clamp-1 tracking-tight">{t.description || 'Sem descrição'}</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {t.category}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-black tracking-tighter ${t.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
              {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;