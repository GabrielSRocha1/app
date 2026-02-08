
import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowRight, Loader2, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const ALLOWED_EMAILS = [
  'gabrielsrocha1017@gmail.com',
  'danielsrocha7@gmail.com',
  'user3@example.com', // Placeholder para o 3º email
  'user4@example.com'  // Placeholder para o 4º email
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulação de delay para feedback visual
    setTimeout(() => {
      const lowerEmail = email.toLowerCase().trim();
      if (ALLOWED_EMAILS.includes(lowerEmail)) {
        onLogin(lowerEmail);
      } else {
        setError('Acesso restrito. Este email não possui permissão.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 z-[200] animate-in fade-in duration-700">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-sm space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/40 animate-scale-in">
            <ShieldCheck size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter">ZenFinanceiro</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 opacity-60">Acesso Restrito / IA Multimodal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Email Cadastrado</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="seu@email.com" 
                required
                className="w-full bg-[#111] border border-white/5 rounded-[18px] py-5 pl-14 pr-6 text-white font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 animate-pulse">
                {error}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !email}
            className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-[18px] text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-900/40 disabled:opacity-20"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>Entrar <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-gray-700">
          <Lock size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest">Conexão Segura Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
