import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

interface ModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
}

interface NotificationContextType {
    notify: (message: string, type: NotificationType, duration?: number) => void;
    confirm: (options: ModalOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [modal, setModal] = useState<(ModalOptions & { resolve: (val: boolean) => void }) | null>(null);

    const notify = (message: string, type: NotificationType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications(prev => [...prev, { id, message, type, duration }]);

        if (type !== 'loading') {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
    };

    const confirm = (options: ModalOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setModal({ ...options, resolve });
        });
    };

    return (
        <NotificationContext.Provider value={{ notify, confirm }}>
            {children}

            {/* Notification Toasts Container */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`pointer-events-auto min-w-[320px] max-w-md p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-start gap-4 animate-in slide-in-from-right-10 duration-300 ${n.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' :
                                n.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' :
                                    n.type === 'warning' ? 'bg-amber-50/90 border-amber-100 text-amber-800' :
                                        'bg-blue-50/90 border-blue-100 text-blue-800'
                            }`}
                    >
                        <div className={`p-2 rounded-xl shrink-0 ${n.type === 'success' ? 'bg-emerald-500 text-white' :
                                n.type === 'error' ? 'bg-red-500 text-white' :
                                    n.type === 'warning' ? 'bg-amber-500 text-white' :
                                        'bg-blue-500 text-white'
                            }`}>
                            {n.type === 'success' && <CheckCircle2 size={18} />}
                            {n.type === 'error' && <AlertCircle size={18} />}
                            {n.type === 'warning' && <AlertTriangle size={18} />}
                            {n.type === 'info' && <Info size={18} />}
                            {n.type === 'loading' && <Loader2 size={18} className="animate-spin" />}
                        </div>
                        <div className="flex-1 pt-0.5">
                            <p className="text-sm font-bold leading-tight">{n.message}</p>
                        </div>
                        <button
                            onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                        >
                            <X size={16} className="opacity-40" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Standardized Beautiful Modal (Centered) */}
            {modal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${modal.type === 'danger' ? 'bg-red-50 text-red-500' :
                                    modal.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                                        'bg-blue-50 text-blue-500'
                                }`}>
                                {modal.type === 'danger' ? <AlertTriangle size={32} /> :
                                    modal.type === 'success' ? <CheckCircle2 size={32} /> :
                                        <Info size={32} />}
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-8">{modal.message}</p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    modal.resolve(false);
                                    setModal(null);
                                }}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                            >
                                {modal.cancelText || 'Cancelar'}
                            </button>
                            <button
                                onClick={() => {
                                    modal.resolve(true);
                                    setModal(null);
                                }}
                                className={`flex-[2] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 ${modal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                                        modal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' :
                                            'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                                    }`}
                            >
                                {modal.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within NotificationProvider');
    return context;
};
