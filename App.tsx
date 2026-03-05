import React, { useState, useEffect } from 'react';
import { Home, List, CreditCard, Plus, MessageCircle, RefreshCcw, Zap, ChevronDown, LogOut, Bell, Users } from 'lucide-react';
import { Transaction, AppState, TransactionType, RecurrenceType, Category, RecurringTemplate, UserProfile, AppNotification, SpendingLimit } from './types.ts';
import Dashboard from './components/Dashboard.tsx';
import TransactionList from './components/TransactionList.tsx';
import AddModal from './components/AddModal.tsx';
import Wallet from './components/Wallet.tsx';
import MonthlyReport from './components/MonthlyReport.tsx';
import Flows from './components/Flows.tsx';
import Login from './components/Login.tsx';
import NotificationsPanel from './components/NotificationsPanel.tsx';
import FamilyMembers from './components/FamilyMembers.tsx';
import Toast from './components/Toast.tsx';
import { supabase } from './lib/supabase.ts';

const INITIAL_RECURRING: Category[] = [
  'Aluguel', 'Água', 'Luz', 'Academia', 'Internet',
  'Plano de Saúde', 'Telefone', 'Prestação do Carro', 'Prestação Moto'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'cards' | 'flows' | 'family'>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  // Lista in-memory de emails com acesso (fonte de verdade: Supabase)
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);

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
      isSyncing: false,
      notifications: []
    };
  });

  useEffect(() => {
    if (isAuthenticated && appState.user.email) {
      loadUserData(appState.user.email);
    }
  }, [isAuthenticated, appState.user.email]);

  const loadUserData = async (email: string) => {
    updateState({ isSyncing: true });
    const familyId = 'familia_padrao';

    try {
      // Carregar transações
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .order('date', { ascending: false });
      if (error) throw error;

      // Carregar limites
      const { data: limitsData, error: limitsError } = await supabase
        .from('spending_limits')
        .select('*')
        .eq('family_id', familyId);
      if (limitsError) console.warn('Aviso limites:', limitsError.message);

      // Carregar métodos de pagamento
      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('family_id', familyId);
      if (methodsError) console.warn('Aviso métodos:', methodsError.message);

      // Carregar cartões
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('family_id', familyId);
      if (cardsError) console.warn('Aviso cartões:', cardsError.message);

      // Carregar templates recorrentes
      const { data: templatesData, error: templatesError } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('family_id', familyId);
      if (templatesError) console.warn('Aviso templates:', templatesError.message);

      if (data) {
        const mappedData = data.map((d: any) => ({
          ...d,
          paymentMethod: d.payment_method || d.paymentMethod,
          isPaid: d.is_paid !== undefined ? d.is_paid : false
        }));

        const mappedTemplates: RecurringTemplate[] = templatesData && templatesData.length > 0
          ? templatesData.map((t: any) => ({
            category: t.category,
            isActive: t.is_active,
            defaultAmount: t.default_amount || 0
          }))
          : undefined as any;

        setAppState(prev => {
          const updatedLimits = (limitsData || []).map((l: any) => {
            const spent = mappedData
              .filter(t => t.category === l.category && t.type === TransactionType.EXPENSE && t.isPaid)
              .reduce((acc: number, t: any) => acc + t.amount, 0);
            return { ...l, spent };
          });
          return {
            ...prev,
            transactions: mappedData,
            limits: updatedLimits,
            paymentMethods: methodsData && methodsData.length > 0
              ? methodsData.map((m: any) => ({ ...m, isArchived: m.is_archived }))
              : prev.paymentMethods,
            creditCards: cardsData && cardsData.length > 0
              ? cardsData.map((c: any) => ({ ...c, dueDay: c.due_day, isArchived: c.is_archived }))
              : prev.creditCards,
            recurringTemplates: mappedTemplates || prev.recurringTemplates,
            isSyncing: false
          };
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      updateState({ isSyncing: false });
      addNotification('Erro de Conexão', `Não foi possível carregar seus dados: ${err.message}`, 'error');
    }
  };

  const handleLogin = (email: string) => {
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    // Para simplificar, vamos atribuir um ID de família baseado no domínio ou um padrão
    // Em um sistema real, você buscaria isso em uma tabela de 'usuários' ou 'famílias'
    const familyId = 'familia_padrao'; // Você poderá alterar isso para cada grupo de 4 e-mails

    setAppState(prev => ({
      ...prev,
      user: { ...prev.user, email, name: formattedName, id: email, familyId }
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

  const syncLimits = async (limits: SpendingLimit[]) => {
    if (!appState.user.familyId) return;
    updateState({ isSyncing: true });
    try {
      await supabase.from('spending_limits').delete().eq('family_id', appState.user.familyId);

      const toInsert = limits.map(l => ({
        category: l.category,
        limit: l.limit,
        family_id: appState.user.familyId,
        user_email: appState.user.email
      }));

      const { data, error } = await supabase.from('spending_limits').insert(toInsert).select();
      if (error) throw error;

      if (data) {
        // Recalcular o spent localmente após o sync
        const updatedLimits = data.map(l => {
          const spent = appState.transactions
            .filter(t => t.category === l.category && t.type === TransactionType.EXPENSE && t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0);
          return { ...l, spent };
        });
        updateState({ limits: updatedLimits, isSyncing: false });
      }
    } catch (err) {
      console.error("Erro ao sincronizar limites:", err);
      updateState({ isSyncing: false });
    }
  };

  const syncPaymentMethods = async (methods: any[]) => {
    if (!appState.user.familyId) return;
    updateState({ isSyncing: true });
    try {
      const toUpsert = methods.map(m => ({
        name: m.name,
        icon: m.icon || 'Landmark',
        is_archived: m.isArchived || false,
        family_id: appState.user.familyId,
        user_email: appState.user.email
      }));
      // Primeiro remove os existentes para a família, depois insere novamente
      await supabase.from('payment_methods').delete().eq('family_id', appState.user.familyId);
      if (toUpsert.length > 0) {
        const { error } = await supabase.from('payment_methods').insert(toUpsert);
        if (error) throw error;
      }
      updateState({ isSyncing: false });
    } catch (err: any) {
      console.error('Erro ao sincronizar métodos:', err);
      updateState({ isSyncing: false });
      addNotification('Erro de Sincronização', `Métodos de pagamento: ${err.message}`, 'error');
    }
  };

  const syncCreditCards = async (cards: any[]) => {
    if (!appState.user.familyId) return;
    updateState({ isSyncing: true });
    try {
      const toInsert = cards.map(c => ({
        name: c.name,
        icon: c.icon || 'CreditCard',
        due_day: c.dueDay || 1,
        is_archived: c.isArchived || false,
        family_id: appState.user.familyId,
        user_email: appState.user.email
      }));
      await supabase.from('credit_cards').delete().eq('family_id', appState.user.familyId);
      if (toInsert.length > 0) {
        const { error } = await supabase.from('credit_cards').insert(toInsert);
        if (error) throw error;
      }
      updateState({ isSyncing: false });
    } catch (err: any) {
      console.error('Erro ao sincronizar cartões:', err);
      updateState({ isSyncing: false });
      addNotification('Erro de Sincronização', `Cartões: ${err.message}`, 'error');
    }
  };

  const syncRecurringTemplates = async (templates: RecurringTemplate[]) => {
    if (!appState.user.familyId || !appState.user.email) return;
    try {
      const toUpsert = templates.map(t => ({
        family_id: appState.user.familyId,
        user_email: appState.user.email,
        category: t.category,
        is_active: t.isActive,
        default_amount: t.defaultAmount || 0
      }));
      const { error } = await supabase
        .from('recurring_templates')
        .upsert(toUpsert, { onConflict: 'family_id,category' });
      if (error) {
        // Tabela pode não existir ainda — salvar apenas localmente
        console.warn('Templates não sincronizados (tabela pendente):', error.message);
      }
    } catch (err: any) {
      console.warn('Erro ao sincronizar templates:', err.message);
    }
  };

  const checkLimits = (transactions: Transaction[], limits: SpendingLimit[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    limits.forEach(limit => {
      const spent = transactions
        .filter(t => {
          const d = new Date(t.date);
          return t.category === limit.category &&
            t.type === TransactionType.EXPENSE &&
            t.isPaid &&
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear;
        })
        .reduce((acc, t) => acc + t.amount, 0);

      const percentage = (spent / limit.limit) * 100;

      if (percentage >= 100) {
        addNotification(
          `Limite Atingido: ${limit.category}`,
          `Atenção! Você atingiu 100% do limite de R$ ${limit.limit.toFixed(2)} definido para ${limit.category}.`,
          'error'
        );
      } else if (percentage >= 80) {
        addNotification(
          `Limite Próximo: ${limit.category}`,
          `Você já utilizou ${percentage.toFixed(0)}% do seu limite de R$ ${limit.limit.toFixed(2)} para ${limit.category}.`,
          'warning'
        );
      }
    });
  };

  const addNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      type,
      isRead: false,
      date: new Date().toISOString()
    };
    updateState({ notifications: [newNotif, ...(appState.notifications || [])] });
    setToasts(prev => [newNotif, ...prev]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'userId' | 'familyId'>) => {
    updateState({ isSyncing: true });

    // Apenas os campos que existem no schema do Supabase
    const isPaidValue = newT.type === TransactionType.INCOME ? true : (newT.recurrence === RecurrenceType.RECURRING ? false : true);
    const transactionData = {
      description: newT.description,
      amount: newT.amount,
      date: newT.date,
      type: newT.type,
      category: newT.category,
      payment_method: newT.paymentMethod || null,
      bank: newT.bank || null,
      recurrence: newT.recurrence,
      user_email: appState.user.email,
      family_id: appState.user.familyId,
      is_paid: isPaidValue,
    };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedNew = {
          ...data[0],
          paymentMethod: data[0].payment_method,
          isPaid: data[0].is_paid ?? false
        };
        const updatedTransactions = [mappedNew, ...appState.transactions];
        setAppState(prev => ({
          ...prev,
          transactions: updatedTransactions,
          isSyncing: false
        }));

        if (newT.type === TransactionType.EXPENSE) {
          checkLimits(updatedTransactions, appState.limits);
        }

        addNotification(
          newT.type === TransactionType.INCOME ? 'Receita Recebida' : 'Despesa Registrada',
          `R$ ${newT.amount.toFixed(2)} em "${newT.category}" salvo na nuvem com sucesso.`,
          newT.type === TransactionType.INCOME ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      console.error('Erro ao salvar transação:', err);
      updateState({ isSyncing: false });
      addNotification('Erro ao Salvar', err.message, 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const t = appState.transactions.find(t => t.id === id);
    if (!t) return;
    updateState({ isSyncing: true });
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setAppState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(item => item.id !== id),
        isSyncing: false
      }));
      addNotification('Lançamento Excluído', `"${t.category || t.description}" foi removido da nuvem.`, 'warning');
    } catch (err: any) {
      console.error('Erro ao excluir transação:', err);
      updateState({ isSyncing: false });
      addNotification('Erro ao Excluir', err.message, 'error');
    }
  };

  const toggleTransactionPaid = async (id: string) => {
    const t = appState.transactions.find(t => t.id === id);
    if (!t) return;

    const nextStatus = !t.isPaid;
    const payDate = nextStatus ? new Date().toISOString() : t.date;
    updateState({ isSyncing: true });

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_paid: nextStatus, date: payDate })
        .eq('id', id);

      if (error) throw error;

      setAppState(prev => {
        const updatedTransactions = prev.transactions.map(item =>
          item.id === id ? { ...item, isPaid: nextStatus, is_paid: nextStatus, date: payDate } : item
        );
        if (nextStatus && t.type === TransactionType.EXPENSE) {
          checkLimits(updatedTransactions, prev.limits);
        }
        return { ...prev, transactions: updatedTransactions, isSyncing: false };
      });

      addNotification(
        nextStatus ? 'Pagamento Confirmado' : 'Aviso de Pendência',
        nextStatus
          ? `"${t.category || t.description}" marcado como pago e salvo na nuvem.`
          : `O pagamento de "${t.category || t.description}" foi revertido para pendente.`,
        nextStatus ? 'success' : 'warning'
      );
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      updateState({ isSyncing: false });
      addNotification('Erro de Sincronização', `Não foi possível atualizar o status: ${err.message}`, 'error');
    }
  };

  const createFromTemplate = (category: Category) => {
    const template = appState.recurringTemplates.find(t => t.category === category);
    if (!template) return;

    if (!template.defaultAmount || template.defaultAmount <= 0) {
      addNotification(
        'Valor não definido',
        `Configure o valor padrão de "${category}" nos Compromissos Fixos antes de registrar.`,
        'warning'
      );
      return;
    }

    handleAddTransaction({
      description: category,
      amount: template.defaultAmount,
      date: new Date().toISOString(),
      type: TransactionType.EXPENSE,
      category: category,
      paymentMethod: '' as any,
      recurrence: RecurrenceType.RECURRING
    });
  };

  const handleUpdateTemplates = async (templates: RecurringTemplate[]) => {
    updateState({ recurringTemplates: templates });
    syncRecurringTemplates(templates);
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="pb-64 animate-in fade-in duration-500">
            <header className="p-6 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-[5px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/40 relative group overflow-hidden text-h4"
                >
                  <span className="group-hover:opacity-0 transition-opacity">{appState.user.name?.charAt(0) || 'G'}</span>
                  <LogOut className="absolute opacity-0 group-hover:opacity-100 transition-opacity text-white" size={16} />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-white tracking-tight leading-none text-h3">{appState.user.name}</h1>
                  <span className="text-gray-600 uppercase tracking-widest text-h5">Premium / {appState.user.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-500 ${appState.isSyncing ? 'opacity-100' : 'opacity-0'}`}>
                  <RefreshCcw className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="w-10 h-10 bg-[#111] rounded-[5px] flex items-center justify-center border border-white/5 active:scale-95 transition-all relative"
                >
                  <MessageCircle size={18} className="text-gray-400" />
                  {(appState.notifications || []).filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  )}
                </button>
              </div>
            </header>
            <Dashboard
              transactions={appState.transactions}
              limits={appState.limits}
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
                  <h3 className="text-white uppercase tracking-widest text-h5">Histórico em Nuvem</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 uppercase tracking-tighter text-h5">
                    {appState.transactions.length} registros
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-500 transition-transform duration-300 ${isRecentExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              <div className={`transition-all duration-500 overflow-hidden ${isRecentExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                <TransactionList
                  transactions={appState.transactions.slice(0, 10)}
                  onDelete={handleDeleteTransaction}
                  onTogglePaid={toggleTransactionPaid}
                />
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
            onConfirmTemplate={(cat) => createFromTemplate(cat)}
            onUpdateTemplates={handleUpdateTemplates}
            onNotify={addNotification}
          />
        );
      case 'cards':
        return <Wallet
          appState={appState}
          updateState={updateState}
          syncLimits={syncLimits}
          syncPaymentMethods={syncPaymentMethods}
          syncCreditCards={syncCreditCards}
          onNotify={addNotification}
        />;
      case 'family':
        return <FamilyMembers
          currentUserEmail={appState.user.email}
          familyId={appState.user.familyId || 'familia_padrao'}
          onAllowedEmailsChange={(emails) => setAllowedEmails(emails)}
          onNotify={addNotification}
        />;
      case 'flows':
        return <Flows transactions={appState.transactions} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[620px] mx-auto bg-[#0a0a0a] min-h-screen relative overflow-hidden select-none">
      <main className="no-scrollbar h-screen overflow-y-auto">
        {renderContent()}
      </main>
      <nav className="absolute bottom-0 left-0 right-0 max-w-[620px] mx-auto bg-[#0a0a0a]/95 backdrop-blur-md pt-4 pb-8 px-8 flex items-center justify-between z-[50] border-t border-white/5">
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
        <button onClick={() => setActiveTab('family')} className={`p-2 transition-all duration-300 ${activeTab === 'family' ? 'text-white scale-110' : 'text-gray-700 hover:text-gray-400'}`}>
          <Users size={22} strokeWidth={activeTab === 'family' ? 3 : 2} />
        </button>
      </nav>
      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTransaction}
        onNotify={addNotification}
      />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-[620px] px-4 pointer-events-none flex flex-col gap-3">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            notification={toast}
            onClose={removeToast}
            duration={toast.type === 'warning' ? 8000 : toast.type === 'error' ? 6000 : 4000}
          />
        ))}
      </div>


      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={appState.notifications || []}
        onMarkAsRead={(id) => updateState({
          notifications: (appState.notifications || []).map(n => n.id === id ? { ...n, isRead: true } : n)
        })}
        onDelete={(id) => updateState({
          notifications: (appState.notifications || []).filter(n => n.id !== id)
        })}
        onClearAll={() => updateState({ notifications: [] })}
        onMarkAllAsRead={() => updateState({
          notifications: (appState.notifications || []).map(n => ({ ...n, isRead: true }))
        })}
      />
    </div>
  );
};

export default App;