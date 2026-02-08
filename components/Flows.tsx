
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronLeft, ShoppingCart, Landmark, Zap, 
  PieChart
} from 'lucide-react';
import { CATEGORIES } from '../constants';
import { Transaction, TransactionType, Category } from '../types';

interface FlowsProps {
  transactions: Transaction[];
}

const Flows: React.FC<FlowsProps> = ({ transactions }) => {
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(today.getFullYear() - 3, today.getMonth(), 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear() + 3, today.getMonth(), 1), [today]);

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prev >= minDate) setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= maxDate) setCurrentMonth(next);
  };

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

  // Estatísticas dos últimos 6 meses para o gráfico de barras
  const lastSixMonthsStats = useMemo(() => {
    const stats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
      const monthTransactions = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });

      const income = monthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);

      stats.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income,
        expense,
        active: i === 0,
        hasData: monthTransactions.length > 0
      });
    }
    return stats;
  }, [currentMonth, transactions]);

  const maxVal = Math.max(...lastSixMonthsStats.map(s => Math.max(s.income, s.expense)), 1);

  // Mapeamento de cores para o gráfico (extraído das classes do Tailwind ou fallback)
  const getCategoryColor = (category: Category) => {
    const colorClass = CATEGORIES[category]?.color || '';
    if (colorClass.includes('blue')) return '#3b82f6';
    if (colorClass.includes('green')) return '#22c55e';
    if (colorClass.includes('red')) return '#ef4444';
    if (colorClass.includes('purple')) return '#a855f7';
    if (colorClass.includes('pink')) return '#ec4899';
    if (colorClass.includes('orange')) return '#f97316';
    if (colorClass.includes('yellow')) return '#eab308';
    if (colorClass.includes('indigo')) return '#6366f1';
    if (colorClass.includes('teal')) return '#14b8a6';
    if (colorClass.includes('cyan')) return '#06b6d4';
    if (colorClass.includes('rose')) return '#f43f5e';
    if (colorClass.includes('amber')) return '#f59e0b';
    return '#6b7280'; // gray
  };

  // Estatísticas do mês atual para o gráfico de pizza
  const currentMonthData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });

    const totalExpense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    
    // Explicitly typed reduction to avoid arithmetic inference errors
    const byCategory = filtered
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const sortedCategories = Object.entries(byCategory)
      .map(([name, amount]) => ({
        name: name as Category,
        amount: amount as number,
        percent: totalExpense > 0 ? ((amount as number) / totalExpense) * 100 : 0,
        color: getCategoryColor(name as Category)
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalExpense, sortedCategories, hasData: filtered.length > 0 };
  }, [currentMonth, transactions]);

  const radius = 110;
  const circumference = 2 * Math.PI * radius; // Aprox 691

  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="flex-1 bg-[#0a0a0a] min-h-screen text-white no-scrollbar overflow-y-auto pb-32">
      
      {/* Seletor de Mês Dinâmico */}
      <div className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl z-20 px-4 py-6 border-b border-white/5">
        <div className="flex items-center justify-center gap-4">
           <button onClick={handlePrevMonth} disabled={currentMonth <= minDate} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#111] border border-white/10 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-10">
             <ChevronLeft size={20} />
           </button>
           <div className="flex-1 flex overflow-hidden gap-3 justify-center items-center">
              {visibleMonths.map((m, i) => {
                const isActive = m.date.getMonth() === currentMonth.getMonth() && m.date.getFullYear() === currentMonth.getFullYear();
                return (
                  <button key={i} onClick={() => setCurrentMonth(m.date)} className={`flex-shrink-0 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${isActive ? 'bg-[#1a1a1a] border border-white/10 text-white shadow-lg' : 'text-gray-700'}`}>
                    {m.label}
                  </button>
                );
              })}
           </div>
           <button onClick={handleNextMonth} disabled={currentMonth >= maxDate} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#111] border border-white/10 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-10">
             <ChevronRight size={20} />
           </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Gráfico de Barras Dinâmico */}
        <div className="bg-[#111] rounded-[32px] border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-gray-200">Fluxo Semestral</h3>
            <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase">
              Tendência
            </div>
          </div>
          
          <div className="flex items-end justify-between h-44 gap-3 mb-6 px-1">
            {lastSixMonthsStats.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                <div className="w-full flex flex-col justify-end gap-1 h-full">
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-1000 ${bar.active ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-green-500/10'}`} 
                    style={{ height: bar.hasData ? `${(bar.income / maxVal) * 100}%` : '2%' }}
                  ></div>
                  <div 
                    className={`w-full rounded-b-lg transition-all duration-1000 ${bar.active ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-red-500/10'}`} 
                    style={{ height: bar.hasData ? `${(bar.expense / maxVal) * 40}%` : '2%' }}
                  ></div>
                </div>
                <span className={`text-[10px] font-black uppercase ${bar.active ? 'text-white' : 'text-gray-700'}`}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-6 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Receitas
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Despesas
            </div>
          </div>
        </div>

        {/* Gráfico de Pizza Segmentado por Cores */}
        <div className="bg-[#111] rounded-[32px] border border-white/5 p-6 shadow-2xl space-y-8 overflow-hidden min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-200">Divisão de Gastos ({monthName})</h3>
            <div className="p-2 bg-white/5 rounded-lg text-gray-500">
              <PieChart size={18} />
            </div>
          </div>

          {currentMonthData.hasData ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 sm:w-80 sm:h-80 transform -rotate-90" viewBox="0 0 256 256">
                  {/* Background Circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    stroke="#1a1a1a"
                    strokeWidth="28"
                    fill="transparent"
                  />
                  
                  {/* Category Segments - Added explicit type for accumulator to fix arithmetic operation errors */}
                  {currentMonthData.sortedCategories.reduce((acc: { circles: React.ReactNode[], cumulativePercent: number }, cat) => {
                    const segmentOffset = circumference - (circumference * cat.percent) / 100;
                    
                    const circle = (
                      <circle
                        key={cat.name}
                        cx="128"
                        cy="128"
                        r={radius}
                        stroke={cat.color}
                        strokeWidth="28"
                        fill="transparent"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={segmentOffset}
                        strokeLinecap={cat.percent > 2 ? "round" : "butt"}
                        style={{
                          transform: `rotate(${(acc.cumulativePercent * 360) / 100}deg)`,
                          transformOrigin: 'center',
                          transition: 'all 1s ease-out'
                        }}
                        className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      />
                    );
                    
                    acc.circles.push(circle);
                    acc.cumulativePercent += cat.percent;
                    return acc;
                  }, { circles: [] as React.ReactNode[], cumulativePercent: 0 }).circles}
                </svg>
                
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 opacity-60">Total Saídas</span>
                  <h3 className="text-3xl font-black text-white tracking-tighter">
                    R$ {currentMonthData.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>

              <div className="w-full space-y-3">
                {currentMonthData.sortedCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-4 bg-[#0a0a0a]/50 rounded-[24px] border border-white/5 group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        {CATEGORIES[cat.name as Category]?.icon || <ShoppingCart size={22} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-200">{cat.name}</h4>
                        <p className="text-[10px] font-bold text-gray-600 uppercase">Fatia do orçamento</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">R$ {cat.amount.toLocaleString('pt-BR')}</p>
                      <p className="text-[9px] font-bold uppercase" style={{ color: cat.color }}>{cat.percent.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a]/50 rounded-[28px] border border-dashed border-white/5 py-20">
               <Zap className="text-gray-800 mb-4" size={32} />
               <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Sem lançamentos para este mês</p>
            </div>
          )}
        </div>

        {/* AI Insight Card */}
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-[32px] p-6 flex items-start gap-5">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 flex-shrink-0 shadow-lg shadow-blue-900/10">
            <Zap size={24} strokeWidth={3} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Insight do Zen AI</h4>
            <p className="text-sm font-medium text-gray-400 leading-relaxed">
              {currentMonthData.hasData 
                ? `Notei que seus gastos em ${currentMonthData.sortedCategories[0]?.name || 'Categorias'} representam a maior parte do seu orçamento. Tente reduzir 5% no próximo mês.`
                : "Ainda não temos dados suficientes para este mês. Comece a anotar seus gastos para receber insights personalizados!"
              }
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flows;
