import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight, Eye, EyeOff, Plus, Landmark, ShieldCheck,
  DollarSign, Receipt, Trash2, Archive, Info, CreditCard as CardIcon,
  Search, ArrowLeft, X, Edit2, Check, ChevronDown, RefreshCcw, Coins
} from 'lucide-react';
import { AppState, Category, SpendingLimit, TransactionType } from '../types.ts';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../constants.tsx';

interface WalletProps {
  appState: AppState;
  updateState: (newState: Partial<AppState>) => void;
  syncLimits: (limits: SpendingLimit[]) => Promise<void>;
  syncPaymentMethods: (methods: any[]) => Promise<void>;
  syncCreditCards: (cards: any[]) => Promise<void>;
  onNotify?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

type SubPage = 'MAIN' | 'ADD_LIMIT' | 'SELECT_CATEGORY';

const Wallet: React.FC<WalletProps> = ({ appState, updateState, syncLimits, syncPaymentMethods, syncCreditCards, onNotify }) => {
  const [activeSubPage, setActiveSubPage] = useState<SubPage>('MAIN');
  const [showBalance, setShowBalance] = useState(true);
  const [isDeleting, setIsDeleting] = useState<{ type: 'limit' | 'method' | 'card', id: string } | null>(null);

  const [amountInput, setAmountInput] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Gestão de Categorias
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.expense && Array.isArray(parsed.expense)) return parsed.expense;
      } catch (e) { console.error(e); }
    }
    return EXPENSE_CATEGORIES;
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string, newName: string } | null>(null);

  // Estados para Gestão de Métodos
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [editingMethod, setEditingMethod] = useState<{ id: string, name: string } | null>(null);

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardDueDay, setNewCardDueDay] = useState('');
  const [editingCard, setEditingCard] = useState<{ id: string, name: string, dueDay: number } | null>(null);

  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('custom_categories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.expense && Array.isArray(parsed.expense)) setCustomCategories(parsed.expense);
        } catch (e) { console.error(e); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    const newLimits = [...appState.limits, newLimit];
    updateState({ limits: newLimits });

    if (appState.user.email) {
      syncLimits(newLimits);
    } else {
      if (onNotify) onNotify('Modo Visitante', 'Seus limites não serão salvos na nuvem.', 'info');
      else alert("Note: Você está em modo visitante. Seus limites não serão salvos na nuvem.");
    }

    setActiveSubPage('MAIN');
    setAmountInput('0');
    setSelectedCategory('');
  };

  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('pix')) return <ShieldCheck size={20} className="text-[#32BCAD]" />;
    if (lower.includes('dinheiro')) return <DollarSign size={20} className="text-green-500" />;
    if (lower.includes('boleto')) return <Receipt size={20} className="text-gray-400" />;
    if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('crédito') || lower.includes('credito'))
      return <CardIcon size={20} className="text-purple-500" />;
    if (lower.includes('cripto') || lower.includes('bitcoin') || lower.includes('eth'))
      return <Coins size={20} className="text-yellow-500" />;

    return CATEGORIES[name as Category]?.icon || <Landmark size={20} />;
  };

  const confirmDelete = () => {
    if (!isDeleting) return;
    const { type, id } = isDeleting;
    if (type === 'limit') {
      const newLimits = appState.limits.filter(l => l.id !== id);
      updateState({ limits: newLimits });
      if (appState.user.email) syncLimits(newLimits);
    } else if (type === 'method') {
      const newMethods = appState.paymentMethods.map(m => m.id === id ? { ...m, isArchived: true } : m);
      updateState({ paymentMethods: newMethods });
      if (appState.user.email) syncPaymentMethods(newMethods);
    } else if (type === 'card') {
      const newCards = appState.creditCards.map(c => c.id === id ? { ...c, isArchived: true } : c);
      updateState({ creditCards: newCards });
      if (appState.user.email) syncCreditCards(newCards);
    }
    setIsDeleting(null);
  };

  const filteredCategories = customCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    if (customCategories.includes(name)) {
      if (onNotify) onNotify('Atenção', 'Esta categoria já existe.', 'warning');
      else alert("Esta categoria já existe.");
      return;
    }

    const saved = localStorage.getItem('custom_categories');
    let fullCategories = { income: [], expense: [] };
    if (saved) {
      try { fullCategories = JSON.parse(saved); } catch (e) { }
    }

    const updatedExpense = [...customCategories, name];
    const updatedFull = {
      ...fullCategories,
      expense: updatedExpense
    };

    setCustomCategories(updatedExpense);
    localStorage.setItem('custom_categories', JSON.stringify(updatedFull));
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (catToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedExpense = customCategories.filter(cat => cat !== catToDelete);
    const saved = localStorage.getItem('custom_categories');
    let fullCategories = { income: [], expense: [] };
    if (saved) {
      try { fullCategories = JSON.parse(saved); } catch (e) { }
    }
    const updatedFull = { ...fullCategories, expense: updatedExpense };
    setCustomCategories(updatedExpense);
    localStorage.setItem('custom_categories', JSON.stringify(updatedFull));
    if (selectedCategory === catToDelete) {
      setSelectedCategory('');
    }
  };

  const handleSaveEditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingCategory || !editingCategory.newName.trim() || editingCategory.newName === editingCategory.oldName) {
      setEditingCategory(null);
      return;
    }
    const updatedExpense = customCategories.map(cat =>
      cat === editingCategory.oldName ? editingCategory.newName.trim() : cat
    );
    const saved = localStorage.getItem('custom_categories');
    let fullCategories = { income: [], expense: [] };
    if (saved) {
      try { fullCategories = JSON.parse(saved); } catch (e) { }
    }
    const updatedFull = { ...fullCategories, expense: updatedExpense };
    setCustomCategories(updatedExpense);
    localStorage.setItem('custom_categories', JSON.stringify(updatedFull));
    if (selectedCategory === editingCategory.oldName) {
      setSelectedCategory(editingCategory.newName.trim() as Category);
    }
    setEditingCategory(null);
  };

  const handleAddMethod = () => {
    if (!newMethodName.trim()) return;
    const newMethod = {
      id: Math.random().toString(36).substring(7),
      name: newMethodName.trim(),
      icon: 'Landmark',
      isArchived: false
    };
    const newMethods = [...appState.paymentMethods, newMethod];
    updateState({ paymentMethods: newMethods });
    if (appState.user.email) syncPaymentMethods(newMethods);
    setNewMethodName('');
    setIsAddingMethod(false);
  };

  const handleSaveEditMethod = () => {
    if (!editingMethod || !editingMethod.name.trim()) return;
    const newMethods = appState.paymentMethods.map(m =>
      m.id === editingMethod.id ? { ...m, name: editingMethod.name.trim() } : m
    );
    updateState({ paymentMethods: newMethods });
    if (appState.user.email) syncPaymentMethods(newMethods);
    setEditingMethod(null);
  };

  const handleAddCard = () => {
    if (!newCardName.trim()) return;
    const newCard = {
      id: Math.random().toString(36).substring(7),
      name: newCardName.trim(),
      icon: 'CreditCard',
      dueDay: parseInt(newCardDueDay) || 1,
      isArchived: false
    };
    const newCards = [...appState.creditCards, newCard];
    updateState({ creditCards: newCards });
    if (appState.user.email) syncCreditCards(newCards);
    setNewCardName('');
    setNewCardDueDay('');
    setIsAddingCard(false);
  };

  const handleSaveEditCard = () => {
    if (!editingCard || !editingCard.name.trim()) return;
    const newCards = appState.creditCards.map(c =>
      c.id === editingCard.id ? { ...c, name: editingCard.name.trim(), dueDay: editingCard.dueDay } : c
    );
    updateState({ creditCards: newCards });
    if (appState.user.email) syncCreditCards(newCards);
    setEditingCard(null);
  };

  const handleRestoreMethod = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMethods = appState.paymentMethods.map(m =>
      m.id === id ? { ...m, isArchived: false } : m
    );
    updateState({ paymentMethods: newMethods });
    if (appState.user.email) syncPaymentMethods(newMethods);
  };

  const handleRestoreCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCards = appState.creditCards.map(c =>
      c.id === id ? { ...c, isArchived: false } : c
    );
    updateState({ creditCards: newCards });
    if (appState.user.email) syncCreditCards(newCards);
  };

  if (activeSubPage === 'MAIN') {
    return (
      <div className="p-4 pb-48 space-y-8 animate-in fade-in duration-500">
        <header className="px-2 pt-4">
          <h1 className="text-white tracking-tight text-h2">Minha Carteira</h1>
          <p className="uppercase text-gray-600 tracking-widest mt-1 text-h5">Gestão de limites e contas</p>
        </header>

        <div className="bg-[#111] p-6 rounded-[32px] border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="uppercase tracking-widest text-gray-500 opacity-60 text-h5">Saldo em {monthName}</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-gray-500 hover:text-white transition-all p-2 bg-white/5 hover:bg-white/10 rounded-full z-10 active:scale-90"
            >
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <h2 className={`transition-all duration-500 ${showBalance ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-900 select-none blur-sm'} text-h1`}>
            {showBalance ? `R$ ${stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••'}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="uppercase tracking-widest text-gray-500 text-h5">Limites por Categoria</h3>
            <button onClick={() => setActiveSubPage('ADD_LIMIT')} className="w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-blue-900/20">
              <Plus size={16} strokeWidth={4} />
            </button>
          </div>
          <div className="space-y-3">
            {appState.limits.length > 0 ? appState.limits.map(limit => (
              <div key={limit.id} className="bg-[#111] p-5 rounded-[24px] border border-white/5 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CATEGORIES[limit.category]?.color || 'bg-white/5'}`}>
                      {CATEGORIES[limit.category]?.icon || '💰'}
                    </div>
                    <div>
                      <p className="text-white text-h5">{limit.category}</p>
                      <p className="text-gray-500 uppercase text-h5">R$ {limit.limit.toLocaleString('pt-BR')}</p>
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
            )) : (
              <div className="bg-[#111] p-8 rounded-[24px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                <p className="uppercase text-gray-700 tracking-widest text-h5">Nenhum limite definido</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="uppercase tracking-widest text-gray-500 text-h5">Contas e Métodos</h3>
            <button
              onClick={() => setIsAddingMethod(!isAddingMethod)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${isAddingMethod ? 'bg-red-500/20 text-red-500 rotate-45' : 'bg-blue-600 text-white shadow-blue-900/20'}`}
            >
              <Plus size={16} strokeWidth={4} />
            </button>
          </div>

          {isAddingMethod && (
            <div className="bg-[#111] p-4 rounded-[24px] border border-blue-500/30 animate-in slide-in-from-top duration-300">
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nome do método (ex: Nubank)"
                  className="flex-1 bg-black/20 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 text-white"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                />
                <button onClick={handleAddMethod} className="bg-blue-600 text-white p-3 rounded-xl active:scale-95 transition-all">
                  <Check size={20} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden shadow-xl">
            {appState.paymentMethods.filter(m => !m.isArchived).map(method => (
              <div key={method.id} className="group hover:bg-white/5 transition-colors">
                {editingMethod?.id === method.id ? (
                  <div className="flex items-center gap-2 p-4">
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none text-white text-h4 p-1"
                      value={editingMethod.name}
                      onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditMethod()}
                    />
                    <button onClick={handleSaveEditMethod} className="p-2 text-green-500"><Check size={20} /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        {getIcon(method.name)}
                      </div>
                      <span className="text-gray-300 text-h4">{method.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setEditingMethod({ id: method.id, name: method.name })}
                        className="p-2 text-gray-600 hover:text-blue-500 hover:bg-white/5 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setIsDeleting({ type: 'method', id: method.id })}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-white/5 rounded-lg"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meus Cartões */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="uppercase tracking-widest text-gray-500 text-h5">Meus Cartões</h3>
            <button
              onClick={() => setIsAddingCard(!isAddingCard)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${isAddingCard ? 'bg-red-500/20 text-red-500 rotate-45' : 'bg-blue-600 text-white shadow-blue-900/20'}`}
            >
              <Plus size={16} strokeWidth={4} />
            </button>
          </div>

          {isAddingCard && (
            <div className="bg-[#111] p-5 rounded-[24px] border border-blue-500/30 animate-in slide-in-from-top duration-300 space-y-4">
              <div className="space-y-1.5">
                <label className="text-gray-500 text-[10px] uppercase tracking-widest ml-1">Nome do Cartão</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Ex: Nubank, Inter..."
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 text-white"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest ml-1">Vencimento (Dia)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    className="w-full bg-black/20 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 text-white uppercase"
                    value={newCardDueDay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!e.target.value) setNewCardDueDay('');
                      else if (val >= 1 && val <= 31) setNewCardDueDay(val.toString());
                    }}
                  />
                </div>
                <button
                  onClick={handleAddCard}
                  className="h-[52px] bg-blue-600 text-white px-6 rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-blue-900/20"
                >
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#111] rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden shadow-xl">
            {appState.creditCards.filter(c => !c.isArchived).map(card => (
              <div key={card.id} className="group hover:bg-white/5 transition-colors">
                {editingCard?.id === card.id ? (
                  <div className="p-5 space-y-4 bg-white/5">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-gray-500 text-[9px] uppercase tracking-widest ml-1">Nome</label>
                        <input
                          autoFocus
                          type="text"
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 outline-none focus:border-blue-500/50 text-white text-h4"
                          value={editingCard.name}
                          onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                        />
                      </div>
                      <div className="w-20 space-y-1.5">
                        <label className="text-gray-500 text-[9px] uppercase tracking-widest ml-1">Vence</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Dia"
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 outline-none focus:border-blue-500/50 text-white text-h4"
                          value={editingCard.dueDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= 31) setEditingCard({ ...editingCard, dueDay: val });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingCard(null)} className="px-4 py-2 text-gray-500 text-h5 uppercase tracking-widest">Cancelar</button>
                      <button onClick={handleSaveEditCard} className="bg-blue-600 text-white px-4 py-2 rounded-lg active:scale-95 transition-all text-h5">Salvar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white shadow-lg">
                        <CardIcon size={14} />
                      </div>
                      <div>
                        <span className="text-gray-300 text-h4">{card.name}</span>
                        <p className="text-gray-600 uppercase text-[10px] tracking-widest mt-0.5 font-medium">Vence dia {card.dueDay}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setEditingCard({ id: card.id, name: card.name, dueDay: card.dueDay })}
                        className="p-2 text-gray-600 hover:text-blue-500 hover:bg-white/5 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setIsDeleting({ type: 'card', id: card.id })}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-white/5 rounded-lg"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {appState.creditCards.filter(c => !c.isArchived).length === 0 && (
              <div className="p-8 text-center"><p className="text-gray-700 uppercase tracking-widest text-[10px]">Nenhum cartão cadastrado</p></div>
            )}
          </div>
        </div>

        {/* Seção de Arquivados */}
        {(appState.paymentMethods.some(m => m.isArchived) || appState.creditCards.some(c => c.isArchived)) && (
          <div className="mt-4 pb-10">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors px-2 text-h5 uppercase tracking-widest"
            >
              <Archive size={14} />
              {showArchived ? 'Ocultar Arquivados' : 'Ver Itens Arquivados'}
              <ChevronDown size={14} className={`transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </button>

            {showArchived && (
              <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top duration-300">
                {/* Métodos Arquivados */}
                {appState.paymentMethods.filter(m => m.isArchived).length > 0 && (
                  <div className="bg-black/40 rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 text-[9px] uppercase tracking-widest text-gray-500 italic">Contas e Métodos</div>
                    {appState.paymentMethods.filter(m => m.isArchived).map(method => (
                      <div key={method.id} className="flex items-center justify-between p-4 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                            {getIcon(method.name)}
                          </div>
                          <span className="text-gray-400 text-h5 line-through">{method.name}</span>
                        </div>
                        <button
                          onClick={(e) => handleRestoreMethod(method.id, e)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                          <RefreshCcw size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cartões Arquivados */}
                {appState.creditCards.filter(c => c.isArchived).length > 0 && (
                  <div className="bg-black/40 rounded-[28px] border border-white/5 divide-y divide-white/5 overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 text-[9px] uppercase tracking-widest text-gray-500 italic">Cartões de Crédito</div>
                    {appState.creditCards.filter(c => c.isArchived).map(card => (
                      <div key={card.id} className="flex items-center justify-between p-4 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-5 bg-white/5 rounded-md flex items-center justify-center">
                            <CardIcon size={12} className="text-gray-600" />
                          </div>
                          <span className="text-gray-400 text-h5 line-through">{card.name}</span>
                        </div>
                        <button
                          onClick={(e) => handleRestoreCard(card.id, e)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                          <RefreshCcw size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isDeleting && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="w-full max-sm bg-[#111] rounded-[32px] p-8 space-y-8 animate-slide-up">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500"><Info size={32} /></div>
              <div className="text-center space-y-2">
                <h3 className="text-white text-h3">Deseja arquivar?</h3>
                <p className="text-gray-500 text-h5">Isso ocultará o item da sua carteira mas não apagará seus históricos passados.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsDeleting(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase text-gray-400 text-h5">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 rounded-2xl uppercase text-white text-h5">Sim, Arquivar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeSubPage === 'SELECT_CATEGORY') {
    return (
      <div className="absolute inset-0 z-[200] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-400">
        <header className="p-6 flex items-center justify-between border-b border-white/5">
          <button onClick={() => { setActiveSubPage('ADD_LIMIT'); setIsAddingCategory(false); setEditingCategory(null); }} className="p-2 text-gray-400">
            <ArrowLeft size={24} />
          </button>
          <h2 className="uppercase tracking-widest text-white text-h4">Escolha a categoria</h2>
          <button
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${isAddingCategory ? 'bg-red-500/20 text-red-500 rotate-45' : 'bg-blue-600 text-white shadow-blue-900/20'}`}
          >
            <Plus size={16} strokeWidth={4} />
          </button>
        </header>

        {isAddingCategory && (
          <div className="p-6 border-b border-white/5 animate-in slide-in-from-top">
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Nome da nova categoria"
                className="flex-1 bg-[#111] border border-white/10 rounded-xl py-4 px-5 outline-none focus:border-blue-500/50 text-h4 text-white"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
              />
              <button onClick={handleAddCustomCategory} className="bg-blue-600 text-white p-4 rounded-xl active:scale-95 transition-all">
                <Check size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="relative group">
            <input
              type="text"
              placeholder="Pesquisar"
              className="w-full bg-[#111] border border-white/5 rounded-[20px] py-5 pl-6 pr-14 outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 text-h4 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-10">
          {filteredCategories.map((cat) => (
            <div key={cat} className="group relative">
              {editingCategory?.oldName === cat ? (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-[20px]">
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-white text-h3 p-2"
                    value={editingCategory.newName}
                    onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditCategory(e as any)}
                  />
                  <button onClick={(e) => handleSaveEditCategory(e as any)} className="p-3 text-green-500"><Check size={20} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedCategory(cat as Category); setActiveSubPage('ADD_LIMIT'); setSearchTerm(''); }}
                    className="flex-1 flex items-center gap-5 p-4 hover:bg-white/5 rounded-[20px] transition-all group active:scale-[0.98]"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${CATEGORIES[cat as Category]?.color || 'bg-white/5'}`}>
                      {CATEGORIES[cat as Category]?.icon || '💰'}
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors tracking-tight text-h3">
                      {CATEGORIES[cat as Category]?.label || cat}
                    </span>
                  </button>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); setEditingCategory({ oldName: cat, newName: cat }); }} className="p-3 text-gray-600 hover:text-blue-500">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={(e) => handleDeleteCategory(cat, e)} className="p-3 text-gray-600 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-center py-10 opacity-30 uppercase tracking-widest text-h5 text-white">Nenhum resultado</div>
          )}
        </div>
      </div>
    );
  }

  // default: ADD_LIMIT page
  return (
    <div className="absolute inset-0 z-[150] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300">
      <header className="p-6 flex items-center justify-between">
        <button onClick={() => setActiveSubPage('MAIN')} className="p-2 text-gray-400"><ArrowLeft size={24} /></button>
        <h2 className="uppercase tracking-widest text-white text-h4">Novo Limite</h2>
        <div className="w-10" />
      </header>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-white tracking-tighter mb-12 text-h1">R$ {formattedValue}</h2>
          <div className="w-full max-w-xs">
            <p className="text-gray-600 uppercase tracking-widest mb-4 opacity-60 text-h5">Toque abaixo para escolher</p>
            <button onClick={() => setActiveSubPage('SELECT_CATEGORY')} className="w-full p-5 bg-[#111] border border-white/10 rounded-[28px] flex items-center justify-between group active:scale-95 transition-all shadow-xl">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${selectedCategory ? CATEGORIES[selectedCategory as Category]?.color : 'bg-white/5 text-gray-700'}`}>
                  {selectedCategory ? CATEGORIES[selectedCategory as Category]?.icon : <Search size={18} />}
                </div>
                <span className={`tracking-tight ${selectedCategory ? 'text-white' : 'text-gray-500'} text-h4`}>{selectedCategory || 'Escolha a categoria'}</span>
              </div>
              <ChevronRight size={18} className="text-gray-800 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        </div>
        <div className="bg-[#111] p-8 grid grid-cols-3 gap-x-8 gap-y-4 border-t border-white/5 safe-area-bottom">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 hover:text-white transition-colors text-h2">{n}</button>)}
          <button onClick={() => handleKeyPress('DEL')} className="h-14 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><Trash2 size={24} /></button>
          <button onClick={() => handleKeyPress('0')} className="h-14 hover:text-white transition-colors text-h2">0</button>
          <button onClick={saveLimit} disabled={selectedCategory === '' || amountInput === '0'} className="h-14 bg-blue-600 text-white uppercase tracking-widest rounded-2xl disabled:opacity-20 transition-all shadow-2xl shadow-blue-900/50 text-h5">OK</button>
        </div>
      </div>
    </div>
  );
};

export default Wallet;