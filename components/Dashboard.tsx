import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Transaction, TransactionType, SpendingLimit } from '../types.ts';
import MonthDetails from './MonthDetails.tsx';

interface DashboardProps {
  transactions: Transaction[];
  limits: SpendingLimit[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, limits, currentMonth, onMonthChange }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [trendMode, setTrendMode] = useState<'weekly' | 'monthly'>('weekly');
  const [showDetails, setShowDetails] = useState(false);


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

    if (trendMode === 'monthly') {
      // Visão de 6 meses (Histórico)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
        const filtered = transactions.filter(t => {
          const td = new Date(t.date);
          return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        });

        const income = filtered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const expense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);

        data.push({
          label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
          income,
          expense,
          active: i === 0,
          hasData: filtered.length > 0
        });
      }
    } else {
      // Visão Semanal do mês atual
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const todayDate = new Date();
      const isCurrentMonth = todayDate.getMonth() === month && todayDate.getFullYear() === year;
      const currentWeekIdx = Math.floor((todayDate.getDate() - 1) / 7);

      for (let i = 0; i < 4; i++) {
        const startDay = i * 7 + 1;
        const endDay = i === 3 ? 31 : (i + 1) * 7;

        const filtered = transactions.filter(t => {
          const td = new Date(t.date);
          const d = td.getDate();
          return td.getMonth() === month && td.getFullYear() === year && d >= startDay && d <= endDay;
        });

        const income = filtered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const expense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);

        data.push({
          label: `SEM ${i + 1}`,
          income,
          expense,
          active: isCurrentMonth && i === currentWeekIdx,
          hasData: filtered.length > 0
        });
      }

    }
    return data;
  }, [transactions, currentMonth, trendMode]);


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
    <div className="space-y-6 pb-6 animate-in fade-in duration-700 relative">
      {showDetails && (
        <MonthDetails
          transactions={transactions}
          currentMonth={currentMonth}
          onMonthChange={onMonthChange}
          onClose={() => setShowDetails(false)}
        />
      )}
      <div className="bg-[#111] mx-4 p-6 rounded-[28px] border border-white/5 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="uppercase tracking-widest opacity-60 text-h5">Saldo em {monthLabel}</span>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-gray-500 hover:text-white transition-all p-2 bg-white/5 hover:bg-white/10 rounded-full z-10 active:scale-90"
            title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
          >
            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
        <div className="space-y-4">
          <h2 className={`  tracking-tighter transition-all duration-500 ${showBalance ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-900 select-none blur-sm'} text-h1`}>
            {showBalance ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••'}
          </h2>
          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-h5">Quanto entrou:</span>
              <span className={`  transition-colors ${showBalance ? 'text-green-500' : 'text-gray-800'} text-h5`}>
                R$ {showBalance ? stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '••••'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-h5">Quanto saiu:</span>
              <span className={`  transition-colors ${showBalance ? 'text-red-500' : 'text-gray-800'} text-h5`}>
                R$ {showBalance ? stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '••••'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(true)}
          className="w-full mt-6 pt-4 uppercase tracking-widest text-gray-500 border-t border-white/5 flex items-center justify-between hover:text-white transition-colors text-h5 active:scale-[0.98]"
        >
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
              <button key={i} onClick={() => onMonthChange(m.date)} className={`flex-shrink-0 px-4 py-3 rounded-xl   uppercase transition-all whitespace-nowrap ${isActive ? 'bg-[#1a1a1a] border border-white/10 text-white shadow-lg' : 'text-gray-700 hover:text-gray-500'} text-h5`}>
                {m.label}
              </button>
            );
          })}
        </div>
        <button onClick={handleNextMonth} disabled={currentMonth >= maxDate} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#111] border border-white/10 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-10">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="bg-[#111] mx-4 p-6 rounded-[28px] border border-white/5 shadow-2xl transition-all duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h3 className="text-white text-h4">Fluxo de Caixa</h3>
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-1">
              {trendMode === 'weekly' ? `Tendência de ${monthLabel}` : 'Histórico 6 Meses'}
            </span>
          </div>
          <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/5 self-start sm:self-auto">

            <button
              onClick={() => setTrendMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${trendMode === 'weekly' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setTrendMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${trendMode === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600'}`}
            >
              Histórico
            </button>
          </div>
        </div>
        <div className="flex items-end justify-between min-h-[160px] h-auto gap-3 mb-6 px-1 lg:gap-6">

          {chartData.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
              <div className="w-full flex flex-col justify-end gap-1 h-full">
                <div
                  className={`w-full rounded-t-lg transition-all duration-1000 ease-out 
                    ${bar.active ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : (bar.hasData ? 'bg-green-500/50' : 'bg-green-500/10')}`}
                  style={{ height: bar.hasData ? `${(bar.income / maxVal) * 100}%` : '4%' }}
                ></div>
                <div
                  className={`w-full rounded-b-lg transition-all duration-1000 ease-out 
                    ${bar.active ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : (bar.hasData ? 'bg-red-500/50' : 'bg-red-500/10')}`}
                  style={{ height: bar.hasData ? `${(bar.expense / maxVal) * 60}%` : '4%' }}
                ></div>
              </div>
              <span className={`uppercase tracking-tighter transition-colors text-[9px] ${bar.active ? 'text-white font-bold' : 'text-gray-700'}`}>
                {bar.label}
              </span>
            </div>
          ))}

        </div>
        <div className="flex items-center gap-6 pt-5 border-t border-white/5">
          <div className="flex items-center gap-2 uppercase tracking-wider text-gray-500 text-h5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div> Receitas
          </div>
          <div className="flex items-center gap-2 uppercase tracking-wider text-gray-500 text-h5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div> Despesas
          </div>
        </div>
      </div>

      {/* Seção de Limites no Dashboard */}
      {limits.length > 0 && (
        <div className="mx-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="uppercase tracking-widest text-gray-500 text-h5">Limites este mês</h3>
          </div>
          <div className="space-y-3">
            {limits.map(limit => {
              const spent = transactions
                .filter(t => {
                  const d = new Date(t.date);
                  return t.category === limit.category &&
                    t.type === TransactionType.EXPENSE &&
                    t.isPaid &&
                    d.getMonth() === currentMonth.getMonth() &&
                    d.getFullYear() === currentMonth.getFullYear();
                })
                .reduce((acc, t) => acc + t.amount, 0);

              const percentage = Math.min(100, (spent / limit.limit) * 100);

              return (
                <div key={limit.id} className="bg-[#111] p-5 rounded-[24px] border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white text-h5">{limit.category}</span>
                      <span className="text-gray-500 text-h5">/ R$ {limit.limit.toLocaleString('pt-BR')}</span>
                    </div>
                    <span className={`text-h5 ${percentage >= 100 ? 'text-red-500' : percentage >= 80 ? 'text-yellow-500' : 'text-blue-500'}`}>
                      R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;