
import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slide-up ${type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/30' : 'bg-red-900/90 text-red-100 border border-red-500/30'
            }`}>
            <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
};
