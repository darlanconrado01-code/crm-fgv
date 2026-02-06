
import React from 'react';
import {
    MessageSquare, User2, Clock, Bot, Users as UsersIcon,
    ChevronRight, MoreHorizontal, MessageCircle, Phone,
    Calendar, Zap, CheckCircle2, Pause
} from 'lucide-react';
import { ChatContact } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface ChatsKanbanViewProps {
    chats: ChatContact[];
    onSelectChat: (chat: ChatContact) => void;
}

const ChatCard: React.FC<{ chat: ChatContact, onClick: () => void }> = ({ chat, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer group active:scale-[0.98] overflow-hidden"
    >
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100 ${chat.isGroup ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                    <img
                        src={chat.avatarUrl}
                        alt={chat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=${chat.isGroup ? '10b981' : '3b82f6'}&color=fff`;
                        }}
                    />
                </div>
                <div className="min-w-0">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">{chat.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate">{chat.agent || 'Sem Agente'}</p>
                </div>
            </div>
            {chat.unreadCount ? (
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-white">
                    {chat.unreadCount}
                </span>
            ) : null}
        </div>

        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-3 group-hover:bg-white transition-colors">
            <p className="text-[10px] text-gray-500 italic line-clamp-2 leading-relaxed">
                {chat.lastMessage || 'Nenhuma mensagem recente'}
            </p>
        </div>

        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Clock size={12} /> {chat.time}
            </div>
            <div className="flex items-center gap-1.5">
                {chat.isGroup ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                        <UsersIcon size={12} /> GRUPO
                    </span>
                ) : (
                    <span className="text-blue-500 flex items-center gap-1">
                        <MessageSquare size={12} /> CHAT
                    </span>
                )}
            </div>
        </div>

        {/* Footer labels */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1">
            <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black border border-blue-100 uppercase">{chat.sector}</span>
            {chat.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-[8px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full font-black border border-gray-100 uppercase">{tag}</span>
            ))}
        </div>
    </div>
);

const ChatsKanbanView: React.FC<ChatsKanbanViewProps> = ({ chats, onSelectChat }) => {
    const columns = [
        { id: 'bot', title: 'Robôs / IA', icon: Bot, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
        { id: 'aguardando', title: 'Aguardando', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50' },
        { id: 'atendimento', title: 'Em Atendimento', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { id: 'grupos', title: 'Grupos', icon: UsersIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { id: 'concluido', title: 'Finalizados', icon: CheckCircle2, color: 'text-gray-500', bgColor: 'bg-gray-100' }
    ];

    const getChatsForColumn = (columnId: string) => {
        if (columnId === 'grupos') {
            return chats.filter(c => c.isGroup);
        }
        if (columnId === 'atendimento') {
            return chats.filter(c => !c.isGroup && (c.status === 'atendimento' || !c.status));
        }
        return chats.filter(c => !c.isGroup && (c.status === columnId || (columnId === 'concluido' && c.status === 'resolvido')));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        const chatId = e.dataTransfer.getData("chatId");
        if (!chatId) return;

        try {
            const chatRef = doc(db, "chats", chatId);
            const contactRef = doc(db, "contacts", chatId); // Also update contact

            const finalStatus = targetStatus === 'grupos' ? 'atendimento' : targetStatus;

            const updates: any = {
                status: finalStatus,
                updatedAt: serverTimestamp()
            };

            if (finalStatus === 'concluido') {
                updates.agent = null;
            }

            await Promise.all([
                updateDoc(chatRef, updates),
                updateDoc(contactRef, updates)
            ]);
        } catch (error) {
            console.error("Erro ao mover chat:", error);
        }
    };

    const handleDragStart = (e: React.DragEvent, chatId: string) => {
        e.dataTransfer.setData("chatId", chatId);
    };

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Kanban Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Fluxo de Atendimento</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gerencie seus leads e grupos em tempo real</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        {chats.length} Ativos
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-6 flex gap-6 no-scrollbar h-full">
                {columns.map((col) => {
                    const columnChats = getChatsForColumn(col.id);
                    return (
                        <div
                            key={col.id}
                            className="w-[320px] shrink-0 flex flex-col h-full bg-white/50 rounded-[2.5rem] border border-gray-200/50 p-4"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-6 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 ${col.bgColor} ${col.color} rounded-xl shadow-sm border border-white`}>
                                        <col.icon size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-800">{col.title}</h3>
                                        <p className="text-[9px] font-bold text-gray-400">{columnChats.length} cartões</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
                                {columnChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, chat.id)}
                                    >
                                        <ChatCard chat={chat} onClick={() => onSelectChat(chat)} />
                                    </div>
                                ))}

                                {columnChats.length === 0 && (
                                    <div className="h-32 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 gap-2">
                                        <Zap size={24} className="opacity-20" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Vazio</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
        </div>
    );
};

export default ChatsKanbanView;
