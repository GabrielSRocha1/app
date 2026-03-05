import React, { useState, useEffect } from 'react';
import { Users, Mail, Plus, Trash2, Check, X, ShieldCheck, Crown, UserCircle2, RefreshCcw, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface FamilyMembersProps {
    currentUserEmail: string;
    familyId: string;
    onAllowedEmailsChange: (emails: string[]) => void;
    onNotify?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const MAX_MEMBERS = 4;

const AVATAR_COLORS = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-emerald-600 to-teal-700',
    'from-orange-500 to-red-600',
];

const FamilyMembers: React.FC<FamilyMembersProps> = ({ currentUserEmail, familyId, onAllowedEmailsChange, onNotify }) => {
    const [members, setMembers] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Carrega membros do Supabase ao montar o componente
    useEffect(() => {
        loadMembersFromSupabase();
    }, [familyId]);

    const loadMembersFromSupabase = async () => {
        setIsLoading(true);
        try {
            const { data, error: supabaseError } = await supabase
                .from('family_members')
                .select('email, is_owner')
                .eq('family_id', familyId)
                .order('is_owner', { ascending: false }); // owner primeiro

            if (supabaseError) throw supabaseError;

            if (data && data.length > 0) {
                const emails = data.map((m: any) => m.email);
                setMembers(emails);
                onAllowedEmailsChange(emails);
            } else {
                // Família ainda sem membros no Supabase — adiciona o dono automaticamente
                const initialList = [currentUserEmail];
                setMembers(initialList);
                await saveToSupabase(initialList);
            }
        } catch (err: any) {
            console.error('Erro ao carregar membros:', err);
            // Fallback: ao menos mostra o próprio usuário
            setMembers([currentUserEmail]);
            if (onNotify) onNotify('Erro ao Carregar', 'Não foi possível carregar os membros da família do servidor.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const saveToSupabase = async (list: string[]) => {
        // Remove todos os membros atuais e reinsere (garante que a lista no Supabase é exatamente a local)
        await supabase.from('family_members').delete().eq('family_id', familyId);

        const rows = list.map(email => ({
            family_id: familyId,
            email,
            is_owner: email === currentUserEmail,
        }));

        const { error } = await supabase.from('family_members').insert(rows);
        if (error) throw error;
    };

    const handleAdd = async () => {
        const email = newEmail.toLowerCase().trim();
        setError('');

        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Digite um e-mail válido.');
            return;
        }
        if (members.includes(email)) {
            setError('Este e-mail já está na família.');
            return;
        }
        if (members.length >= MAX_MEMBERS) {
            setError(`Máximo de ${MAX_MEMBERS} membros permitidos.`);
            return;
        }

        const updated = [...members, email];
        setIsSaving(true);
        try {
            await saveToSupabase(updated);
            setMembers(updated);
            onAllowedEmailsChange(updated);
            setNewEmail('');
            setIsAdding(false);
            if (onNotify) onNotify('Membro Adicionado', `${email} foi adicionado e já pode acessar o app.`, 'success');
        } catch (err: any) {
            console.error('Erro ao adicionar membro:', err);
            setError('Erro ao salvar. Tente novamente.');
            if (onNotify) onNotify('Erro ao Adicionar', err.message || 'Não foi possível salvar.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (email: string) => {
        if (email === currentUserEmail) return; // não pode remover o dono
        const updated = members.filter(m => m !== email);
        setIsSaving(true);
        try {
            await saveToSupabase(updated);
            setMembers(updated);
            onAllowedEmailsChange(updated);
            if (onNotify) onNotify('Membro Removido', `${email} foi removido e não pode mais acessar o app.`, 'warning');
        } catch (err: any) {
            console.error('Erro ao remover membro:', err);
            if (onNotify) onNotify('Erro ao Remover', err.message || 'Não foi possível remover.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualSync = async () => {
        setIsSaving(true);
        try {
            await saveToSupabase(members);
            setSaveSuccess(true);
            if (onNotify) onNotify('Família Sincronizada', 'Os membros foram salvos com sucesso na nuvem.', 'success');
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err: any) {
            console.error('Erro ao sincronizar membros:', err);
            if (onNotify) onNotify('Erro de Sincronização', err.message || 'Não foi possível salvar os membros.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getInitial = (email: string) => email.charAt(0).toUpperCase();

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <header className="p-6 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[5px] bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
                        <Users size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white tracking-tight leading-none text-h3">Família</h1>
                        <p className="text-gray-600 uppercase tracking-widest text-h5">Membros com acesso • Supabase</p>
                    </div>
                </div>
                <button
                    onClick={handleManualSync}
                    disabled={isSaving || isLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-h5 uppercase tracking-widest transition-all active:scale-95
            ${saveSuccess
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20'}`}
                >
                    {isSaving
                        ? <RefreshCcw size={14} className="animate-spin" />
                        : saveSuccess
                            ? <Check size={14} strokeWidth={3} />
                            : <Save size={14} />}
                    {saveSuccess ? 'Salvo!' : 'Sincronizar'}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">

                {/* Loading state */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={32} className="text-blue-500 animate-spin" />
                        <p className="text-gray-600 uppercase tracking-widest text-h5">Carregando do Supabase...</p>
                    </div>
                ) : (
                    <>
                        {/* Contador */}
                        <div className="flex items-center justify-between px-1">
                            <p className="text-gray-600 uppercase tracking-widest text-h5">
                                {members.length} / {MAX_MEMBERS} membros
                            </p>
                            <div className="flex gap-1">
                                {Array.from({ length: MAX_MEMBERS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${i < members.length ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' : 'bg-white/10'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Lista de Membros */}
                        <div className="bg-[#111] rounded-[24px] border border-white/5 overflow-hidden divide-y divide-white/5">
                            {members.map((email, idx) => {
                                const isOwner = email === currentUserEmail;
                                const initial = getInitial(email);
                                const gradientClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                                return (
                                    <div key={email} className="flex items-center gap-4 p-5 group hover:bg-white/3 transition-colors">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-[5px] bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg shrink-0 font-bold text-white text-h3`}>
                                            {initial}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white text-h4 truncate">{email}</p>
                                                {isOwner && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] uppercase tracking-widest rounded-full border border-yellow-500/20 shrink-0">
                                                        <Crown size={9} />
                                                        Dono
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 text-h5 uppercase tracking-widest mt-0.5">
                                                {isOwner ? 'Conta principal' : `Membro ${idx}`}
                                            </p>
                                        </div>

                                        {/* Status / Remove */}
                                        {isOwner ? (
                                            <ShieldCheck size={18} className="text-blue-500 shrink-0" />
                                        ) : (
                                            <button
                                                onClick={() => handleRemove(email)}
                                                disabled={isSaving}
                                                className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-30"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Slots vazios */}
                        {members.length < MAX_MEMBERS && !isAdding && (
                            <div className="space-y-2">
                                {Array.from({ length: MAX_MEMBERS - members.length }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 p-5 bg-[#111] rounded-[24px] border border-dashed border-white/10"
                                    >
                                        <div className="w-12 h-12 rounded-[5px] bg-white/5 flex items-center justify-center shrink-0">
                                            <UserCircle2 size={24} className="text-gray-700" />
                                        </div>
                                        <p className="text-gray-700 text-h4 uppercase tracking-widest">Vaga disponível</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulário de adição */}
                        {isAdding && (
                            <div className="bg-[#111] p-5 rounded-[24px] border border-blue-500/30 space-y-4 animate-in slide-in-from-bottom duration-300">
                                <label className="text-gray-500 text-[10px] uppercase tracking-widest ml-1">E-mail do Novo Membro</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input
                                        autoFocus
                                        type="email"
                                        placeholder="nome@email.com"
                                        className="w-full bg-black/20 border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 text-white"
                                        value={newEmail}
                                        onChange={(e) => { setNewEmail(e.target.value); setError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-400 text-h5 uppercase tracking-widest ml-1">{error}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAdd}
                                        disabled={isSaving}
                                        className="flex-1 bg-blue-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 text-h5 uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                        {isSaving ? 'Salvando...' : 'Adicionar'}
                                    </button>
                                    <button
                                        onClick={() => { setIsAdding(false); setNewEmail(''); setError(''); }}
                                        className="px-5 py-4 bg-white/5 text-gray-500 rounded-xl border border-white/5 active:scale-95 transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Botão Adicionar */}
                        {members.length < MAX_MEMBERS && !isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="w-full py-5 border border-dashed border-blue-500/30 text-blue-400 rounded-[24px] flex items-center justify-center gap-3 hover:bg-blue-500/5 transition-all text-h5 uppercase tracking-widest active:scale-[0.98]"
                            >
                                <Plus size={18} /> Adicionar membro
                            </button>
                        )}

                        {/* Info Card */}
                        <div className="bg-blue-600/5 border border-blue-500/10 rounded-[24px] p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-blue-500" />
                                <p className="text-blue-400 text-h5 uppercase tracking-widest">Como funciona</p>
                            </div>
                            <ul className="space-y-1.5 text-gray-500 text-h5">
                                <li>• Máximo de <span className="text-white">4 membros</span> por família</li>
                                <li>• Todos compartilham as <span className="text-white">mesmas receitas e despesas</span></li>
                                <li>• Acesso verificado <span className="text-white">diretamente pelo Supabase</span></li>
                                <li>• Ao adicionar um membro, ele já pode acessar <span className="text-white">imediatamente</span></li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FamilyMembers;
