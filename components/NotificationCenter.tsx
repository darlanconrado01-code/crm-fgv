
import React, { useState, useEffect } from 'react';
import { Bell, X, User as UserIcon, MessageSquare, ExternalLink, Phone } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';

interface NotificationItem {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'mention' | 'task_update' | 'missed_call';
    taskId?: string;
    projectId?: string;
    senderName: string;
    senderPhone?: string;
    read: boolean;
    createdAt: any;
}

const NotificationCenter: React.FC<{ user: any }> = ({ user }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as NotificationItem));

            // Client-side sort to avoid index requirements
            items.sort((a, b) => {
                const tA = a.createdAt?.toMillis() || 0;
                const tB = b.createdAt?.toMillis() || 0;
                return tB - tA;
            });

            setNotifications(items);
            setUnreadCount(items.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), { read: true });
        } catch (e) {
            console.error("Error marking as read:", e);
        }
    };

    const handleNotificationClick = (n: NotificationItem) => {
        handleMarkAsRead(n.id);
        if (n.taskId) {
            window.dispatchEvent(new CustomEvent('navigateToTask', {
                detail: {
                    taskId: n.taskId,
                    projectId: n.projectId
                }
            }));
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group relative"
                title="Notificações"
            >
                <Bell size={22} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#003399] animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notificações</h3>
                        {unreadCount > 0 && (
                            <button className="text-[9px] font-black text-blue-600 uppercase hover:underline">Limpar tudo</button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-[10px] font-black text-gray-300 uppercase">Tudo limpo por aqui</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-4 border-b border-gray-50 hover:bg-blue-50/30 transition-all cursor-pointer relative group ${!n.read ? 'bg-blue-50/10' : ''}`}
                                >
                                    {!n.read && <div className="absolute top-5 left-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'missed_call' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {n.type === 'mention' && <MessageSquare size={16} />}
                                            {n.type === 'task_update' && <ExternalLink size={16} />}
                                            {n.type === 'missed_call' && <Phone size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-gray-800 leading-tight mb-1">
                                                <span className="text-blue-600">@{n.senderName}</span> {n.message}
                                            </p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">
                                                {n.createdAt && new Date(n.createdAt.toMillis()).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
