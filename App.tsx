import React, { useState, useEffect } from 'react';
import { Home, List, CreditCard, Plus, MessageCircle, CloudSync, Zap, ChevronDown, LogOut } from 'lucide-react';
import { Transaction, AppState, TransactionType, RecurrenceType, Category, RecurringTemplate, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AddModal from './components/AddModal';
import Wallet from './components/Wallet';
import MonthlyReport from './components/MonthlyReport';
import Flows from './components/Flows';
import Login from './components/Login';
import { supabase } from './lib/supabase';

const INITIAL_RECURRING: Category[] = [
  'Aluguel', 'Água', 'Luz', 'Academia', 'Internet', 
  'Plano de Saúde', 'Telefone', 'Prestação do Carro', 'Prestação Moto'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'cards' | 'flows'>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('zenfinanceiro_premium_v2');
    if (saved) return JSON.parse(saved);
    return {
      transactions: [],
      user: { id: '', name: '', email: '', familyId: 'fam1' },
      limits: [], 
      paymentMethods: [
        { id: 'p1', name: 'Pix', icon: 'Pix', isArchived: false },
        { id: 'p2', name: 'Dinheiro', icon: 'Dinheiro', isArchived: false },
        { id: 'p3', name: 'Boleto', icon: 'Boleto', isArchived: false }
      ],
      creditCards: [], 
      recurringTemplates: INITIAL_RECURRING.map(cat => ({
        category: cat,
        isActive: true,
        defaultAmount: 0
      })),
      currentMonth: new Date().toISOString(),
      theme: 'dark',
      isSyncing: false
    };
  });

  useEffect(() => {
    if (isAuthenticated && appState.user.email) {
      loadUserData(appState.user.email);
    }
  }, [isAuthenticated]);

  const loadUserData = async (email: string) => {
    updateState({ isSyncing: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_email', email)
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) {
        // Normaliza campos vindos do banco para o estado do App
        const mappedData = data.map((d: any) => ({
          ...d,
          paymentMethod: d.payment_method || d.paymentMethod,
          isPaid: d.is_paid !== undefined ? d.is_paid : (d.isPaid !== undefined ? d.isPaid : false)
        }));
        setAppState(prev => ({ ...prev, transactions: mappedData, isSyncing: false }));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      updateState({ isSyncing: false });
    }
  };

  const handleLogin = (email: string) => {
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    setAppState(prev => ({
      ...prev,
      user: { ...prev.user, email, name: formattedName, id: email }
    }));
    setIsAuthenticated(true);
    localStorage.setItem('zen_auth', 'true');
    localStorage.setItem('zen_user_email', email);
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('zen_auth');
    const savedEmail = localStorage.getItem('zen_user_email');
    if (authStatus === 'true' && savedEmail) {
      handleLogin(savedEmail);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('zen_auth');
    localStorage.removeItem('zen_user_email');
    setAppState(prev => ({ ...prev, transactions: [] }));
  };

  const updateState = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'userId' | 'familyId'>) => {
    updateState({ isSyncing: true });
    
    // Mapeia para snake_case exigido pela estrutura padrão do Supabase
    const transactionData = {
      description: newT.description,
      amount: newT.amount,
      date: newT.date,
      type: newT.type,
      category: newT.category,
      payment_method: newT.paymentMethod || null,
      paymentMethod: newT.paymentMethod || null,
      recurrence: newT.recurrence,
      user_email: appState.user.email,
      is_paid: newT.type === TransactionType.INCOME ? true : (newT.recurrence === 'RECURRING' ? false : true),
      isPaid: newT.type === TransactionType.INCOME ? true : (newT.recurrence === 'RECURRING' ? false : true)
    };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();

      if (error) throw error;

      if (data) {
        const mappedNew = {
          ...data[0],
          paymentMethod: data[0].payment_method || data[0].paymentMethod,
          isPaid: data[0].is_paid !== undefined ? data[0].is_paid : data[0].isPaid
        };
        setAppState(prev => ({
          ...prev,
          transactions: [mappedNew, ...prev.transactions],
          isSyncing: false
        }));
      }
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      updateState({ isSyncing: false });
      alert(`Erro: ${err.message}`);
    }
  };

  const toggleTransactionPaid = async (id: string) => {
    const t = appState.transactions.find(t => t.id === id);
    if (!t) return;

    const nextStatus = !t.isPaid;
    updateState({ isSyncing: true });

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_paid: nextStatus, isPaid: nextStatus })
        .eq('id', id);

      if (error) throw error;
      
      setAppState(prev => ({
        ...prev,
        transactions: prev.transactions.map(item => 
          item.id === id ? { ...item, isPaid: nextStatus } : item
        ),
        isSyncing: false
      }));
    } catch (err: any) {
      console.error("Erro status:", err);
      updateState({ isSyncing: false });
    }
  };

  const createFromTemplate = (category: Category, date: Date) => {
    const template = appState.recurringTemplates.find(t => t.category === category);
    if (!template) return;
    handleAddTransaction({
      description: category,
      amount: template.defaultAmount || 0,
      date: date.toISOString(),
      type: TransactionType.EXPENSE,
      category: category,
      paymentMethod: '' as any,
      recurrence: RecurrenceType.RECURRING
    });
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="pb-32 animate-in fade-in duration-500">
            <header className="p-6 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-[5px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-sm font-black shadow-lg shadow-blue-900/40 relative group overflow-hidden"
                >
                  <span className="group-hover:opacity-0 transition-opacity">{appState.user.name?.charAt(0) || 'G'}</span>
                  <LogOut className="absolute opacity-0 group-hover:opacity-100 transition-opacity text-white" size={16} />
                </button>
                <div className="flex flex-col">
                  <h1 className="font-black text-white text-lg tracking-tight leading-none">{appState.user.name}</h1>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Premium / {appState.user.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className={`transition-all duration-500 ${appState.isSyncing ? 'opacity-100' : 'opacity-0'}`}>
                    <CloudSync className="w-5 h-5 text-blue-500 animate-spin" />
                 </div>
                 <button className="w-10 h-10 bg-[#111] rounded-[5px] flex items-center justify-center border border-white/5 active:scale-95 transition-all">
                    <MessageCircle size={18} className="text-gray-400" />
                 </button>
              </div>
            </header>
            <Dashboard 
              transactions={appState.transactions} 
              currentMonth={new Date(appState.currentMonth)}
              onMonthChange={(date) => updateState({ currentMonth: date.toISOString() })}
            />
            <div className="mt-4 px-4">
               <button 
                 onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                 className="w-full flex items-center justify-between mb-4 px-4 py-5 bg-[#111] rounded-[5px] border border-white/5 active:scale-[0.98] transition-all group"
               >
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${isRecentExpanded ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`}></div>
                     <h3 className="text-xs font-black text-white uppercase tracking-widest">Histórico em Nuvem</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                      {appState.transactions.length} registros
                    </span>
                    <ChevronDown 
                      size={18} 
                      className={`text-gray-500 transition-transform duration-300 ${isRecentExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
               </button>
               <div className={`transition-all duration-500 overflow-hidden ${isRecentExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                  <TransactionList transactions={appState.transactions.slice(0, 10)} />
               </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <MonthlyReport 
            transactions={appState.transactions}
            recurringTemplates={appState.recurringTemplates}
            currentMonth={new Date(appState.currentMonth)}
            onMonthChange={(date) => updateState({ currentMonth: date.toISOString() })}
            onTogglePaid={toggleTransactionPaid}
            onConfirmTemplate={createFromTemplate}
            onUpdateTemplates={(temps) => updateState({ recurringTemplates: temps })}
          />
        );
      case 'cards':
        return <Wallet appState={appState} updateState={updateState} />;
      case 'flows':
        return <Flows transactions={appState.transactions} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#0a0a0a] min-h-screen relative overflow-hidden select-none">
      <main className="no-scrollbar h-screen overflow-y-auto">
        {renderContent()}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0a0a]/95 backdrop-blur-md pt-4 pb-8 px-8 flex items-center justify-between z-[50] border-t border-white/5">
        <button onClick={() => setActiveTab('home')} className={`p-2 transition-all duration-300 ${activeTab === 'home' ? 'text-white scale-110' : 'text-gray-700 hover:text-gray-400'}`}>
          <Home size={22} strokeWidth={activeTab === 'home' ? 3 : 2} />
        </button>
        <button onClick={() => setActiveTab('reports')} className={`p-2 transition-all duration-300 ${activeTab === 'reports' ? 'text-white scale-110' : 'text-gray-700 hover:text-gray-400'}`}>
          <List size={22} strokeWidth={activeTab === 'reports' ? 3 : 2} />
        </button>
        <button onClick={() => setIsAddModalOpen(true)} className="w-11 h-11 bg-blue-600 text-white rounded-[5px] flex items-center justify-center shadow-lg active:scale-90 transition-all border border-blue-400/20">
          <Plus size={24} strokeWidth={4} />
        </button>
        <button onClick={() => setActiveTab('cards')} className={`p-2 transition-all duration-300 ${activeTab === 'cards' ? 'text-white scale-110' : 'text-gray-700 hover:text-gray-400'}`}>
          <CreditCard size={22} strokeWidth={activeTab === 'cards' ? 3 : 2} />
        </button>
        <button onClick={() => setActiveTab('flows')} className={`p-2 transition-all duration-300 ${activeTab === 'flows' ? 'text-white scale-110' : 'text-gray-700 hover:text-gray-400'}`}>
          <Zap size={22} strokeWidth={activeTab === 'flows' ? 3 : 2} fill={activeTab === 'flows' ? 'currentColor' : 'none'} />
        </button>
      </nav>
      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddTransaction} />
    </div>
  );
};

export default App;