
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Filter, ChevronLeft, CheckCircle2, Circle, 
  CalendarClock, Settings, ArrowLeft, ToggleLeft, ToggleRight,
  ShieldCheck, AlertCircle, DollarSign
} from 'lucide-react';
import { Transaction, TransactionType, Category, RecurringTemplate } from '../types';
import { CATEGORIES } from '../constants';

interface MonthlyReportProps {
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onTogglePaid: (id: string) => void;
  onConfirmTemplate: (category: Category, date: Date) => void;
  onUpdateTemplates: (templates: RecurringTemplate[]) => void;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ 
  transactions, recurringTemplates, currentMonth, 
  onMonthChange, onTogglePaid, onConfirmTemplate, onUpdateTemplates 
}) => {
  const [isManageOpen, setIsManageOpen] = useState(false);

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
    
    const activeTemplates = recurringTemplates.filter(rt => rt.isActive);
    
    const monthlyCommitments = activeTemplates.map(template => {
       const existingTransaction = filtered.find(t => t.category === template.category);
       return {
         category: template.category,
         transaction: existingTransaction,
         isMissing: !existingTransaction,
         defaultAmount: template.defaultAmount
       };
    });

    const others = filtered.filter(t => 
      !activeTemplates.some(temp => temp.category === t.category)
    );

    return { income, expense, monthlyCommitments, others };
  }, [transactions, currentMonth, recurringTemplates]);

  const balance = stats.income - stats.expense;

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

  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long' });

  const toggleTemplate = (category: Category) => {
    const newTemplates = recurringTemplates.map(t => 
      t.category === category ? { ...t, isActive: !t.isActive } : t
    );
    onUpdateTemplates(newTemplates);
  };

  const updateTemplateAmount = (category: Category, amount: number) => {
    const newTemplates = recurringTemplates.map(t => 
      t.category === category ? { ...t, defaultAmount: amount } : t
    );
    onUpdateTemplates(newTemplates);
  };

  if (isManageOpen) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300">
        <header className="p-6 flex items-center justify-between border-b border-white/5">
           <button onClick={() => setIsManageOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={24} />
           </button>
           <h2 className="text-sm font-black uppercase tracking-widest text-white">Gerenciar Compromissos</h2>
           <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <div className="bg-blue-600/5 p-4 rounded-[5px] border border-blue-500/10 flex items-start gap-4">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase">
                Configure quais contas aparecem todo mês e defina o valor médio de cada uma para agilizar seus registros.
              </p>
           </div>

           <div className="space-y-3">
              {recurringTemplates.map(template => (
                <div key={template.category} className="flex flex-col bg-[#111] rounded-[5px] border border-white/5 p-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${CATEGORIES[template.category].color}`}>
                            {CATEGORIES[template.category].icon}
                         </div>
                         <span className="text-sm font-black text-white">{template.category}</span>
                      </div>
                      <button onClick={() => toggleTemplate(template.category)} className="p-1 transition-colors">
                         {template.isActive ? (
                           <ToggleRight size={36} className="text-blue-500" />
                         ) : (
                           <ToggleLeft size={36} className="text-gray-800" />
                         )}
                      </button>
                   </div>
                   
                   {template.isActive && (
                     <div className="flex items-center gap-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex-1 relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600">R$</span>
                           <input 
                              type="number"
                              placeholder="0,00"
                              className="w-full bg-[#0a0a0a] border border-white/5 rounded-[5px] py-3 pl-10 pr-4 text-sm font-black text-white outline-none focus:border-blue-500/50 transition-all"
                              value={template.defaultAmount || ''}
                              onChange={(e) => updateTemplateAmount(template.category, parseFloat(e.target.value) || 0)}
                           />
                        </div>
                        <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest w-24">Valor Padrão</p>
                     </div>
                   )}
                </div>
              ))}
           </div>
        </div>

        <div className="p-6 pb-12">
           <button onClick={() => setIsManageOpen(false)} className="w-full bg-blue-600 py-5 rounded-[5px] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
             Salvar Configurações
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      <div className="p-6 space-y-8">
        
        {/* Resumo Financeiro */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-blue-600 rounded-[1px]"></span> Resultados de {monthName}
              </p>
              <h2 className={`text-4xl font-black tracking-tighter ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <button onClick={() => setIsManageOpen(true)} className="w-10 h-10 bg-[#111] rounded-[5px] flex items-center justify-center border border-white/5 text-gray-500 hover:text-white transition-all shadow-lg active:scale-95">
               <Settings size={18} />
            </button>
          </div>

          <div className="flex gap-2">
             <div className="flex-1 bg-[#111] p-3 rounded-[5px] border border-white/5 shadow-sm">
                <p className="text-[9px] font-black text-gray-600 uppercase">Receitas</p>
                <p className="text-sm font-black text-green-500">R$ {stats.income.toLocaleString('pt-BR')}</p>
             </div>
             <div className="flex-1 bg-[#111] p-3 rounded-[5px] border border-white/5 shadow-sm">
                <p className="text-[9px] font-black text-gray-600 uppercase">Despesas</p>
                <p className="text-sm font-black text-red-500">R$ {stats.expense.toLocaleString('pt-BR')}</p>
             </div>
          </div>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center justify-center gap-3 py-2">
           <button onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} disabled={currentMonth <= minDate} className="w-10 h-10 bg-[#111] border border-white/5 rounded-[5px] text-gray-500 active:scale-95 disabled:opacity-5 flex items-center justify-center transition-all">
             <ChevronLeft size={18} />
           </button>
           <div className="flex-1 flex overflow-hidden gap-2 justify-center items-center">
              {visibleMonths.map((m, i) => {
                const isActive = m.date.getMonth() === currentMonth.getMonth() && m.date.getFullYear() === currentMonth.getFullYear();
                return (
                  <button key={i} onClick={() => onMonthChange(m.date)} className={`flex-shrink-0 px-4 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${isActive ? 'bg-white/10 text-white' : 'text-gray-700'}`}>
                    {m.label}
                  </button>
                );
              })}
           </div>
           <button onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} disabled={currentMonth >= maxDate} className="w-10 h-10 bg-[#111] border border-white/5 rounded-[5px] text-gray-500 active:scale-95 disabled:opacity-5 flex items-center justify-center transition-all">
             <ChevronRight size={18} />
           </button>
        </div>

        {/* SEÇÃO: COMPROMISSOS RECORRENTES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
               <CalendarClock size={14} className="text-blue-500" /> Compromissos Fixos
             </h3>
             <span className="text-[9px] font-bold text-gray-700 uppercase">Checklist Mensal</span>
          </div>
          
          <div className="space-y-3">
             {stats.monthlyCommitments.map(item => {
               const isPaid = item.transaction?.isPaid;
               const isMissing = item.isMissing;
               const displayAmount = isMissing ? item.defaultAmount : item.transaction!.amount;

               return (
                 <button 
                  key={item.category} 
                  onClick={() => {
                    if (isMissing) {
                      onConfirmTemplate(item.category, currentMonth);
                    } else {
                      onTogglePaid(item.transaction!.id);
                    }
                  }}
                  className={`w-full text-left bg-[#111] p-5 rounded-[5px] border-l-[3px] transition-all active:scale-[0.98] flex items-center justify-between group shadow-lg ${isPaid ? 'border-green-500 bg-green-500/5' : 'border-red-600 bg-red-600/5'}`}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`transition-colors p-2 rounded-[5px] ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>
                          {isPaid ? <CheckCircle2 size={20} strokeWidth={3} /> : <Circle size={20} strokeWidth={3} />}
                       </div>
                       <div>
                          <p className="text-sm font-black text-white tracking-tight">{item.category}</p>
                          <p className={`text-[10px] font-black uppercase mt-0.5 tracking-wider ${isPaid ? 'text-green-500' : 'text-red-500'}`}>
                            {isPaid ? 'CONTA PAGA' : 'PENDENTE'}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-sm font-black tracking-tighter ${isPaid ? 'text-green-500' : 'text-red-500'}`}>
                          {displayAmount > 0 ? `R$ ${displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'VALOR?'}
                       </p>
                       <span className="text-[9px] font-bold text-gray-700 uppercase">{isMissing ? 'REGISTRAR' : 'VER DETALHES'}</span>
                    </div>
                 </button>
               );
             })}
          </div>
        </div>

        {/* OUTROS GASTOS */}
        <div className="space-y-4 pt-4 border-t border-white/5">
           <div className="flex items-center justify-between px-1 pt-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Demais Gastos Variaveis</h3>
           </div>
           
           <div className="space-y-3">
              {stats.others.length > 0 ? (
                stats.others.map(t => (
                  <div key={t.id} className="bg-[#0d0d0d] p-4 rounded-[5px] border border-white/5 flex items-center justify-between hover:bg-white/2 transition-colors">
                     <div className="flex flex-col">
                        <span className="text-sm font-black text-white tracking-tight">{t.description || t.category}</span>
                        <span className="text-[10px] font-bold text-gray-700 uppercase">{t.category}</span>
                     </div>
                     <div className="text-right">
                        <p className={`text-sm font-black tracking-tighter ${t.type === TransactionType.INCOME ? 'text-green-500' : 'text-gray-300'}`}>
                           {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] font-bold text-gray-800">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                     </div>
                  </div>
                ))
              ) : (
                <div className="p-8 border border-dashed border-white/5 rounded-[5px] text-center">
                   <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Nenhum gasto variável</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
