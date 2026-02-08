import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Camera, Check, Loader2, ChevronRight, Square, Delete, Calendar, Tag, CreditCard, ChevronLeft, Search, Landmark, DollarSign, Receipt, ShieldCheck, Plus } from 'lucide-react';
import { TransactionType, Category, PaymentMethod, RecurrenceType } from '../types.ts';
import { CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants.tsx';
import { processReceiptImage, processVoiceCommand, speakText } from '../geminiService.ts';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<any, 'id' | 'userId' | 'familyId'>) => void;
}

type FlowStep = 'VALUE' | 'DETAILS' | 'CATEGORY_SELECT' | 'METHOD_SELECT' | 'SUCCESS';
type AIStatus = 'IDLE' | 'LISTENING' | 'PROCESSING';

const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [step, setStep] = useState<FlowStep>('VALUE');
  const [aiStatus, setAiStatus] = useState<AIStatus>('IDLE');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [rawValue, setRawValue] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    category: '' as Category | '',
    paymentMethod: '' as PaymentMethod | '',
    recurrence: RecurrenceType.UNIQUE,
    date: new Date().toISOString().split('T')[0]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      paymentMethod: formData.paymentMethod || null 
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
      recurrence: RecurrenceType.UNIQUE,
      date: new Date().toISOString().split('T')[0]
    });
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
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const suggestion = await processVoiceCommand(base64, 'audio/webm');
          if (suggestion) {
            setRawValue((suggestion.amount * 100).toFixed(0));
            setType(suggestion.type);
            setFormData(prev => ({
              ...prev,
              description: suggestion.description,
              category: (suggestion.category as Category) || '',
              paymentMethod: (suggestion.paymentMethod as PaymentMethod) || ''
            }));
            setStep('DETAILS');
            await speakText(suggestion.summaryText);
          }
          setAiStatus('IDLE');
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setAiStatus('LISTENING');
    } catch (e) { alert("Microfone necessário."); }
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

  const filteredCategories = (type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Pix': return <ShieldCheck size={20} className="text-[#32BCAD]" />;
      case 'Dinheiro': return <DollarSign size={20} className="text-green-500" />;
      case 'Boleto': return <Receipt size={20} className="text-gray-400" />;
      default: return <Landmark size={20} className="text-blue-500" />;
    }
  };

  const isFormValid = formData.description && formData.category && (formData.paymentMethod || formData.recurrence === RecurrenceType.RECURRING);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col overflow-hidden">
      {step === 'VALUE' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className={`absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-[0.03] transition-colors duration-700 ${type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
             <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                   <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                   </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
             </svg>
          </div>
          <div className={`absolute top-0 left-0 right-0 h-96 bg-gradient-to-b opacity-20 blur-3xl transition-colors duration-700 ${type === TransactionType.INCOME ? 'from-green-600' : 'from-red-600'}`} />
        </div>
      )}

      <div className="p-6 flex items-center justify-between z-10">
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          {step === 'VALUE' ? <X size={24} /> : <ChevronLeft size={24} onClick={(e) => { e.stopPropagation(); setStep('VALUE'); }} />}
        </button>
        {step === 'VALUE' && (
          <div className="flex bg-[#111] p-1 rounded-[5px] border border-white/5 backdrop-blur-md">
            <button onClick={() => setType(TransactionType.INCOME)} className={`px-6 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all duration-300 ${type === TransactionType.INCOME ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'text-gray-500'}`}>Receita</button>
            <button onClick={() => setType(TransactionType.EXPENSE)} className={`px-6 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all duration-300 ${type === TransactionType.EXPENSE ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500'}`}>Despesa</button>
          </div>
        )}
        {(step === 'CATEGORY_SELECT' || step === 'METHOD_SELECT') && (
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{step === 'CATEGORY_SELECT' ? 'Categorias' : (type === TransactionType.INCOME ? 'Receber com' : 'Pagar com')}</h2>
        )}
        <div className="flex gap-2">
            <button onClick={handleVoiceToggle} className={`p-2 transition-all duration-300 ${aiStatus === 'LISTENING' ? 'text-red-500 bg-red-500/10 rounded-full' : 'text-gray-400'}`}>
              {aiStatus === 'LISTENING' ? <Square size={20} fill="currentColor" className="animate-pulse" /> : <Mic size={20} />}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400"><Camera size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {step === 'VALUE' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 opacity-60">Valor Total da {type === TransactionType.INCOME ? 'Receita' : 'Despesa'}</p>
               <h2 className="text-6xl font-black text-white tracking-tighter">R$ {formattedValue}</h2>
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
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {aiStatus === 'LISTENING' ? 'Ouvindo...' : 'Processando...'}
                      </p>
                      {aiStatus === 'LISTENING' && (
                        <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest mt-2">Clique no quadrado para parar</p>
                      )}
                    </div>
                  </div>
               )}
            </div>
            <div className="bg-[#111] p-8 grid grid-cols-3 gap-x-8 gap-y-4 safe-area-bottom border-t border-white/5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-16 text-3xl font-black text-gray-200 hover:text-white active:scale-90 transition-all">{n}</button>)}
              <button onClick={() => handleKeyPress('DEL')} className="h-16 flex items-center justify-center text-gray-600 hover:text-white transition-colors"><Delete size={28} /></button>
              <button onClick={() => handleKeyPress('0')} className="h-16 text-3xl font-black text-gray-200 hover:text-white active:scale-90 transition-all">0</button>
              <button onClick={() => setStep('DETAILS')} disabled={rawValue === '0'} className="h-16 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-[5px] active:scale-95 transition-all disabled:opacity-20 shadow-2xl shadow-blue-900/40">OK</button>
            </div>
          </div>
        )}

        {step === 'DETAILS' && (
          <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-500">
             <div className="space-y-10 flex-1">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Descrição</label>
                    <input autoFocus type="text" placeholder="Adicione uma descrição" className="w-full bg-transparent border-b border-white/10 py-4 text-2xl font-black outline-none focus:border-blue-500 transition-all placeholder:text-gray-800" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="flex items-center justify-between py-5 border-b border-white/10 group active:bg-white/5 rounded-[5px] transition-colors px-2">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#111] rounded-[5px] flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors"><Calendar size={22} /></div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Data</span>
                         <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-transparent text-sm font-black text-white outline-none mt-1" />
                      </div>
                   </div>
                   <ChevronRight size={18} className="text-gray-800" />
                </div>
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Lançamento</p>
                   <div className="flex gap-2 bg-[#111] p-1 rounded-[5px] border border-white/5">
                      {[RecurrenceType.UNIQUE, RecurrenceType.RECURRING].map(r => (
                        <button key={r} onClick={() => setFormData({...formData, recurrence: r})} className={`flex-1 py-4 rounded-[5px] text-[10px] font-black uppercase transition-all duration-300 ${formData.recurrence === r ? 'bg-[#1a1a1a] text-white shadow-lg' : 'text-gray-600'}`}>{r === RecurrenceType.UNIQUE ? 'Único' : 'Recorrente'}</button>
                      ))}
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <button onClick={() => setStep('CATEGORY_SELECT')} className="flex items-center justify-between p-6 bg-[#111] rounded-[5px] border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-5">
                         <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${formData.category ? CATEGORIES[formData.category as Category].color : 'bg-white/5 text-gray-600'}`}>{formData.category ? CATEGORIES[formData.category as Category].icon : <Plus size={20} />}</div>
                         <div className="text-left">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-wider mb-1">Categoria</p>
                            <p className={`font-black text-base tracking-tight ${formData.category ? 'text-white' : 'text-gray-500'}`}>{formData.category || 'Adicione uma categoria'}</p>
                         </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-800" />
                   </button>
                   <button onClick={() => setStep('METHOD_SELECT')} className="flex items-center justify-between p-6 bg-[#111] rounded-[5px] border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-white/5 rounded-[5px] flex items-center justify-center transition-colors">{formData.paymentMethod ? getMethodIcon(formData.paymentMethod) : <Plus size={20} className="text-gray-600" />}</div>
                         <div className="text-left">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-wider mb-1">Pagar com {formData.recurrence === RecurrenceType.RECURRING && <span className="text-blue-500 text-[8px]">(OPCIONAL)</span>}</p>
                            <p className={`font-black text-base tracking-tight ${formData.paymentMethod ? 'text-white' : 'text-gray-500'}`}>{formData.paymentMethod || 'Adicione um banco'}</p>
                         </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-800" />
                   </button>
                </div>
             </div>
             <button onClick={handleFinish} disabled={!isFormValid} className="w-full mt-10 bg-blue-600 py-6 rounded-[5px] text-sm font-black uppercase tracking-widest active:scale-95 transition-all shadow-2xl shadow-blue-900/50 disabled:opacity-20 mb-4">Finalizar Lançamento</button>
          </div>
        )}

        {step === 'CATEGORY_SELECT' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-400">
             <div className="p-6">
                <div className="relative group">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                   <input type="text" placeholder="Pesquisar" className="w-full bg-[#111] border border-white/5 rounded-[5px] py-5 pl-14 pr-6 text-sm font-bold outline-none placeholder:text-gray-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto px-6 space-y-1 pb-10">
                {filteredCategories.map((cat) => (
                   <button key={cat} onClick={() => { setFormData({...formData, category: cat}); setStep('DETAILS'); setSearchTerm(''); }} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-[5px] transition-all">
                      <div className="flex items-center gap-5"><div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${CATEGORIES[cat].color}`}>{CATEGORIES[cat].icon}</div><span className="text-base font-black text-gray-300 group-hover:text-white transition-colors">{CATEGORIES[cat].label}</span></div>
                      {formData.category === cat && <Check className="text-green-500" size={18} strokeWidth={4} />}
                   </button>
                ))}
             </div>
          </div>
        )}

        {step === 'METHOD_SELECT' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-400">
             <div className="p-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 px-1 opacity-60">Contas Bancárias</p>
                <div className="space-y-2">
                    {PAYMENT_METHODS.map((method) => (
                       <button key={method} onClick={() => { setFormData({...formData, paymentMethod: method}); setStep('DETAILS'); }} className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-[5px] transition-all group">
                          <div className="flex items-center gap-5"><div className="w-12 h-12 bg-[#111] rounded-[5px] flex items-center justify-center">{getMethodIcon(method)}</div><span className="text-base font-black text-gray-300 group-hover:text-white">{method}</span></div>
                          {formData.paymentMethod === method && <Check className="text-green-500" size={18} strokeWidth={4} />}
                       </button>
                    ))}
                    <button onClick={() => { setFormData({...formData, paymentMethod: '' as any}); setStep('DETAILS'); }} className="w-full flex items-center justify-center p-5 text-[10px] font-black text-gray-500 uppercase border border-dashed border-white/5 rounded-[5px] mt-4">Remover método</button>
                </div>
             </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] space-y-10 p-10 animate-in fade-in zoom-in duration-700">
             <div className="w-40 h-40 bg-green-500 rounded-[5px] flex items-center justify-center animate-scale-in shadow-2xl shadow-green-900/50"><Check size={80} className="text-white" strokeWidth={6} /></div>
             <div className="text-center space-y-2">
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest opacity-60">Lançamento anotado</p>
                <h3 className="text-5xl font-black text-white tracking-tighter">R$ {formattedValue}</h3>
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
            setFormData(prev => ({...prev, description: suggestion.description!, category: suggestion.category! as Category, paymentMethod: (suggestion.paymentMethod as PaymentMethod) || ''}));
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