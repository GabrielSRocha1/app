
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, Eye, EyeOff, Plus, Landmark, ShieldCheck, 
  DollarSign, Receipt, Trash2, Edit2, Archive, X, Check, Search, 
  ArrowLeft, CreditCard as CardIcon, Loader2, Info
} from 'lucide-react';
import { AppState, Category, SpendingLimit, CustomPaymentMethod, CreditCard, TransactionType } from '../types';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../constants';

interface ProfileProps {
  appState: AppState;
  updateState: (newState: Partial<AppState>) => void;
}

type SubPage = 'MAIN' | 'ADD_LIMIT' | 'ADD_METHOD' | 'ADD_CARD' | 'MANAGE_METHODS' | 'MANAGE_CARDS';

const Profile: React.FC<ProfileProps> = ({ appState, updateState }) => {
  const [activeSubPage, setActiveSubPage] = useState<SubPage>('MAIN');
  const [showBalance, setShowBalance] = useState(true);
  const [isDeleting, setIsDeleting] = useState<{ type: 'limit' | 'method' | 'card', id: string } | null>(null);

  // Form States
  const [amountInput, setAmountInput] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [customName, setCustomName] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');

  const currentMonthDate = new Date(appState.currentMonth);
  const monthName = currentMonthDate.toLocaleDateString('pt-BR', { month: 'long' });

  const stats = useMemo(() => {
    const filtered = appState.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthDate.getMonth() && d.getFullYear() === currentMonthDate.getFullYear();
    });
    const income = filtered.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [appState.transactions, currentMonthDate]);

  const handleKeyPress = (val: string) => {
    if (val === 'DEL') {
      setAmountInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else {
      setAmountInput(prev => prev === '0' ? val : prev + val);
    }
  };

  const formattedValue = (parseInt(amountInput) / 100).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  const saveLimit = () => {
    if (!selectedCategory) return;
    const newLimit: SpendingLimit = {
      id: Math.random().toString(36).substring(7),
      category: selectedCategory as Category,
      limit: parseInt(amountInput) / 100,
      spent: 0
    };
    updateState({ limits: [...appState.limits, newLimit] });
    setActiveSubPage('MAIN');
    resetForms();
  };

  const saveMethod = () => {
    if (!customName || !selectedCategory) return;
    const newMethod: CustomPaymentMethod = {
      id: Math.random().toString(36).substring(7),
      name: customName,
      icon: selectedCategory,
      isArchived: false
    };
    updateState({ paymentMethods: [...appState.paymentMethods, newMethod] });
    setActiveSubPage('MAIN');
    resetForms();
  };

  const saveCard = () => {
    if (!customName || !selectedCategory) return;
    const newCard: CreditCard = {
      id: Math.random().toString(36).substring(7),
      name: customName,
      icon: selectedCategory,
      dueDay: parseInt(dueDay),
      isArchived: false
    };
    updateState({ creditCards: [...appState.creditCards, newCard] });
    setActiveSubPage('MAIN');
    resetForms();
  };

  const resetForms = () => {
    setAmountInput('0');
    setSelectedCategory('');
    setCustomName('');
    setDueDay('1');
  };

  const getIcon = (cat: string) => {
    if (cat === 'Pix') return <ShieldCheck size={20} className="text-[#32BCAD]" />;
    if (cat === 'Dinheiro') return <DollarSign size={20} className="text-green-500" />;
    if (cat === 'Boleto') return <Receipt size={20} className="text-gray-400" />;
    return CATEGORIES[cat as Category]?.icon || <Landmark size={20} />;
  };

  const confirmDelete = () => {
    if (!isDeleting) return;
    const { type, id } = isDeleting;
    if (type === 'limit') {
      updateState({ limits: appState.limits.filter(l => l.id !== id) });
    } else if (type === 'method') {
      updateState({ paymentMethods: appState.paymentMethods.map(m => m.id === id ? { ...m, isArchived: true } : m) });
    } else if (type === 'card') {
      updateState({ creditCards: appState.creditCards.map(c => c.id === id ? { ...c, isArchived: true } : c) });
    }
    setIsDeleting(null);
  };

  if (activeSubPage === 'MAIN') {
    return (
      <div className="p-4 pb-32 space-y-4 animate-in fade-in duration-500">
        {/* Saldo Card */}
        <div className="bg-[#111] p-6 rounded-[28px] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Saldo em {monthName}</span>
            </div>
            <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 p-2 hover:bg-white/5 rounded-full transition-all">
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <h2 className={`text-3xl font-black transition-all ${showBalance ? 'text-green-500' : 'text-gray-800'}`}>
            {showBalance ? `R$ ${stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ----'}
          </h2>
        </div>

        {/* Limite de gastos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Limite de gastos</h3>
             <button onClick={() => setActiveSubPage('ADD_LIMIT')} className="p-2 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-900/20 active:scale-90 transition-all">
                <Plus size={16} strokeWidth={4} />
             </button>
          </div>
          <div className="space-y-3">
            {appState.limits.map(limit => (
              <div key={limit.id} className="bg-[#111] p-5 rounded-[24px] border border-white/5 group">
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CATEGORIES[limit.category].color}`}>
                          {CATEGORIES[limit.category].icon}
                       </div>
                       <div>
                          <p className="text-xs font-black text-white">{limit.category}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">R$ {limit.limit.toLocaleString('pt-BR')}</p>
                       </div>
                    </div>
                    <button onClick={() => setIsDeleting({ type: 'limit', id: limit.id })} className="p-2 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                       <Trash2 size={16} />
                    </button>
                 </div>
                 <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (limit.spent / limit.limit) * 100)}%` }}></div>
                 </div>
              </div>
            ))}
            <button onClick={() => setActiveSubPage('ADD_LIMIT')} className="w-full py-4 bg-[#111] border border-dashed border-white/5 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all">
               Gerenciar limites
            </button>
          </div>
        </div>

        {/* Meios de pagamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Meios de pagamento</h3>
             <button onClick={() => setActiveSubPage('ADD_METHOD')} className="p-2 bg-blue-600 rounded-full text-white shadow-lg active:scale-90 transition-all">
                <Plus size={16} strokeWidth={4} />
             </button>
          </div>
          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5">
            {appState.paymentMethods.filter(m => !m.isArchived).map(method => (
              <div key={method.id} className="flex items-center justify-between p-5 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                    {getIcon(method.icon)}
                  </div>
                  <span className="text-sm font-bold text-gray-300">{method.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsDeleting({ type: 'method', id: method.id })} className="p-2 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                     <Archive size={16} />
                  </button>
                  <ChevronRight size={16} className="text-gray-800" />
                </div>
              </div>
            ))}
            <button onClick={() => setActiveSubPage('MANAGE_METHODS')} className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all">
               Gerenciar meios de pagamentos
            </button>
          </div>
        </div>

        {/* Cartões de crédito */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Cartões de crédito</h3>
             <button onClick={() => setActiveSubPage('ADD_CARD')} className="p-2 bg-blue-600 rounded-full text-white shadow-lg active:scale-90 transition-all">
                <Plus size={16} strokeWidth={4} />
             </button>
          </div>
          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5">
            {appState.creditCards.filter(c => !c.isArchived).map(card => (
              <div key={card.id} className="flex items-center justify-between p-5 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white">
                     <CardIcon size={14} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-300">{card.name}</span>
                    <p className="text-[9px] font-bold text-gray-600 uppercase">Vence dia {card.dueDay}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsDeleting({ type: 'card', id: card.id })} className="p-2 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                     <Archive size={16} />
                  </button>
                  <ChevronRight size={16} className="text-gray-800" />
                </div>
              </div>
            ))}
            <button onClick={() => setActiveSubPage('MANAGE_CARDS')} className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all">
               Gerenciar cartões
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleting && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
             <div className="w-full max-w-sm bg-[#111] rounded-[32px] p-8 space-y-8 animate-slide-up">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                   <Info size={32} />
                </div>
                <div className="text-center space-y-2">
                   <h3 className="text-lg font-black text-white">Deseja arquivar esta conta?</h3>
                   <p className="text-xs text-gray-500 font-bold">Você pode restaurá-la nas configurações a qualquer momento.</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setIsDeleting(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400">Não</button>
                   <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white">Sim</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Screens for adding items (Add Limit, Add Method, Add Card)
  const isValueFlow = ['ADD_LIMIT'].includes(activeSubPage);

  return (
    <div className="fixed inset-0 z-[150] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => { setActiveSubPage('MAIN'); resetForms(); }} className="p-2 text-gray-400"><ArrowLeft size={24} /></button>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">
          {activeSubPage === 'ADD_LIMIT' ? 'Adicionar Limite' : activeSubPage === 'ADD_METHOD' ? 'Novo Banco' : 'Novo Cartão'}
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeSubPage === 'ADD_LIMIT' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <h2 className="text-5xl font-black text-white tracking-tighter mb-8">R$ {formattedValue}</h2>
               
               <div className="w-full max-w-xs space-y-4">
                  <div className="relative">
                    <button className="w-full p-5 bg-[#111] border border-white/5 rounded-[24px] flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedCategory ? CATEGORIES[selectedCategory as Category].color : 'bg-white/5'}`}>
                             {selectedCategory ? CATEGORIES[selectedCategory as Category].icon : <Search size={16} />}
                          </div>
                          <span className="text-sm font-bold text-gray-400">{selectedCategory || 'Selecione uma categoria'}</span>
                       </div>
                       <ChevronRight size={16} />
                    </button>
                    <select 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      value={selectedCategory} 
                      onChange={e => setSelectedCategory(e.target.value as Category)}
                    >
                       <option value="">Selecione...</option>
                       {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            <div className="bg-[#111] p-8 grid grid-cols-3 gap-x-8 gap-y-4 safe-area-bottom border-t border-white/5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 text-2xl font-black">{n}</button>
              ))}
              <button onClick={() => handleKeyPress('DEL')} className="h-14 flex items-center justify-center text-gray-500"><Trash2 size={24} /></button>
              <button onClick={() => handleKeyPress('0')} className="h-14 text-2xl font-black">0</button>
              <button onClick={saveLimit} disabled={selectedCategory === '' || amountInput === '0'} className="h-14 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/40 disabled:opacity-20">OK</button>
            </div>
          </div>
        )}

        {(activeSubPage === 'ADD_METHOD' || activeSubPage === 'ADD_CARD') && (
          <div className="p-6 space-y-10">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nome da {activeSubPage === 'ADD_METHOD' ? 'conta' : 'cartão'}</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Digite o nome..." 
                  className="w-full bg-transparent border-b border-white/10 py-4 text-2xl font-black outline-none focus:border-blue-500 transition-all"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ícone da conta</label>
                <div className="relative">
                  <button className="w-full p-6 bg-[#111] border border-white/5 rounded-[32px] flex items-center justify-between">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                           {selectedCategory ? getIcon(selectedCategory) : <Search size={20} />}
                        </div>
                        <span className="text-base font-bold text-gray-400">{selectedCategory || 'Selecione um ícone'}</span>
                     </div>
                     <ChevronRight size={20} />
                  </button>
                  <select 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    value={selectedCategory} 
                    onChange={e => setSelectedCategory(e.target.value as Category)}
                  >
                     <option value="">Selecione...</option>
                     {['Pix', 'Dinheiro', 'Boleto', 'Nubank', 'Itaú', 'Inter'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
             </div>

             {activeSubPage === 'ADD_CARD' && (
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dia do vencimento</label>
                   <input 
                     type="number" 
                     placeholder="Ex: 12" 
                     className="w-full bg-transparent border-b border-white/10 py-4 text-2xl font-black outline-none focus:border-blue-500 transition-all"
                     value={dueDay}
                     onChange={e => setDueDay(e.target.value)}
                   />
                </div>
             )}

             <button 
               onClick={activeSubPage === 'ADD_METHOD' ? saveMethod : saveCard}
               disabled={!customName || !selectedCategory}
               className="w-full bg-blue-600 py-6 rounded-[32px] text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-900/50 disabled:opacity-20"
             >
               Salvar
             </button>
          </div>
        )}

        {(activeSubPage === 'MANAGE_METHODS' || activeSubPage === 'MANAGE_CARDS') && (
           <div className="p-6 space-y-8">
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contas arquivadas</h3>
                 <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5">
                    {activeSubPage === 'MANAGE_METHODS' ? (
                      appState.paymentMethods.filter(m => m.isArchived).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-5">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center grayscale">{getIcon(m.icon)}</div>
                              <span className="text-sm font-bold text-gray-600">{m.name}</span>
                           </div>
                           <button onClick={() => updateState({ paymentMethods: appState.paymentMethods.map(item => item.id === m.id ? { ...item, isArchived: false } : item) })} className="text-[10px] font-black text-blue-500 uppercase">Desarquivar</button>
                        </div>
                      ))
                    ) : (
                      appState.creditCards.filter(c => c.isArchived).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-5">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center grayscale"><CardIcon size={20} /></div>
                              <span className="text-sm font-bold text-gray-600">{c.name}</span>
                           </div>
                           <button onClick={() => updateState({ creditCards: appState.creditCards.map(item => item.id === c.id ? { ...item, isArchived: false } : item) })} className="text-[10px] font-black text-blue-500 uppercase">Desarquivar</button>
                        </div>
                      ))
                    )}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
