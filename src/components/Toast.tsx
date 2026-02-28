import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface Toast {
    id: number;
    message: string;
    type: 'error' | 'success';
}

interface ToastContextType {
    showToast: (message: string, type?: 'error' | 'success') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container - Fixed at bottom */}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const bgColor = toast.type === 'error' ? 'bg-red-500' : 'bg-green-500';
    const Icon = toast.type === 'error' ? AlertCircle : CheckCircle;

    return (
        <div
            className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-slide-up`}
        >
            <Icon size={20} className="flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} className="p-1 hover:bg-white/20 rounded">
                <X size={16} />
            </button>
        </div>
    );
};

export default ToastProvider;
