import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Camera, Check, Loader2, ChevronRight, Square, Delete, Calendar, Tag, CreditCard, ChevronLeft, Search, Landmark, DollarSign, Receipt, ShieldCheck, Plus, Edit2, Trash2 } from 'lucide-react';
import { TransactionType, Category, PaymentMethod, RecurrenceType } from '../types.ts';
import { CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, BANKS } from '../constants.tsx';
import { processReceiptImage, processVoiceCommand, speakText, processTextCommand, processStructuredVoiceCommand } from '../geminiService.ts';
import { elevenSTT, elevenTTS } from '../elevenlabsService.ts';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<any, 'id' | 'userId' | 'familyId'>) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

type FlowStep = 'VALUE' | 'DETAILS' | 'CATEGORY_SELECT' | 'METHOD_SELECT' | 'BANK_SELECT' | 'SUCCESS';
type AIStatus = 'IDLE' | 'LISTENING' | 'PROCESSING';

const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onAdd, onNotify }) => {
  const [step, setStep] = useState<FlowStep>('VALUE');
  const [aiStatus, setAiStatus] = useState<AIStatus>('IDLE');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [rawValue, setRawValue] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string, newName: string } | null>(null);
  const [editingMethod, setEditingMethod] = useState<{ oldName: string, newName: string } | null>(null);
  const [editingBank, setEditingBank] = useState<{ oldName: string, newName: string } | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [customBanks, setCustomBanks] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_banks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return BANKS;
  });
  const [customMethods, setCustomMethods] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_payment_methods');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return PAYMENT_METHODS;
  });
  const [customCategories, setCustomCategories] = useState<{ income: string[], expense: string[] }>(() => {
    const saved = localStorage.getItem('custom_categories');
    const defaults = { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          income: (Array.isArray(parsed.income) && parsed.income.length > 0) ? parsed.income : defaults.income,
          expense: (Array.isArray(parsed.expense) && parsed.expense.length > 0) ? parsed.expense : defaults.expense
        };
      } catch (e) { console.error(e); }
    }
    return defaults;
  });



  const [formData, setFormData] = useState({
    description: '',
    category: '' as Category | '',
    paymentMethod: '' as PaymentMethod | '',
    bank: '' as string | '',
    recurrence: RecurrenceType.UNIQUE,
    date: new Date().toISOString().split('T')[0]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tipo e tamanho
    if (!file.type.startsWith('image/')) {
      if (onNotify) onNotify('Arquivo inválido', 'Por favor, selecione uma imagem.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (onNotify) onNotify('Imagem muito grande', 'O arquivo deve ter no máximo 10MB.', 'warning');
      return;
    }

    setAiStatus('PROCESSING');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setImagePreview(dataUrl);

      try {
        const suggestion = await processReceiptImage(base64);

        if (suggestion && suggestion.amount && suggestion.amount > 0) {
          setRawValue((Math.round((suggestion.amount || 0) * 100)).toString());
          if (suggestion.type) setType(suggestion.type as TransactionType);
          setFormData(prev => ({
            ...prev,
            description: suggestion.description || prev.description,
            category: (suggestion.category as Category) || prev.category,
            paymentMethod: (suggestion.paymentMethod as PaymentMethod) || prev.paymentMethod,
            date: suggestion.date ? suggestion.date.split('T')[0] : prev.date
          }));
          setStep('DETAILS');
          if (onNotify) onNotify(
            'Cupom Lido com Sucesso!',
            `Valor R$ ${(suggestion.amount).toFixed(2)} em "${suggestion.category || suggestion.description}" detectado. Revise os detalhes.`,
            'success'
          );
        } else {
          if (onNotify) onNotify(
            'Não identificado',
            'Não foi possível ler os dados do cupom. Tente uma foto mais nítida ou preencha manualmente.',
            'warning'
          );
        }
      } catch (err: any) {
        if (onNotify) onNotify('Erro no processamento', err.message || 'Falha ao analisar a imagem.', 'error');
      } finally {
        setAiStatus('IDLE');
        // Limpar o input para permitir reenvio do mesmo arquivo
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };


  const handleKeyPress = (val: string) => {
    if (val === 'DEL') {
      setRawValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else {
      setRawValue(prev => prev === '0' ? val : prev + val);
    }
  };



  const formattedValue = (parseInt(rawValue) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const handleFinish = () => {
    const isRecurring = formData.recurrence === RecurrenceType.RECURRING;
    if (!formData.category || (!formData.paymentMethod && !isRecurring)) return;

    onAdd({
      ...formData,
      amount: parseInt(rawValue) / 100,
      type,
      category: formData.category,
      paymentMethod: formData.paymentMethod || null,
      bank: formData.bank || null
    });
    setStep('SUCCESS');
    setTimeout(() => {
      onClose();
      reset();
    }, 2500);
  };

  const reset = () => {
    setStep('VALUE');
    setRawValue('0');
    setAiStatus('IDLE');
    setFormData({
      description: '',
      category: '',
      paymentMethod: '',
      bank: '',
      recurrence: RecurrenceType.UNIQUE,
      date: new Date().toISOString().split('T')[0]
    });
    setIsAddingCategory(false);
    setNewCategoryName('');
    setIsAddingMethod(false);
    setNewMethodName('');
    setIsAddingBank(false);
    setNewBankName('');
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setAiStatus('PROCESSING');
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Transcrição com ElevenLabs (alta precisão) ou fallback
        let transcribedText = await elevenSTT(blob);

        // Se ElevenLabs falhar, tenta via Gemini direto
        if (!transcribedText) {
          const reader = new FileReader();
          await new Promise<void>(resolve => {
            reader.onloadend = () => resolve();
            reader.readAsDataURL(blob);
          });
          // Usa o Gemini para transcrever
          const base64 = (reader.result as string).split(',')[1];
          const fallback = await processVoiceCommand(base64, 'audio/webm');
          transcribedText = fallback?.summaryText || null;
        }

        if (!transcribedText) {
          setAiStatus('IDLE');
          if (onNotify) onNotify(
            '🎙️ Não entendi',
            'Não consegui transcrever o áudio. Tente novamente falando mais claramente.',
            'error'
          );
          return;
        }

        // Processa o comando estruturado de voz
        const result = await processStructuredVoiceCommand(transcribedText);

        if (result.success && result.data) {
          // ✅ Todos os campos presentes — cria a transação IMEDIATAMENTE
          const d = result.data;
          onAdd({
            description: d.description,
            amount: d.amount,
            type: d.type,
            category: d.category,
            paymentMethod: d.paymentMethod || null,
            bank: d.bank || null,
            recurrence: RecurrenceType.UNIQUE,
            date: d.date || new Date().toISOString().split('T')[0]
          });

          // Mostra tela de sucesso
          setRawValue((d.amount * 100).toFixed(0));
          setType(d.type);
          setStep('SUCCESS');

          // Notifica o usuário
          const typeName = d.type === TransactionType.INCOME ? 'Receita' : 'Despesa';
          const formattedAmt = d.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          if (onNotify) onNotify(
            `✅ ${typeName} Criada!`,
            `${formattedAmt} via ${d.paymentMethod} no ${d.bank} registrada com sucesso.`,
            'success'
          );

          // Fala a confirmação
          await elevenTTS(d.summaryText);

          // Fecha modal após 2.5s
          setTimeout(() => {
            onClose();
            reset();
          }, 2500);

        } else {
          // ❌ Informações incompletas — instrui o usuário SEM criar nada
          const instrucao = 'Fale assim: "Quero criar uma RECEITA ou DESPESA de [VALOR] forma de pagamento [MÉTODO] e o banco [BANCO]"';
          const detalhe = result.missingFields && result.missingFields.length > 0
            ? `Campos faltando: ${result.missingFields.join(', ')}`
            : result.errorMessage || 'Informações incompletas.';

          if (onNotify) onNotify(
            '⚠️ Como falar corretamente',
            `${instrucao}\n\n${detalhe}`,
            'warning'
          );

          // Também fala as instruções para o usuário
          await elevenTTS(`Informações incompletas. ${detalhe}. Por favor, fale: quero criar uma receita ou despesa de, o valor, forma de pagamento, e o banco.`);
        }

        setAiStatus('IDLE');
      };
      recorder.start();
      setAiStatus('LISTENING');
    } catch (e) {
      if (onNotify) onNotify('Acesso Negado', 'O microfone é necessário para comandos de voz.', 'error');
      else alert("Microfone necessário.");
    }
  };

  const stopVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceToggle = () => {
    if (aiStatus === 'LISTENING') {
      stopVoice();
    } else {
      startVoice();
    }
  };

  const allFilteredCategories = (type === TransactionType.INCOME ? customCategories.income : customCategories.expense)
    .filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();

    // Evitar duplicatas
    const currentList = type === TransactionType.INCOME ? customCategories.income : customCategories.expense;
    if (currentList.includes(name)) {
      if (onNotify) onNotify('Atenção', 'Esta categoria já existe.', 'warning');
      else alert("Esta categoria já existe.");
      return;
    }

    const updated = {
      ...customCategories,
      [type === TransactionType.INCOME ? 'income' : 'expense']: [
        ...customCategories[type === TransactionType.INCOME ? 'income' : 'expense'],
        name
      ]
    };

    setCustomCategories(updated);
    localStorage.setItem('custom_categories', JSON.stringify(updated));
    setNewCategoryName('');
    setIsAddingCategory(false);
    setStep('DETAILS');
  };

  const handleDeleteCategory = (catToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const listKey = type === TransactionType.INCOME ? 'income' : 'expense';
    const updated = {
      ...customCategories,
      [listKey]: customCategories[listKey].filter(cat => cat !== catToDelete)
    };
    setCustomCategories(updated);
    localStorage.setItem('custom_categories', JSON.stringify(updated));
    if (formData.category === catToDelete) {
      setFormData({ ...formData, category: '' });
    }
  };

  const handleStartEditCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory({ oldName: cat, newName: cat });
  };

  const handleSaveEditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingCategory || !editingCategory.newName.trim() || editingCategory.newName === editingCategory.oldName) {
      setEditingCategory(null);
      return;
    }

    const listKey = type === TransactionType.INCOME ? 'income' : 'expense';
    const updated = {
      ...customCategories,
      [listKey]: customCategories[listKey].map(cat => cat === editingCategory.oldName ? editingCategory.newName.trim() : cat)
    };

    setCustomCategories(updated);
    localStorage.setItem('custom_categories', JSON.stringify(updated));

    if (formData.category === editingCategory.oldName) {
      setFormData({ ...formData, category: editingCategory.newName.trim() });
    }
    setEditingCategory(null);
  };

  const handleAddCustomMethod = () => {
    if (!newMethodName.trim()) return;
    const name = newMethodName.trim();

    const currentList = customMethods;
    if (currentList.includes(name)) {
      if (onNotify) onNotify('Atenção', 'Este método já existe.', 'warning');
      else alert("Este método já existe.");
      return;
    }

    const updated = [...customMethods, name];
    setCustomMethods(updated);
    localStorage.setItem('custom_payment_methods', JSON.stringify(updated));
    setNewMethodName('');
    setIsAddingMethod(false);
    setFormData({ ...formData, paymentMethod: name });
    setStep('DETAILS');
  };

  const handleDeleteMethod = (methodToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customMethods.filter(m => m !== methodToDelete);
    setCustomMethods(updated);
    localStorage.setItem('custom_payment_methods', JSON.stringify(updated));
    if (formData.paymentMethod === methodToDelete) {
      setFormData({ ...formData, paymentMethod: '' });
    }
  };

  const handleStartEditMethod = (method: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMethod({ oldName: method, newName: method });
  };

  const handleSaveEditMethod = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingMethod || !editingMethod.newName.trim() || editingMethod.newName === editingMethod.oldName) {
      setEditingMethod(null);
      return;
    }

    const updated = customMethods.map(m => m === editingMethod.oldName ? editingMethod.newName.trim() : m);
    setCustomMethods(updated);
    localStorage.setItem('custom_payment_methods', JSON.stringify(updated));

    if (formData.paymentMethod === editingMethod.oldName) {
      setFormData({ ...formData, paymentMethod: editingMethod.newName.trim() });
    }
    setEditingMethod(null);
  };

  const allFilteredMethods = customMethods.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

  const getCategoryInfo = (cat: string) => {
    return CATEGORIES[cat] || {
      icon: <Tag className="w-5 h-5" />,
      color: 'bg-blue-500/10 text-blue-500',
      label: cat
    };
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Pix': return <ShieldCheck size={20} className="text-[#32BCAD]" />;
      case 'Dinheiro': return <DollarSign size={20} className="text-green-500" />;
      case 'Boleto': return <Receipt size={20} className="text-gray-400" />;
      default: return <Landmark size={20} className="text-blue-500" />;
    }
  };

  const isFormValid = formData.description && formData.category && (formData.paymentMethod || formData.recurrence === RecurrenceType.RECURRING) && (formData.bank || formData.recurrence === RecurrenceType.RECURRING);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-[#0a0a0a] flex flex-col overflow-hidden">
      {step === 'VALUE' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className={`absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-[0.03] transition-colors duration-700 ${type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          <div className={`absolute top-0 left-0 right-0 h-96 bg-gradient-to-b opacity-20 blur-3xl transition-colors duration-700 ${type === TransactionType.INCOME ? 'from-green-600' : 'from-red-600'}`} />
        </div>
      )}

      <div className="p-6 flex items-center justify-between z-10">
        <button
          onClick={step === 'VALUE' ? onClose : () => setStep(step === 'DETAILS' ? 'VALUE' : 'DETAILS')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group active:scale-95"
        >
          {step === 'VALUE' ? (
            <X size={24} />
          ) : (
            <>
              <ChevronLeft size={24} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] -ml-1">Voltar</span>
            </>
          )}
        </button>
        {step === 'VALUE' && (
          <div className="flex bg-[#111] p-1 rounded-[5px] border border-white/5 backdrop-blur-md">
            <button onClick={() => setType(TransactionType.INCOME)} className={`px-6 py-1.5 rounded-[5px]   uppercase transition-all duration-300 ${type === TransactionType.INCOME ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'text-gray-500'} text-h5`}>Receita</button>
            <button onClick={() => setType(TransactionType.EXPENSE)} className={`px-6 py-1.5 rounded-[5px]   uppercase transition-all duration-300 ${type === TransactionType.EXPENSE ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500'} text-h5`}>Despesa</button>
          </div>
        )}
        {(step === 'CATEGORY_SELECT' || step === 'METHOD_SELECT' || step === 'BANK_SELECT') && (
          <h2 className="uppercase tracking-widest text-white text-h4">
            {step === 'CATEGORY_SELECT' ? 'Categorias' : (step === 'METHOD_SELECT' ? (type === TransactionType.INCOME ? 'Recebido com' : 'Pago com') : 'Selecionar Banco')}
          </h2>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleVoiceToggle}
            disabled={aiStatus === 'PROCESSING'}
            className={`p-2 transition-all duration-300 ${aiStatus === 'LISTENING' ? 'text-red-500 bg-red-500/10 rounded-full' : 'text-gray-400 hover:text-white'} disabled:opacity-30`}
            title="Comando de voz"
          >
            {aiStatus === 'LISTENING' ? <Square size={20} fill="currentColor" className="animate-pulse" /> : <Mic size={20} />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={aiStatus === 'PROCESSING'}
            className={`p-2 transition-all rounded-lg ${aiStatus === 'PROCESSING'
              ? 'text-blue-400 bg-blue-500/10 animate-pulse'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              } disabled:opacity-50`}
            title="Fotografar cupom fiscal"
          >
            {aiStatus === 'PROCESSING' ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          </button>
          {/* Input de arquivo oculto — aceita câmera e galeria */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {step === 'VALUE' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-gray-500 uppercase tracking-widest mb-3 opacity-60 text-h5">Valor Total da {type === TransactionType.INCOME ? 'Receita' : 'Despesa'}</p>
              <h2 className="text-white tracking-tighter text-h1">R$ {formattedValue}</h2>
              {aiStatus !== 'IDLE' && (
                <div className="mt-12 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                  <button
                    onClick={aiStatus === 'LISTENING' ? stopVoice : undefined}
                    className="w-24 h-24 bg-white/5 rounded-[5px] flex flex-col items-center justify-center relative active:scale-95 transition-transform"
                  >
                    {aiStatus === 'LISTENING' ? (
                      <>
                        <div className="absolute inset-0 bg-red-500/20 rounded-[5px] animate-ping" />
                        <Square size={32} className="text-red-500 fill-current" />
                      </>
                    ) : <Loader2 className="animate-spin text-blue-500" size={32} />}
                  </button>
                  <div className="text-center space-y-2">
                    <p className="text-gray-400 uppercase tracking-widest text-h5">
                      {aiStatus === 'LISTENING' ? 'Ouvindo...' : 'Processando...'}
                    </p>
                    {aiStatus === 'LISTENING' && (
                      <>
                        <p className="text-red-500/50 uppercase tracking-widest text-h5">Clique no quadrado para parar</p>
                        <div className="mt-3 mx-auto max-w-[280px] bg-white/5 rounded-[5px] p-4 text-left border border-white/10">
                          <p className="text-gray-500 text-[9px] uppercase tracking-widest mb-2">Como falar:</p>
                          <p className="text-gray-300 text-[11px] leading-relaxed">
                            <span className="text-blue-400">"Quero criar uma</span>{' '}
                            <span className="text-green-400">receita</span>{' '}ou{' '}
                            <span className="text-red-400">despesa</span>{' '}de{' '}
                            <span className="text-yellow-400">[valor]</span>{' '}forma de pagamento{' '}
                            <span className="text-purple-400">[método]</span>{' '}e o banco{' '}
                            <span className="text-cyan-400">[banco]</span>
                            <span className="text-blue-400">"</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-[#111] p-8 grid grid-cols-3 gap-x-8 gap-y-4 safe-area-bottom border-t border-white/5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-16 text-gray-200 hover:text-white active:scale-90 transition-all text-h1">{n}</button>)}
              <button onClick={() => handleKeyPress('DEL')} className="h-16 flex items-center justify-center text-gray-600 hover:text-white transition-colors"><Delete size={28} /></button>
              <button onClick={() => handleKeyPress('0')} className="h-16 text-gray-200 hover:text-white active:scale-90 transition-all text-h1">0</button>
              <button onClick={() => setStep('DETAILS')} disabled={rawValue === '0'} className="h-16 bg-blue-600 text-white uppercase tracking-widest rounded-[5px] active:scale-95 transition-all disabled:opacity-20 shadow-2xl shadow-blue-900/40 text-h4">OK</button>
            </div>
          </div>
        )}

        {step === 'DETAILS' && (
          <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-500">
            <div className="space-y-[25px] flex-1">
              <div className="space-y-3">
                <label className="text-gray-500 uppercase tracking-widest opacity-60 text-h5">Descrição</label>
                <input autoFocus type="text" placeholder="Adicione uma descrição" className="w-full bg-transparent border-b border-white/10 py-4 outline-none focus:border-blue-500 transition-all placeholder:text-gray-800 text-h2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="relative flex items-center py-5 border-b border-white/10 group active:bg-white/5 rounded-[5px] transition-colors px-2 cursor-pointer overflow-hidden">
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  style={{ colorScheme: 'dark' }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 z-10"
                />
                <div className="flex items-center gap-4 w-full pointer-events-none">
                  <div className="w-12 h-12 bg-[#111] rounded-[5px] flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors shrink-0">
                    <Calendar size={22} />
                  </div>
                  <div className="flex flex-col w-full">
                    <span className="text-gray-500 uppercase tracking-widest opacity-60 text-h5">Data</span>
                    <span className="text-white mt-1 text-h4 tracking-wider">
                      {formData.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-500 uppercase tracking-widest opacity-60 text-h5">Lançamento</p>
                <div className="flex gap-2 bg-[#111] p-1 rounded-[5px] border border-white/5">
                  {[RecurrenceType.UNIQUE, RecurrenceType.RECURRING].map(r => (
                    <button key={r} onClick={() => setFormData({ ...formData, recurrence: r })} className={`flex-1 py-4 rounded-[5px]   uppercase transition-all duration-300 ${formData.recurrence === r ? 'bg-[#1a1a1a] text-white shadow-lg' : 'text-gray-600'} text-h5`}>{r === RecurrenceType.UNIQUE ? 'Único' : 'Recorrente'}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-[25px]">
                <button onClick={() => setStep('CATEGORY_SELECT')} className="flex items-center justify-between p-6 bg-[#111] rounded-[5px] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${formData.category ? getCategoryInfo(formData.category).color : 'bg-white/5 text-gray-600'}`}>{formData.category ? getCategoryInfo(formData.category).icon : <Plus size={20} />}</div>
                    <div className="text-left">
                      <p className="text-gray-600 uppercase tracking-wider mb-1 text-h5">Categoria</p>
                      <p className={`  tracking-tight ${formData.category ? 'text-white' : 'text-red-500'} text-h3`}>{formData.category || 'Selecione uma categoria *'}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-800" />
                </button>
                <button onClick={() => setStep('METHOD_SELECT')} className="flex items-center justify-between p-6 bg-[#111] rounded-[5px] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-[5px] flex items-center justify-center transition-colors">{formData.paymentMethod ? getMethodIcon(formData.paymentMethod) : <Plus size={20} className="text-gray-600" />}</div>
                    <div className="text-left">
                      <p className="text-gray-600 uppercase tracking-wider mb-1 text-h5">
                        {type === TransactionType.INCOME ? 'Forma de Recebimento' : 'Forma de Pagamento'}
                        {formData.recurrence === RecurrenceType.RECURRING && <span className="text-blue-500 text-h5"> (OPCIONAL)</span>}
                      </p>
                      <p className={`  tracking-tight ${formData.paymentMethod ? 'text-white' : (formData.recurrence === RecurrenceType.RECURRING ? 'text-gray-500' : 'text-red-500')} text-h3`}>
                        {formData.paymentMethod || (formData.recurrence === RecurrenceType.RECURRING ? 'Opcional' : 'Selecione uma forma *')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-800" />
                </button>
              </div>

              {/* Seletor de Método - Novo Elemento (Caixa Amarela na imagem) */}
              <div className="grid grid-cols-1 gap-[25px]">
                <button onClick={() => setStep('BANK_SELECT')} className="flex items-center justify-between p-6 bg-[#111] rounded-[5px] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-[5px] flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors">
                      <Landmark size={22} className={formData.bank ? 'text-blue-500' : 'text-gray-600'} />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-600 uppercase tracking-wider mb-1 text-h5">
                        {type === TransactionType.INCOME ? 'Receber em' : 'Pagar por'}
                        {formData.recurrence === RecurrenceType.RECURRING && <span className="text-blue-500 text-h5"> (OPCIONAL)</span>}
                      </p>
                      <p className={`  tracking-tight ${formData.bank ? 'text-white' : (formData.recurrence === RecurrenceType.RECURRING ? 'text-gray-500' : 'text-red-500')} text-h3`}>
                        {formData.bank || (formData.recurrence === RecurrenceType.RECURRING ? 'Opcional' : 'Selecionar banco *')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-800" />
                </button>
              </div>

            </div>
            <div className="mt-8 space-y-2">
              {!isFormValid && (
                <p className="text-red-500 text-[10px] uppercase tracking-widest text-center opacity-60">
                  Preencha os campos com * para finalizar
                </p>
              )}
              <button
                onClick={handleFinish}
                disabled={!isFormValid}
                className={`w-full bg-blue-600 py-6 rounded-[5px] uppercase tracking-widest active:scale-95 transition-all shadow-2xl ${isFormValid ? 'shadow-blue-900/50 opacity-100' : 'opacity-20 grayscale'} text-h4`}
              >
                Finalizar {type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
              </button>
            </div>
          </div>
        )}

        {step === 'CATEGORY_SELECT' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="p-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                <input type="text" placeholder="Pesquisar" className="w-full bg-[#111] border border-white/5 rounded-[5px] py-5 pl-14 pr-6 outline-none placeholder:text-gray-700 text-h4" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-1 pb-10">
              {allFilteredCategories.map((cat) => {
                const isEditing = editingCategory?.oldName === cat;

                return (
                  <div key={cat} className="group flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 p-2 bg-white/5 rounded-[5px] animate-in fade-in duration-200">
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-[#111] border border-white/10 rounded-[5px] py-2 px-3 outline-none text-h4 text-white"
                          value={editingCategory.newName}
                          onChange={e => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEditCategory(e as any)}
                        />
                        <button onClick={handleSaveEditCategory} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full transition-colors"><Check size={18} /></button>
                        <button onClick={() => setEditingCategory(null)} className="p-2 text-gray-500 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setFormData({ ...formData, category: cat }); setStep('DETAILS'); setSearchTerm(''); }}
                        className="flex-1 flex items-center justify-between p-4 hover:bg-white/5 rounded-[5px] transition-all"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${getCategoryInfo(cat).color}`}>
                            {getCategoryInfo(cat).icon}
                          </div>
                          <span className="text-gray-300 group-hover:text-white transition-colors text-h3">{getCategoryInfo(cat).label}</span>
                        </div>
                        {formData.category === cat && <Check className="text-green-500" size={18} strokeWidth={4} />}
                      </button>
                    )}

                    {!isEditing && (
                      <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEditCategory(cat, e)}
                          className="p-3 text-gray-600 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCategory(cat, e)}
                          className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer com botão de Add Nova */}
            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
              {isAddingCategory ? (
                <div className="flex gap-2 animate-in slide-in-from-bottom duration-300">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome da categoria"
                    className="flex-1 bg-[#111] border border-white/5 rounded-[5px] py-4 px-5 outline-none text-h4"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddCustomCategory()}
                  />
                  <button
                    onClick={handleAddCustomCategory}
                    className="px-6 bg-blue-600 text-white rounded-[5px] text-h5 font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-[5px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all text-h5 uppercase tracking-widest font-black"
                >
                  <Plus size={18} /> Add nova categoria
                </button>
              )}

              <button onClick={() => { setFormData({ ...formData, category: '' as any }); setStep('DETAILS'); }} className="w-full flex items-center justify-center p-4 text-gray-500 uppercase border border-white/5 bg-[#111] rounded-[5px] text-h5 font-black tracking-widest mt-4">
                Remover categoria
              </button>
            </div>
          </div>
        )}

        {step === 'METHOD_SELECT' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="p-6 pb-2">
              <p className="text-gray-500 uppercase tracking-widest mb-4 px-1 opacity-60 text-h5">Métodos de Pagamento</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-2 no-scrollbar">
              {allFilteredMethods.map((method) => {
                const isEditing = editingMethod?.oldName === method;

                return (
                  <div key={method} className="group flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 p-2 bg-white/5 rounded-[5px] animate-in fade-in duration-200">
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-[#111] border border-white/10 rounded-[5px] py-2 px-3 outline-none text-h4 text-white"
                          value={editingMethod.newName}
                          onChange={e => setEditingMethod({ ...editingMethod, newName: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEditMethod(e as any)}
                        />
                        <button onClick={handleSaveEditMethod} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full transition-colors"><Check size={18} /></button>
                        <button onClick={() => setEditingMethod(null)} className="p-2 text-gray-500 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setFormData({ ...formData, paymentMethod: method }); setStep('DETAILS'); }}
                        className="flex-1 flex items-center justify-between p-5 hover:bg-white/5 rounded-[5px] transition-all"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-[#111] rounded-[5px] flex items-center justify-center">
                            {getMethodIcon(method)}
                          </div>
                          <span className="text-gray-300 group-hover:text-white text-h3">{method}</span>
                        </div>
                        {formData.paymentMethod === method && <Check className="text-green-500" size={18} strokeWidth={4} />}
                      </button>
                    )}

                    {!isEditing && (
                      <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEditMethod(method, e)}
                          className="p-3 text-gray-600 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteMethod(method, e)}
                          className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md space-y-4">
              {isAddingMethod ? (
                <div className="flex gap-2 animate-in slide-in-from-bottom duration-300">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome do método"
                    className="flex-1 bg-[#111] border border-white/5 rounded-[5px] py-4 px-5 outline-none text-h4"
                    value={newMethodName}
                    onChange={e => setNewMethodName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddCustomMethod()}
                  />
                  <button
                    onClick={handleAddCustomMethod}
                    className="px-6 bg-blue-600 text-white rounded-[5px] text-h5 font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingMethod(true)}
                  className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-[5px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all text-h5 uppercase tracking-widest font-black"
                >
                  <Plus size={18} /> Add novo método
                </button>
              )}

              <button onClick={() => { setFormData({ ...formData, paymentMethod: '' as any }); setStep('DETAILS'); }} className="w-full flex items-center justify-center p-4 text-gray-500 uppercase border border-white/5 bg-[#111] rounded-[5px] text-h5 font-black tracking-widest">
                Remover método
              </button>
            </div>
          </div>
        )}

        {step === 'BANK_SELECT' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="p-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                <input type="text" placeholder="Pesquisar banco" className="w-full bg-[#111] border border-white/5 rounded-[5px] py-5 pl-14 pr-6 outline-none placeholder:text-gray-700 text-h4" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-1 pb-10">
              {customBanks.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase())).map((bank) => {
                const isEditing = editingBank?.oldName === bank;

                return (
                  <div key={bank} className="group flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 p-2 bg-white/5 rounded-[5px]">
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-[#111] border border-white/10 rounded-[5px] py-2 px-3 outline-none text-h4 text-white"
                          value={editingBank.newName}
                          onChange={e => setEditingBank({ ...editingBank, newName: e.target.value })}
                        />
                        <button onClick={() => {
                          const updated = customBanks.map(b => b === editingBank.oldName ? editingBank.newName.trim() : b);
                          setCustomBanks(updated);
                          localStorage.setItem('custom_banks', JSON.stringify(updated));
                          if (formData.bank === editingBank.oldName) setFormData({ ...formData, bank: editingBank.newName.trim() });
                          setEditingBank(null);
                        }} className="p-2 text-green-500"><Check size={18} /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setFormData({ ...formData, bank: bank }); setStep('DETAILS'); setSearchTerm(''); }}
                          className="flex-1 flex items-center justify-between p-5 hover:bg-white/5 rounded-[5px] transition-all"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#111] rounded-[5px] flex items-center justify-center text-blue-500">
                              <Landmark size={20} />
                            </div>
                            <span className="text-gray-300 group-hover:text-white text-h3">{bank}</span>
                          </div>
                          {formData.bank === bank && <Check className="text-green-500" size={18} strokeWidth={4} />}
                        </button>
                        <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingBank({ oldName: bank, newName: bank }); }}
                            className="p-3 text-gray-600 hover:text-blue-500 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = customBanks.filter(b => b !== bank);
                              setCustomBanks(updated);
                              localStorage.setItem('custom_banks', JSON.stringify(updated));
                              if (formData.bank === bank) setFormData({ ...formData, bank: '' });
                            }}
                            className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md space-y-4">
              {isAddingBank ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome do banco"
                    className="flex-1 bg-[#111] border border-white/5 rounded-[5px] py-4 px-5 outline-none text-h4"
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (!newBankName.trim()) return;
                      const updated = [...customBanks, newBankName.trim()];
                      setCustomBanks(updated);
                      localStorage.setItem('custom_banks', JSON.stringify(updated));
                      setNewBankName('');
                      setIsAddingBank(false);
                    }}
                    className="px-6 bg-blue-600 text-white rounded-[5px] text-h5 font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingBank(true)}
                  className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-[5px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all text-h5 uppercase tracking-widest font-black"
                >
                  <Plus size={18} /> Add novo banco
                </button>
              )}
              <button onClick={() => { setFormData({ ...formData, bank: '' }); setStep('DETAILS'); }} className="w-full flex items-center justify-center p-4 text-gray-500 uppercase border border-white/5 bg-[#111] rounded-[5px] text-h5 font-black tracking-widest">
                Remover banco
              </button>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] space-y-10 p-10 animate-in fade-in zoom-in duration-700">
            <div className="w-40 h-40 bg-green-500 rounded-[5px] flex items-center justify-center animate-scale-in shadow-2xl shadow-green-900/50"><Check size={80} className="text-white" strokeWidth={6} /></div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 uppercase tracking-widest opacity-60 text-h5">Lançamento anotado</p>
              <h3 className="text-white tracking-tighter text-h1">R$ {formattedValue}</h3>
            </div>
          </div>
        )}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAiStatus('PROCESSING');
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const suggestion = await processReceiptImage(base64);
          if (suggestion) {
            setRawValue((suggestion.amount! * 100).toFixed(0));
            setType(suggestion.type!);
            setFormData(prev => ({ ...prev, description: suggestion.description!, category: suggestion.category! as Category, paymentMethod: (suggestion.paymentMethod as PaymentMethod) || '' }));
            setStep('DETAILS');
          }
          setAiStatus('IDLE');
        };
        reader.readAsDataURL(file);
      }} />
    </div>
  );
};

export default AddModal;