import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { AppNotification } from '../types.ts';

interface ToastProps {
    notification: AppNotification;
    onClose: (id: string) => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose, duration = 4000 }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(notification.id), 300);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={18} className="text-green-500" />;
            case 'error': return <AlertCircle size={18} className="text-red-500" />;
            case 'warning': return <AlertCircle size={18} className="text-yellow-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'success': return 'border-green-500/30 bg-[#0a0a0a]/95';
            case 'error': return 'border-red-500/30 bg-[#0a0a0a]/95';
            case 'warning': return 'border-yellow-500/30 bg-[#0a0a0a]/95';
            default: return 'border-blue-500/30 bg-[#0a0a0a]/95';
        }
    };

    return (
        <div
            className={`w-full max-w-[400px] pointer-events-auto transition-all duration-300 transform 
                ${isExiting ? 'opacity-0 -translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
                animate-in slide-in-from-top-4 duration-500`}
        >
            <div className={`p-4 rounded-[12px] border shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-start gap-3 ${getBgColor(notification.type)}`}>
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-white/5 shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                </div>
                <div className="flex-1 pr-6 min-w-0">
                    <h4 className="font-black tracking-tight text-white text-[13px] uppercase truncate">
                        {notification.title}
                    </h4>
                    <p className="text-gray-400 text-[11px] leading-snug mt-1 font-medium line-clamp-2">
                        {notification.message}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-1 text-gray-600 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-white/5 rounded-full overflow-hidden w-full">
                    <div
                        className={`h-full opacity-50 ${notification.type === 'success' ? 'bg-green-500' :
                                notification.type === 'error' ? 'bg-red-500' :
                                    notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                        style={{
                            animation: `toast-progress ${duration}ms linear forwards`
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default Toast;
