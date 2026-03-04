import React, { useMemo, useState } from 'react';
import {
  ChevronRight, Filter, ChevronLeft, CheckCircle2, Circle,
  CalendarClock, Settings, ArrowLeft, ToggleLeft, ToggleRight,
  ShieldCheck, AlertCircle, DollarSign, Trash2, Plus, Search, X, Tag
} from 'lucide-react';
import { Transaction, TransactionType, Category, RecurringTemplate } from '../types.ts';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../constants.tsx';

interface MonthlyReportProps {
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onTogglePaid: (id: string) => void;
  onConfirmTemplate: (category: Category) => void;
  onUpdateTemplates: (templates: RecurringTemplate[]) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({
  transactions, recurringTemplates, currentMonth,
  onMonthChange, onTogglePaid, onConfirmTemplate, onUpdateTemplates, onNotify
}) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

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

    const others = filtered.filter(t => !activeTemplates.some(temp => temp.category === t.category));
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

  if (isManageOpen) {
    const availableCategories = EXPENSE_CATEGORIES.filter(cat =>
      !recurringTemplates.some(t => t.category === cat) &&
      cat.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isAddingNew) {
      return (
        <div className="absolute inset-0 z-[70] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-400">
          <header className="p-6 flex items-center justify-between border-b border-white/5">
            <button onClick={() => { setIsAddingNew(false); setSearchTerm(''); setIsCreatingNewCategory(false); setCustomCategoryName(''); }} className="p-2 text-gray-400">
              <ArrowLeft size={24} />
            </button>
            <h2 className="uppercase tracking-widest text-white text-h4">Novo Compromisso</h2>
            <div className="w-10" />
          </header>
          <div className="p-6">
            <div className="relative group">
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar categoria"
                className="w-full bg-[#111] border border-white/5 rounded-[20px] py-5 pl-6 pr-14 outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 text-h4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-10">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onUpdateTemplates([...recurringTemplates, { category: cat, isActive: true, defaultAmount: 0 }]);
                  setIsAddingNew(false);
                  setSearchTerm('');
                }}
                className="w-full flex items-center gap-5 p-4 hover:bg-white/5 rounded-[20px] transition-all group active:scale-[0.98]"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${CATEGORIES[cat]?.color || 'bg-blue-500/10 text-blue-500'}`}>
                  {CATEGORIES[cat]?.icon || <Tag size={20} />}
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors tracking-tight text-h3">
                  {CATEGORIES[cat]?.label || cat}
                </span>
              </button>
            ))}
          </div>
          <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
            {isCreatingNewCategory ? (
              <div className="flex gap-2 animate-in slide-in-from-bottom duration-300">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nome da categoria"
                  className="flex-1 bg-[#111] border border-white/5 rounded-[5px] py-4 px-5 outline-none text-h4 text-white"
                  value={customCategoryName}
                  onChange={e => setCustomCategoryName(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && customCategoryName.trim()) {
                      onUpdateTemplates([...recurringTemplates, { category: customCategoryName.trim(), isActive: true, defaultAmount: 0 }]);
                      setIsCreatingNewCategory(false);
                      setCustomCategoryName('');
                      setIsAddingNew(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (customCategoryName.trim()) {
                      onUpdateTemplates([...recurringTemplates, { category: customCategoryName.trim(), isActive: true, defaultAmount: 0 }]);
                      setIsCreatingNewCategory(false);
                      setCustomCategoryName('');
                      setIsAddingNew(false);
                    }
                  }}
                  className="px-6 bg-blue-600 text-white rounded-[5px] text-h5 font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingNewCategory(true)}
                className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-[5px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all text-h5 uppercase tracking-widest font-black"
              >
                <Plus size={18} /> Add nova categoria
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-[60] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300">
        <header className="p-6 flex items-center justify-between border-b border-white/5">
          <button onClick={() => setIsManageOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="uppercase tracking-widest text-white text-h4">Gerenciar Compromissos</h2>
          <button onClick={() => setIsAddingNew(true)} className="w-10 h-10 bg-blue-600 rounded-[5px] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all">
            <Plus size={20} strokeWidth={3} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-600/5 p-4 rounded-[5px] border border-blue-500/10 flex items-start gap-4">
            <AlertCircle className="text-blue-500 shrink-0" size={20} />
            <p className="text-gray-400 leading-relaxed uppercase text-h5">Configure quais contas aparecem todo mês e defina o valor médio de cada uma para agilizar seus registros.</p>
          </div>
          <div className="space-y-3">
            {recurringTemplates.map(template => (
              <div key={template.category} className="flex flex-col bg-[#111] rounded-[5px] border border-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${CATEGORIES[template.category]?.color || 'bg-blue-500/10 text-blue-500'}`}>
                      {CATEGORIES[template.category]?.icon || <Tag size={18} />}
                    </div>
                    <span className="text-white text-h4">{CATEGORIES[template.category]?.label || template.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateTemplates(recurringTemplates.filter(t => t.category !== template.category))}
                      className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button onClick={() => onUpdateTemplates(recurringTemplates.map(t => t.category === template.category ? { ...t, isActive: !t.isActive } : t))} className="p-1 transition-colors">
                      {template.isActive ? <ToggleRight size={36} className="text-blue-500" /> : <ToggleLeft size={36} className="text-gray-800" />}
                    </button>
                  </div>
                </div>
                {template.isActive && (
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-h5">R$</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0,00"
                        className="w-full bg-[#0a0a0a] border border-white/5 rounded-[5px] py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500/50 transition-all text-h4"
                        value={template.defaultAmount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateTemplates(recurringTemplates.map(t =>
                            t.category === template.category ? { ...t, defaultAmount: isNaN(val) ? 0 : Math.max(0, val) } : t
                          ));
                        }}
                      />
                    </div>
                    <p className="text-gray-700 uppercase tracking-widest w-24 text-h5">Valor Padrão</p>
                  </div>
                )}
              </div>
            ))}
            {recurringTemplates.length === 0 && (
              <div className="bg-[#111] p-10 rounded-[5px] border border-dashed border-white/5 flex flex-col items-center gap-4 text-center">
                <p className="uppercase tracking-widest text-gray-700 text-h5">Nenhum compromisso fixo configurado.</p>
                <button onClick={() => setIsAddingNew(true)} className="text-blue-500 uppercase tracking-widest text-h5 font-bold">Adicionar o primeiro</button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 pb-12">
          <button onClick={() => setIsManageOpen(false)} className="w-full bg-blue-600 py-5 rounded-[5px] uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all text-h5">
            Salvar Configurações
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-48 animate-in fade-in duration-500">
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div className="space-y-1"><p className="text-gray-500 uppercase tracking-widest flex items-center gap-2 text-h5"><span className="w-2 h-2 bg-blue-600 rounded-[1px]"></span> Resultados de {monthName}</p><h2 className={`  tracking-tighter ${balance >= 0 ? 'text-green-500' : 'text-red-500'} text-h1`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2></div><button onClick={() => setIsManageOpen(true)} className="w-10 h-10 bg-[#111] rounded-[5px] flex items-center justify-center border border-white/5 text-gray-500 hover:text-white transition-all shadow-lg active:scale-95"><Settings size={18} /></button></div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('INCOME')}
              className={`flex-1 p-3 rounded-[5px] border transition-all text-left ${activeTab === 'INCOME' ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-900/20' : 'bg-[#111] border-white/5 opacity-60'}`}
            >
              <p className="text-gray-600 uppercase text-h5">Receitas</p>
              <p className="text-green-500 text-h4">R$ {stats.income.toLocaleString('pt-BR')}</p>
            </button>
            <button
              onClick={() => setActiveTab('EXPENSE')}
              className={`flex-1 p-3 rounded-[5px] border transition-all text-left ${activeTab === 'EXPENSE' ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-900/20' : 'bg-[#111] border-white/5 opacity-60'}`}
            >
              <p className="text-gray-600 uppercase text-h5">Despesas</p>
              <p className="text-red-500 text-h4">R$ {stats.expense.toLocaleString('pt-BR')}</p>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 py-2"><button onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} disabled={currentMonth <= minDate} className="w-10 h-10 bg-[#111] border border-white/5 rounded-[5px] text-gray-500 active:scale-95 disabled:opacity-5 flex items-center justify-center transition-all"><ChevronLeft size={18} /></button><div className="flex-1 flex overflow-hidden gap-2 justify-center items-center">{visibleMonths.map((m, i) => { const isActive = m.date.getMonth() === currentMonth.getMonth() && m.date.getFullYear() === currentMonth.getFullYear(); return <button key={i} onClick={() => onMonthChange(m.date)} className={`flex-shrink-0 px-4 py-2 rounded-[5px]   uppercase transition-all ${isActive ? 'bg-white/10 text-white' : 'text-gray-700'} text-h5`}>{m.label}</button>; })}</div><button onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} disabled={currentMonth >= maxDate} className="w-10 h-10 bg-[#111] border border-white/5 rounded-[5px] text-gray-500 active:scale-95 disabled:opacity-5 flex items-center justify-center transition-all"><ChevronRight size={18} /></button></div>
        {activeTab === 'EXPENSE' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="uppercase tracking-widest text-gray-500 flex items-center gap-2 text-h5">
                <CalendarClock size={14} className="text-blue-500" /> Compromissos Fixos
              </h3>
              <span className="text-gray-700 uppercase text-h5">Checklist Mensal</span>
            </div>
            <div className="space-y-3">
              {stats.monthlyCommitments.map(item => {
                const isPaid = item.transaction?.isPaid || item.transaction?.is_paid;
                const hasTransaction = !!item.transaction;
                const displayAmount = hasTransaction ? item.transaction!.amount : item.defaultAmount;

                return (
                  <div
                    key={item.category}
                    className={`w-full bg-[#111] p-5 rounded-[5px] border-l-[3px] transition-all flex items-center justify-between shadow-lg ${isPaid ? 'border-green-500 bg-green-500/5' : 'border-red-600 bg-red-600/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`transition-colors p-2 rounded-[5px] ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>
                        {isPaid ? <CheckCircle2 size={20} strokeWidth={3} /> : <Circle size={20} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="text-white tracking-tight text-h4">{CATEGORIES[item.category]?.label || item.category}</p>
                        {isPaid ? (
                          <div className="flex items-center gap-1.5 mt-0.5 animate-in fade-in duration-300">
                            <span className="text-green-500 uppercase tracking-wider text-[10px] font-bold">PAGO</span>
                            <span className="text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-[3px] tracking-widest text-[9px] uppercase font-black">
                              {new Date(item.transaction!.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <p className="uppercase mt-0.5 tracking-wider text-red-500 text-[10px] font-bold">
                            {hasTransaction ? 'AGUARDANDO PAGAMENTO' : 'PENDENTE'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black tracking-tighter ${isPaid ? 'text-green-500' : 'text-red-500'} text-h4`}>
                        {displayAmount > 0 ? `R$ ${displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'VALOR?'}
                      </p>
                      <span className="text-gray-700 uppercase text-[9px] font-bold tracking-widest">
                        {isPaid ? 'CONCLUÍDO' : 'CHECKLIST MENSAL'}
                      </span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="uppercase tracking-widest text-gray-500 flex items-center gap-2 text-h5">
                <DollarSign size={14} className="text-green-500" /> Receitas do Mês
              </h3>
              <span className="text-gray-700 uppercase text-h5">Valores Recebidos</span>
            </div>
            <div className="space-y-3">
              {transactions
                .filter(t => {
                  const d = new Date(t.date);
                  return t.type === TransactionType.INCOME && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                })
                .map(t => (
                  <div key={t.id} className="bg-[#111] p-5 rounded-[5px] border-l-[3px] border-green-500 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${CATEGORIES[t.category]?.color || 'bg-green-500/10 text-green-500'}`}>
                        {CATEGORIES[t.category]?.icon || <DollarSign size={20} />}
                      </div>
                      <div>
                        <p className="text-white tracking-tight text-h4">{t.description || t.category}</p>
                        <p className="text-gray-600 uppercase text-h5">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 tracking-tighter text-h4">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <span className="text-gray-800 uppercase text-h5">{t.category}</span>
                    </div>
                  </div>
                ))}
              {transactions.filter(t => {
                const d = new Date(t.date);
                return t.type === TransactionType.INCOME && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
              }).length === 0 && (
                  <div className="bg-[#111] p-10 rounded-[5px] border border-dashed border-white/5 text-center">
                    <p className="uppercase tracking-widest text-gray-700 text-h5">Nenhuma receita registrada neste mês.</p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;