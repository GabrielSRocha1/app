import React from 'react';
import { X, CheckCheck, Trash2, Bell, ShieldCheck, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { AppNotification } from '../types.ts';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
    onMarkAllAsRead: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
    isOpen, onClose, notifications, onMarkAsRead, onDelete, onClearAll, onMarkAllAsRead
}) => {
    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={20} className="text-green-500" />;
            case 'error': return <AlertCircle size={20} className="text-red-500" />;
            case 'warning': return <AlertCircle size={20} className="text-yellow-500" />;
            default: return <Info size={20} className="text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-green-500/10 border-green-500/20';
            case 'error': return 'bg-red-500/10 border-red-500/20';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="absolute inset-0 z-[200] flex justify-end">
            {/* Backdrop para fechar ao clicar fora, animado por Tailwind */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-[340px] max-w-[85vw] h-full bg-[#0a0a0a] border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/90 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-white" />
                        <h2 className="text-h3 text-white">Notificações</h2>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
                    {notifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <ShieldCheck size={48} className="text-gray-600 mb-4" />
                            <p className="text-h4 text-gray-500 uppercase tracking-widest font-black">Tudo em dia</p>
                            <p className="text-h5 text-gray-600 mt-2">Nenhum aviso novo por aqui.</p>
                        </div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-[16px] border transition-all duration-300 relative group overflow-hidden ${notification.isRead
                                        ? 'bg-[#111] border-white/5 opacity-70'
                                        : `${getBgColor(notification.type)}`
                                    }`}
                            >
                                {!notification.isRead && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                                )}

                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center bg-[#0a0a0a]/50 shrink-0`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 pr-6">
                                        <h4 className={`font-black tracking-tight mb-1 ${notification.isRead ? 'text-gray-300' : 'text-white'}`}>
                                            {notification.title}
                                        </h4>
                                        <p className={`text-h5 leading-relaxed ${notification.isRead ? 'text-gray-500' : 'text-gray-300'}`}>
                                            {notification.message}
                                        </p>
                                        <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest block mt-3">
                                            {new Date(notification.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' às')}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Hover - Aparece no Desktop ao passar mouse ou sempre em mobile num menu */}
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => onMarkAsRead(notification.id)}
                                            className="p-2 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                                            title="Marcar como lida"
                                        >
                                            <CheckCheck size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDelete(notification.id)}
                                        className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                {notifications.length > 0 && (
                    <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl absolute bottom-0 left-0 right-0 space-y-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="w-full py-3 bg-[#111] border border-white/5 text-gray-300 rounded-[12px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <CheckCheck size={16} /> Marcar todas como lidas
                            </button>
                        )}
                        <button
                            onClick={onClearAll}
                            className="w-full py-3 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-[12px] flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <Trash2 size={16} /> Limpar histórico
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default NotificationsPanel;
