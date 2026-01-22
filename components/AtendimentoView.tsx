
import React, { useState, useEffect } from 'react';
import {
  Pause, CheckCircle, Search, Plus, ChevronDown, MessageSquare,
  Clock, Bot, Users as UsersIcon, Download, Filter, Trash2, Activity
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import ChatListItem from './ChatListItem';
import ChatWindow from './ChatWindow';
import { ChatContact } from '../types';

const AtendimentoView: React.FC = () => {
  const [activeTopTab, setActiveTopTab] = useState('inbox');
  const [activeSubTab, setActiveSubTab] = useState('atendimento');
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatContact | null>(null);
  const [humans, setHumans] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList: ChatContact[] = snapshot.docs.map(doc => {
        const data = doc.data();
        let timeLabel = 'agora';
        if (data.updatedAt instanceof Timestamp) {
          const date = data.updatedAt.toDate();
          const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
          timeLabel = diff < 1 ? 'agora' : `há ${diff} min`;
        }
        return {
          id: doc.id,
          name: data.name || data.id,
          lastMessage: data.lastMessage || '',
          time: timeLabel,
          agent: data.agent || 'Sem Agente',
          sector: data.sector || 'Geral',
          tags: data.tags || [],
          avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${data.name || data.id}&background=random`,
          unreadCount: data.unreadCount || 0,
          status: data.status || 'atendimento',
          remoteJid: data.remoteJid || ''
        };
      });
      setChats(chatList);
      setLoading(false);
    });

    const qH = query(collection(db, "users"), orderBy("name", "asc"));
    const unsubH = onSnapshot(qH, (snapshot) => {
      setHumans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubH();
    };
  }, []);


  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden font-sans">
      <div className="w-[480px] bg-white flex flex-col border-r border-gray-200 overflow-hidden shadow-xl z-10 shrink-0">
        {/* Top Header Tabs */}
        <div className="flex border-b border-gray-100 h-16 shrink-0 bg-white">
          <button onClick={() => setActiveTopTab('inbox')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTopTab === 'inbox' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Download size={20} />
            <span className="text-[11px] font-black uppercase tracking-wider">Inbox</span>
            {activeTopTab === 'inbox' && <div className="absolute bottom-0 w-[60%] h-1 bg-blue-600 rounded-t-full" />}
          </button>
          <button onClick={() => setActiveTopTab('pausados')} className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${activeTopTab === 'pausados' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Pause size={20} />
            <span className="text-[11px] font-black uppercase tracking-wider">Pausados</span>
          </button>
          <button onClick={() => setActiveTopTab('resolvidos')} className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${activeTopTab === 'resolvidos' ? 'text-blue-600' : 'text-gray-400'}`}>
            <CheckCircle size={20} />
            <span className="text-[11px] font-black uppercase tracking-wider">Resolvidos</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-gray-50 flex items-center justify-between shrink-0 bg-[#fafafa]">
          <div className="flex gap-2">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95">
              <Plus size={18} /> NOVO
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UsersIcon size={18} className="text-gray-400" />
              <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer p-0.5 shadow-inner">
                <div className="absolute right-0.5 w-4 h-4 bg-white rounded-full shadow-md" />
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 font-bold hover:bg-white transition-all bg-transparent">
              Setores <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="flex bg-white shrink-0 border-b border-gray-50">
          <button onClick={() => setActiveSubTab('atendimento')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'atendimento' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className="relative mb-1">
              <MessageSquare size={24} strokeWidth={2.5} />
              {chats.filter(c => c.status === 'atendimento' || (!c.status && activeTopTab === 'inbox')).length > 0 &&
                <span className="absolute -top-2 -right-3 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black shadow-lg border-2 border-white">
                  {chats.filter(c => c.status === 'atendimento' || (!c.status && activeTopTab === 'inbox')).length}
                </span>
              }
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Atendimento</span>
            {activeSubTab === 'atendimento' && <div className="absolute bottom-0 w-full h-1 bg-blue-600" />}
          </button>

          <button onClick={() => setActiveSubTab('bot')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'bot' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className="relative mb-1">
              <Bot size={24} strokeWidth={2.5} />
              {chats.filter(c => c.status === 'bot').length > 0 &&
                <span className="absolute -top-2 -right-3 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black shadow-lg border-2 border-white">
                  {chats.filter(c => c.status === 'bot').length}
                </span>
              }
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Bot</span>
            {activeSubTab === 'bot' && <div className="absolute bottom-0 w-full h-1 bg-emerald-600" />}
          </button>

          <button onClick={() => setActiveSubTab('aguardando')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'aguardando' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Clock size={24} strokeWidth={2.5} className="mb-1" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Aguardando</span>
            {activeSubTab === 'aguardando' && <div className="absolute bottom-0 w-full h-1 bg-blue-600" />}
          </button>

          <button onClick={() => setActiveSubTab('equipe')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'equipe' ? 'text-blue-600' : 'text-gray-400'}`}>
            <UsersIcon size={24} strokeWidth={2.5} className="mb-1" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Equipe</span>
            {activeSubTab === 'equipe' && <div className="absolute bottom-0 w-full h-1 bg-blue-600" />}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : (
            activeSubTab === 'equipe' ? (
              <div className="p-4 space-y-4">
                {humans.map(h => (
                  <div key={h.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg">
                      {h.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm uppercase">{h.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{h.role || 'Agente'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              chats
                .filter(chat => {
                  if (activeTopTab === 'resolvidos') return chat.status === 'resolvido';
                  if (activeTopTab === 'pausados') return chat.status === 'pausado';
                  return chat.status === activeSubTab || (activeSubTab === 'atendimento' && !chat.status);
                })
                .map((chat) => (
                  <div key={chat.id} onClick={() => setSelectedChat(chat)} className={selectedChat?.id === chat.id ? 'bg-blue-50' : ''}>
                    <ChatListItem chat={chat} />
                  </div>
                ))
            )
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#f1f5f9] flex flex-col relative overflow-hidden">
        {selectedChat ? (
          <ChatWindow chatId={selectedChat.id} contactName={selectedChat.name} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
            <div className="max-w-md w-full bg-white rounded-[3rem] p-16 shadow-2xl border border-gray-100 flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-blue-500 mb-8 border-4 border-white shadow-xl rotate-3">
                <MessageSquare size={56} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-4 uppercase tracking-tight">Pronto para conversar?</h2>
              <p className="text-gray-400 font-medium text-sm leading-relaxed">Selecione um atendimento na lista ao lado para visualizar o histórico de mensagens e responder.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AtendimentoView;
