import React, { useMemo, useState } from 'react';
import {
    ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Wallet, Landmark, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight,
    Calendar
} from 'lucide-react';
import { Transaction, TransactionType } from '../types.ts';

interface MonthDetailsProps {
    transactions: Transaction[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onClose: () => void;
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtShort = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}K` : `R$ ${v.toFixed(0)}`;

const SEMESTER_A = [0, 1, 2, 3, 4, 5];   // Jan–Jun
const SEMESTER_B = [6, 7, 8, 9, 10, 11]; // Jul–Dez
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type Section = 'overview' | 'cashflow' | 'payments' | 'banks';

const MonthDetails: React.FC<MonthDetailsProps> = ({ transactions, currentMonth, onMonthChange, onClose }) => {
    const [activeSection, setActiveSection] = useState<Section>('overview');

    const today = useMemo(() => new Date(), []);
    const minDate = useMemo(() => new Date(today.getFullYear() - 3, today.getMonth(), 1), [today]);
    const maxDate = useMemo(() => new Date(today.getFullYear() + 3, today.getMonth(), 1), [today]);

    const currentYear = currentMonth.getFullYear();
    const currentMon = currentMonth.getMonth();

    // ─── Filtrar mês atual ───────────────────────────────────
    const monthTxs = useMemo(() =>
        transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMon && d.getFullYear() === currentYear;
        }), [transactions, currentMon, currentYear]);

    const totalIncome = useMemo(() => monthTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0), [monthTxs]);
    const totalExpense = useMemo(() => monthTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0), [monthTxs]);
    const balance = totalIncome - totalExpense;

    // ─── Fluxo Semestral ─────────────────────────────────────
    const semesterActive = currentMon < 6 ? SEMESTER_A : SEMESTER_B;
    const semesterData = useMemo(() =>
        semesterActive.map(mi => {
            const filtered = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === mi && d.getFullYear() === currentYear;
            });
            return {
                label: MONTH_NAMES[mi],
                monthIndex: mi,
                income: filtered.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0),
                expense: filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0),
                active: mi === currentMon
            };
        }), [transactions, semesterActive, currentYear, currentMon]);

    const maxSem = useMemo(() => Math.max(...semesterData.flatMap(d => [d.income, d.expense]), 1), [semesterData]);

    // ─── Métodos de Pagamento ────────────────────────────────
    const paymentMethodStats = useMemo(() => {
        const map = new Map<string, { income: number; expense: number; count: number }>();
        monthTxs.forEach(t => {
            const method = t.paymentMethod || 'Não informado';
            const prev = map.get(method) || { income: 0, expense: 0, count: 0 };
            map.set(method, {
                income: prev.income + (t.type === TransactionType.INCOME ? t.amount : 0),
                expense: prev.expense + (t.type === TransactionType.EXPENSE ? t.amount : 0),
                count: prev.count + 1
            });
        });
        return Array.from(map.entries())
            .map(([method, data]) => ({ method, ...data, total: data.income + data.expense }))
            .sort((a, b) => b.total - a.total);
    }, [monthTxs]);

    const totalMethodVolume = paymentMethodStats.reduce((s, m) => s + m.total, 0) || 1;

    // ─── Movimentação Bancária ───────────────────────────────
    const bankStats = useMemo(() => {
        const map = new Map<string, { income: number; expense: number; count: number }>();
        monthTxs.forEach(t => {
            const bank = t.bank || 'Sem banco';
            const prev = map.get(bank) || { income: 0, expense: 0, count: 0 };
            map.set(bank, {
                income: prev.income + (t.type === TransactionType.INCOME ? t.amount : 0),
                expense: prev.expense + (t.type === TransactionType.EXPENSE ? t.amount : 0),
                count: prev.count + 1
            });
        });
        return Array.from(map.entries())
            .map(([bank, data]) => ({ bank, ...data, total: data.income + data.expense }))
            .sort((a, b) => b.total - a.total);
    }, [monthTxs]);

    const totalBankVolume = bankStats.reduce((s, b) => s + b.total, 0) || 1;

    // ─── Navegação de meses ──────────────────────────────────
    const visibleMonths = useMemo(() => {
        const months = [];
        for (let i = -1; i <= 1; i++) {
            const d = new Date(currentYear, currentMon + i, 1);
            if (d >= minDate && d <= maxDate) months.push({ label: MONTH_NAMES[d.getMonth()], date: d });
        }
        return months;
    }, [currentMonth, minDate, maxDate]);

    const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Resumo', icon: <BarChart3 size={14} /> },
        { id: 'cashflow', label: 'Semestre', icon: <TrendingUp size={14} /> },
        { id: 'payments', label: 'Pagamentos', icon: <CreditCard size={14} /> },
        { id: 'banks', label: 'Bancos', icon: <Landmark size={14} /> },
    ];

    const monthTitle = `${FULL_MONTH_NAMES[currentMon]} ${currentYear}`;

    return (
        <div className="absolute inset-0 z-[80] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-400">
            {/* Header */}
            <header className="flex items-center gap-3 p-5 border-b border-white/5 shrink-0">
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-[10px] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-white tracking-tight text-h3 leading-none">Detalhes do Mês</h1>
                    <p className="text-gray-600 uppercase tracking-widest text-[10px] mt-0.5">{monthTitle}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { const d = new Date(currentYear, currentMon - 1, 1); if (d >= minDate) onMonthChange(d); }}
                        disabled={currentMonth <= minDate}
                        className="w-9 h-9 bg-white/5 rounded-[8px] flex items-center justify-center text-gray-500 active:scale-90 disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => { const d = new Date(currentYear, currentMon + 1, 1); if (d <= maxDate) onMonthChange(d); }}
                        disabled={currentMonth >= maxDate}
                        className="w-9 h-9 bg-white/5 rounded-[8px] flex items-center justify-center text-gray-500 active:scale-90 disabled:opacity-20 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </header>

            {/* Month pills */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 shrink-0">
                {visibleMonths.map((m, i) => {
                    const isActive = m.date.getMonth() === currentMon && m.date.getFullYear() === currentYear;
                    return (
                        <button
                            key={i}
                            onClick={() => onMonthChange(m.date)}
                            className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 text-gray-600'}`}
                        >
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center gap-1 px-4 pb-3 shrink-0 overflow-x-auto no-scrollbar">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all ${activeSection === item.id
                                ? 'bg-white/10 text-white'
                                : 'text-gray-600 hover:text-gray-400'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8 px-4 space-y-4">

                {/* ─── RESUMO ─────────────────────────────────────────── */}
                {activeSection === 'overview' && (
                    <div className="space-y-4 animate-in fade-in duration-400">
                        {/* Cards de totais */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#111] p-5 rounded-[20px] border border-green-500/20 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-500/10 rounded-[8px] flex items-center justify-center">
                                        <ArrowUpRight size={16} className="text-green-500" />
                                    </div>
                                    <span className="text-gray-500 uppercase tracking-widest text-[9px]">Receitas</span>
                                </div>
                                <p className="text-green-500 font-black tracking-tighter text-h3">{fmt(totalIncome)}</p>
                                <p className="text-gray-700 text-[9px] uppercase tracking-widest">{monthTxs.filter(t => t.type === TransactionType.INCOME).length} lançamentos</p>
                            </div>
                            <div className="bg-[#111] p-5 rounded-[20px] border border-red-500/20 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-500/10 rounded-[8px] flex items-center justify-center">
                                        <ArrowDownRight size={16} className="text-red-500" />
                                    </div>
                                    <span className="text-gray-500 uppercase tracking-widest text-[9px]">Despesas</span>
                                </div>
                                <p className="text-red-500 font-black tracking-tighter text-h3">{fmt(totalExpense)}</p>
                                <p className="text-gray-700 text-[9px] uppercase tracking-widest">{monthTxs.filter(t => t.type === TransactionType.EXPENSE).length} lançamentos</p>
                            </div>
                        </div>

                        {/* Saldo */}
                        <div className={`p-5 rounded-[20px] border flex items-center justify-between ${balance >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div>
                                <p className="text-gray-500 uppercase tracking-widest text-[9px]">Saldo do mês</p>
                                <p className={`font-black tracking-tighter text-h2 mt-1 ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(balance)}</p>
                            </div>
                            <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center ${balance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {balance >= 0 ? <TrendingUp size={28} className="text-green-500" /> : <TrendingDown size={28} className="text-red-500" />}
                            </div>
                        </div>

                        {/* Proporção Receita vs Despesa */}
                        {(totalIncome > 0 || totalExpense > 0) && (
                            <div className="bg-[#111] p-5 rounded-[20px] border border-white/5 space-y-4">
                                <p className="text-gray-500 uppercase tracking-widest text-[9px]">Proporção do Mês</p>
                                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                                    {totalIncome > 0 && (
                                        <div
                                            className="bg-green-500 rounded-l-full transition-all duration-700"
                                            style={{ width: `${(totalIncome / (totalIncome + totalExpense)) * 100}%` }}
                                        />
                                    )}
                                    {totalExpense > 0 && (
                                        <div
                                            className="bg-red-500 rounded-r-full transition-all duration-700"
                                            style={{ width: `${(totalExpense / (totalIncome + totalExpense)) * 100}%` }}
                                        />
                                    )}
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest">
                                    <span className="text-green-500">{totalIncome > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(1) : 0}% Receitas</span>
                                    <span className="text-red-500">{totalExpense > 0 ? ((totalExpense / (totalIncome + totalExpense)) * 100).toFixed(1) : 0}% Despesas</span>
                                </div>
                            </div>
                        )}

                        {/* Lista resumida de transações */}
                        <div className="bg-[#111] rounded-[20px] border border-white/5 divide-y divide-white/5">
                            <div className="px-5 py-3 flex items-center gap-2">
                                <Calendar size={12} className="text-gray-600" />
                                <span className="text-gray-500 uppercase tracking-widest text-[9px]">Últimos lançamentos</span>
                            </div>
                            {monthTxs.slice(0, 6).map(t => (
                                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-[12px] font-semibold truncate max-w-[180px]">{t.description || t.category}</p>
                                        <p className="text-gray-700 text-[9px] uppercase tracking-widest">{t.category} · {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                    <span className={`font-black text-[12px] ${t.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
                                        {t.type === TransactionType.INCOME ? '+' : '-'} {fmt(t.amount)}
                                    </span>
                                </div>
                            ))}
                            {monthTxs.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-gray-700 uppercase tracking-widest text-[10px]">Nenhum lançamento neste mês</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── FLUXO SEMESTRAL ────────────────────────────────── */}
                {activeSection === 'cashflow' && (
                    <div className="space-y-4 animate-in fade-in duration-400">
                        <div className="bg-[#111] p-5 rounded-[20px] border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-bold tracking-tight text-h4">Fluxo Semestral</p>
                                    <p className="text-gray-600 uppercase tracking-widest text-[9px] mt-0.5">
                                        {currentMon < 6 ? 'Janeiro – Junho' : 'Julho – Dezembro'} de {currentYear}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest">
                                    <span className="flex items-center gap-1 text-green-500"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Receita</span>
                                    <span className="flex items-center gap-1 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Despesa</span>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico de barras semestral */}
                        <div className="bg-[#111] p-5 rounded-[20px] border border-white/5">
                            <div className="flex items-end gap-2 h-[180px] mb-4">
                                {semesterData.map((bar, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                                        <div className="flex-1 flex flex-col justify-end gap-0.5 w-full">
                                            {/* Receita bar */}
                                            <div
                                                className={`w-full rounded-t-[6px] transition-all duration-700 ${bar.active ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-green-500/40'}`}
                                                style={{ height: `${(bar.income / maxSem) * 100}%`, minHeight: bar.income > 0 ? '4px' : '0' }}
                                            />
                                            {/* Despesa bar */}
                                            <div
                                                className={`w-full rounded-b-[6px] transition-all duration-700 ${bar.active ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'bg-red-500/40'}`}
                                                style={{ height: `${(bar.expense / maxSem) * 100}%`, minHeight: bar.expense > 0 ? '4px' : '0' }}
                                            />
                                        </div>
                                        <span className={`text-[9px] uppercase tracking-wide font-bold ${bar.active ? 'text-white' : 'text-gray-700'}`}>{bar.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Tabela de valores */}
                            <div className="border-t border-white/5 pt-4 space-y-2">
                                {semesterData.filter(b => b.income > 0 || b.expense > 0).map((bar, i) => (
                                    <div key={i} className={`flex items-center py-2 px-3 rounded-[10px] ${bar.active ? 'bg-white/5' : ''}`}>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold w-10 ${bar.active ? 'text-white' : 'text-gray-600'}`}>{bar.label}</span>
                                        <div className="flex-1 flex gap-2">
                                            <span className="text-green-500 text-[10px] font-bold">{fmtShort(bar.income)}</span>
                                            <span className="text-gray-800 text-[10px]">/</span>
                                            <span className="text-red-500 text-[10px] font-bold">{fmtShort(bar.expense)}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${bar.income >= bar.expense ? 'text-green-500' : 'text-red-500'}`}>
                                            {fmt(bar.income - bar.expense)}
                                        </span>
                                    </div>
                                ))}
                                {semesterData.every(b => b.income === 0 && b.expense === 0) && (
                                    <p className="text-center text-gray-700 uppercase tracking-widest text-[9px] py-4">Sem lançamentos neste semestre</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── MÉTODOS DE PAGAMENTO ───────────────────────────── */}
                {activeSection === 'payments' && (
                    <div className="space-y-4 animate-in fade-in duration-400">
                        <div className="bg-[#111] p-5 rounded-[20px] border border-white/5">
                            <p className="text-white font-bold tracking-tight text-h4">Métodos de Pagamento</p>
                            <p className="text-gray-600 uppercase tracking-widest text-[9px] mt-0.5">
                                {FULL_MONTH_NAMES[currentMon]} {currentYear}
                            </p>
                        </div>

                        {paymentMethodStats.length === 0 ? (
                            <div className="bg-[#111] p-10 rounded-[20px] border border-white/5 text-center">
                                <p className="text-gray-700 uppercase tracking-widest text-[9px]">Nenhum método registrado neste mês</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {paymentMethodStats.map((m, i) => {
                                    const pct = (m.total / totalMethodVolume) * 100;
                                    return (
                                        <div key={i} className="bg-[#111] p-5 rounded-[20px] border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-blue-500/10 rounded-[10px] flex items-center justify-center">
                                                        <Wallet size={16} className="text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-[12px]">{m.method}</p>
                                                        <p className="text-gray-700 text-[9px] uppercase tracking-widest">{m.count} transações</p>
                                                    </div>
                                                </div>
                                                <span className="text-white font-black text-[12px]">{pct.toFixed(1)}%</span>
                                            </div>

                                            {/* Barra de progresso */}
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            {/* Receita e Despesa */}
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <ArrowUpRight size={11} className="text-green-500" />
                                                    <span className="text-green-500 text-[10px] font-bold">{fmt(m.income)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <ArrowDownRight size={11} className="text-red-500" />
                                                    <span className="text-red-500 text-[10px] font-bold">{fmt(m.expense)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── BANCOS ─────────────────────────────────────────── */}
                {activeSection === 'banks' && (
                    <div className="space-y-4 animate-in fade-in duration-400">
                        <div className="bg-[#111] p-5 rounded-[20px] border border-white/5">
                            <p className="text-white font-bold tracking-tight text-h4">Movimentação Bancária</p>
                            <p className="text-gray-600 uppercase tracking-widest text-[9px] mt-0.5">
                                Entradas e saídas por banco — {FULL_MONTH_NAMES[currentMon]} {currentYear}
                            </p>
                        </div>

                        {bankStats.length === 0 ? (
                            <div className="bg-[#111] p-10 rounded-[20px] border border-white/5 text-center">
                                <p className="text-gray-700 uppercase tracking-widest text-[9px]">Nenhuma movimentação bancária neste mês</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bankStats.map((b, i) => {
                                    const pct = (b.total / totalBankVolume) * 100;
                                    const netBalance = b.income - b.expense;
                                    return (
                                        <div key={i} className="bg-[#111] p-5 rounded-[20px] border border-white/5 space-y-4">
                                            {/* Header do banco */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-[10px] flex items-center justify-center">
                                                        <Landmark size={18} className="text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-[13px]">{b.bank}</p>
                                                        <p className="text-gray-700 text-[9px] uppercase tracking-widest">{b.count} movimentos · {pct.toFixed(1)}% do volume</p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-[8px] text-[10px] font-black uppercase tracking-widest ${netBalance >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {netBalance >= 0 ? '+' : ''}{fmt(netBalance)}
                                                </div>
                                            </div>

                                            {/* Barras lado a lado */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] text-gray-600 uppercase w-14 text-right shrink-0">Recebeu</span>
                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${b.total > 0 ? (b.income / b.total) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-green-500 text-[10px] font-bold shrink-0 w-20 text-right">{fmt(b.income)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] text-gray-600 uppercase w-14 text-right shrink-0">Pagou</span>
                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${b.total > 0 ? (b.expense / b.total) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-red-500 text-[10px] font-bold shrink-0 w-20 text-right">{fmt(b.expense)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default MonthDetails;
