import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Transaction, TransactionType } from '../types.ts';

interface DashboardProps {
  transactions: Transaction[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, currentMonth, onMonthChange }) => {
  const [showBalance, setShowBalance] = useState(true);

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(today.getFullYear() - 3, today.getMonth(), 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear() + 3, today.getMonth(), 1), [today]);

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
    const income = filtered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense };
  }, [transactions, currentMonth]);

  const balance = stats.income - stats.expense;

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
      const filtered = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      
      const income = filtered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
      const expense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
      
      data.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income,
        expense,
        active: i === 0,
        hasData: filtered.length > 0
      });
    }
    return data;
  }, [transactions, currentMonth]);

  const maxVal = useMemo(() => {
    const vals = chartData.map(d => Math.max(d.income, d.expense));
    return Math.max(...vals, 100);
  }, [chartData]);

  const visibleMonths = useMemo(() => {
    const months = [];
    for (let i = -1; i <= 1; i++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      if (d >= minDate && d <= maxDate) {
        months.push({
          label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', ''),
          date: d
        });
      }
    }
    return months;
  }, [currentMonth, minDate, maxDate]);

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prev >= minDate) onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= maxDate) onMonthChange(next);
  };

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-700">
      <div className="bg-[#111] mx-4 p-6 rounded-[28px] border border-white/5 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Saldo em {monthLabel}</span>
          </div>
          <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 hover:text-white transition-colors p-1">
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="space-y-4">
          <h2 className={`text-3xl font-black tracking-tighter transition-all duration-500 ${showBalance ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-900 select-none blur-sm'}`}>
            {showBalance ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••'}
          </h2>
          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
               <span className="text-[11px] font-bold text-gray-500">Quanto entrou:</span>
               <span className={`text-[11px] font-black transition-colors ${showBalance ? 'text-green-500' : 'text-gray-800'}`}>
                 R$ {showBalance ? stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '••••'}
               </span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[11px] font-bold text-gray-500">Quanto saiu:</span>
               <span className={`text-[11px] font-black transition-colors ${showBalance ? 'text-red-500' : 'text-gray-800'}`}>
                 R$ {showBalance ? stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '••••'}
               </span>
            </div>
          </div>
        </div>
        <button className="w-full mt-6 pt-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-t border-white/5 flex items-center justify-between hover:text-white transition-colors">
          Detalhes do mês <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-2">
         <button onClick={handlePrevMonth} disabled={currentMonth <= minDate} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#111] border border-white/10 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-10">
           <ChevronLeft size={20} />
         </button>
         <div className="flex-1 flex overflow-hidden gap-4 justify-center items-center">
            {visibleMonths.map((m, i) => {
              const isActive = m.date.getMonth() === currentMonth.getMonth() && m.date.getFullYear() === currentMonth.getFullYear();
              return (
                <button key={i} onClick={() => onMonthChange(m.date)} className={`flex-shrink-0 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${isActive ? 'bg-[#1a1a1a] border border-white/10 text-white shadow-lg' : 'text-gray-700 hover:text-gray-500'}`}>
                  {m.label}
                </button>
              );
            })}
         </div>
         <button onClick={handleNextMonth} disabled={currentMonth >= maxDate} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#111] border border-white/10 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-10">
           <ChevronRight size={20} />
         </button>
      </div>

      <div className="bg-[#111] mx-4 p-6 rounded-[28px] border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black text-white">Receitas & Despesas</h3>
          <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-tighter">Tendência Semestral</div>
        </div>
        <div className="flex items-end justify-between h-40 gap-3 mb-6 px-1">
          {chartData.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
              <div className="w-full flex flex-col justify-end gap-1 h-full">
                <div className={`w-full rounded-t-lg transition-all duration-1000 ease-out ${bar.active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-green-500/10'}`} style={{ height: bar.hasData ? `${(bar.income / maxVal) * 100}%` : '4%' }}></div>
                <div className={`w-full rounded-b-lg transition-all duration-1000 ease-out ${bar.active ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-red-500/10'}`} style={{ height: bar.hasData ? `${(bar.expense / maxVal) * 60}%` : '4%' }}></div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${bar.active ? 'text-white' : 'text-gray-700'}`}>{bar.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 pt-5 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div> Receitas
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div> Despesas
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;