
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, Eye, EyeOff, Plus, Landmark, ShieldCheck, 
  DollarSign, Receipt, Trash2, Archive, Info, CreditCard as CardIcon,
  Search, ArrowLeft, X
} from 'lucide-react';
import { AppState, Category, SpendingLimit, TransactionType } from '../types';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../constants';

interface WalletProps {
  appState: AppState;
  updateState: (newState: Partial<AppState>) => void;
}

type SubPage = 'MAIN' | 'ADD_LIMIT' | 'SELECT_CATEGORY';

const Wallet: React.FC<WalletProps> = ({ appState, updateState }) => {
  const [activeSubPage, setActiveSubPage] = useState<SubPage>('MAIN');
  const [showBalance, setShowBalance] = useState(true);
  const [isDeleting, setIsDeleting] = useState<{ type: 'limit' | 'method' | 'card', id: string } | null>(null);

  const [amountInput, setAmountInput] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
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
    return { balance: income - expense };
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
    setAmountInput('0');
    setSelectedCategory('');
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

  const filteredCategories = EXPENSE_CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (activeSubPage === 'MAIN') {
    return (
      <div className="p-4 pb-32 space-y-8 animate-in fade-in duration-500">
        <header className="px-2 pt-4">
           <h1 className="text-2xl font-black text-white tracking-tight">Minha Carteira</h1>
           <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest mt-1">Gestão de limites e contas</p>
        </header>

        {/* Saldo Section */}
        <div className="bg-[#111] p-6 rounded-[32px] border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 opacity-60">Saldo em {monthName}</span>
            <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 hover:text-white transition-colors">
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <h2 className={`text-3xl font-black transition-all ${showBalance ? 'text-white' : 'text-gray-900'}`}>
            {showBalance ? `R$ ${stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••'}
          </h2>
        </div>

        {/* Limites Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Limites por Categoria</h3>
             <button onClick={() => setActiveSubPage('ADD_LIMIT')} className="w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-blue-900/20">
                <Plus size={16} strokeWidth={4} />
             </button>
          </div>
          <div className="space-y-3">
            {appState.limits.length > 0 ? (
              appState.limits.map(limit => (
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
                      <button onClick={() => setIsDeleting({ type: 'limit', id: limit.id })} className="p-2 text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                         <Trash2 size={16} />
                      </button>
                   </div>
                   <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (limit.spent / limit.limit) * 100)}%` }}></div>
                   </div>
                </div>
              ))
            ) : (
              <div className="bg-[#111] p-8 rounded-[24px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                 <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Nenhum limite definido</p>
              </div>
            )}
          </div>
        </div>

        {/* Contas e Bancos Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Contas e Bancos</h3>
          </div>
          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden shadow-xl">
            {appState.paymentMethods.filter(m => !m.isArchived).map(method => (
              <div key={method.id} className="flex items-center justify-between p-5 group hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                    {getIcon(method.icon)}
                  </div>
                  <span className="text-sm font-bold text-gray-300">{method.name}</span>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => setIsDeleting({ type: 'method', id: method.id })} className="p-2 text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                       <Archive size={16} />
                   </button>
                   <ChevronRight size={16} className="text-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cartões de Crédito Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Cartões de crédito</h3>
          </div>
          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden shadow-xl">
            {appState.creditCards.filter(c => !c.isArchived).length > 0 ? (
              appState.creditCards.filter(c => !c.isArchived).map(card => (
                <div key={card.id} className="flex items-center justify-between p-5 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white shadow-lg">
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
              ))
            ) : (
              <div className="bg-[#111] p-8 rounded-[24px] border-b border-white/5 flex flex-col items-center justify-center text-center">
                 <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Nenhum cartão cadastrado</p>
              </div>
            )}
            <button className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all bg-white/2">
               Gerenciar cartões
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleting && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
             <div className="w-full max-w-sm bg-[#111] rounded-[32px] p-8 space-y-8 animate-slide-up">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500"><Info size={32} /></div>
                <div className="text-center space-y-2">
                   <h3 className="text-lg font-black text-white">Deseja arquivar?</h3>
                   <p className="text-xs text-gray-500 font-bold">Isso ocultará o item da sua carteira mas não apagará seus históricos passados.</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setIsDeleting(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                   <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 rounded-2xl text-[10px] font-black uppercase text-white">Sim, Arquivar</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // TELA DE ESCOLHA DE CATEGORIA (ESTILO VÍDEO)
  if (activeSubPage === 'SELECT_CATEGORY') {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-400">
        <header className="p-6 flex items-center justify-between border-b border-white/5">
          <button onClick={() => setActiveSubPage('ADD_LIMIT')} className="p-2 text-gray-400"><ArrowLeft size={24} /></button>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Escolha a categoria</h2>
          <div className="w-10" />
        </header>

        <div className="p-6">
          <div className="relative group">
            <input 
              autoFocus
              type="text" 
              placeholder="Pesquisar" 
              className="w-full bg-[#111] border border-white/5 rounded-[20px] py-5 pl-6 pr-14 text-sm font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-10">
          {filteredCategories.map((cat) => (
            <button 
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveSubPage('ADD_LIMIT');
                setSearchTerm('');
              }}
              className="w-full flex items-center gap-5 p-4 hover:bg-white/5 rounded-[20px] transition-all group active:scale-[0.98]"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${CATEGORIES[cat].color}`}>
                {CATEGORIES[cat].icon}
              </div>
              <span className="text-base font-black text-gray-300 group-hover:text-white transition-colors tracking-tight">
                {CATEGORIES[cat].label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // TELA DE VALOR (NOVO LIMITE)
  return (
    <div className="fixed inset-0 z-[150] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300">
       <header className="p-6 flex items-center justify-between">
          <button onClick={() => setActiveSubPage('MAIN')} className="p-2 text-gray-400"><ArrowLeft size={24} /></button>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Novo Limite</h2>
          <div className="w-10" />
       </header>
       <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <h2 className="text-5xl font-black text-white tracking-tighter mb-12">R$ {formattedValue}</h2>
             
             {/* Campo de Categoria Estilizado conforme o vídeo */}
             <div className="w-full max-w-xs">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 opacity-60">Toque abaixo para escolher</p>
                <button 
                  onClick={() => setActiveSubPage('SELECT_CATEGORY')}
                  className="w-full p-5 bg-[#111] border border-white/10 rounded-[28px] flex items-center justify-between group active:scale-95 transition-all shadow-xl"
                >
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${selectedCategory ? CATEGORIES[selectedCategory as Category].color : 'bg-white/5 text-gray-700'}`}>
                         {selectedCategory ? CATEGORIES[selectedCategory as Category].icon : <Search size={18} />}
                      </div>
                      <span className={`text-sm font-black tracking-tight ${selectedCategory ? 'text-white' : 'text-gray-500'}`}>
                        {selectedCategory || 'Escolha a categoria'}
                      </span>
                   </div>
                   <ChevronRight size={18} className="text-gray-800 group-hover:text-blue-500 transition-colors" />
                </button>
             </div>
          </div>

          <div className="bg-[#111] p-8 grid grid-cols-3 gap-x-8 gap-y-4 border-t border-white/5 safe-area-bottom">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 text-2xl font-black hover:text-white transition-colors">{n}</button>
            ))}
            <button onClick={() => handleKeyPress('DEL')} className="h-14 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><Trash2 size={24} /></button>
            <button onClick={() => handleKeyPress('0')} className="h-14 text-2xl font-black hover:text-white transition-colors">0</button>
            <button 
              onClick={saveLimit} 
              disabled={selectedCategory === '' || amountInput === '0'} 
              className="h-14 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl disabled:opacity-20 transition-all shadow-2xl shadow-blue-900/50"
            >
              OK
            </button>
          </div>
       </div>
    </div>
  );
};

export default Wallet;
