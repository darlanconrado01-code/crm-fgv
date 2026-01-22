
import React, { useState } from 'react';
import { 
  Inbox, 
  Pause, 
  CheckCircle, 
  Search, 
  Plus, 
  ChevronDown, 
  MessageSquare, 
  Clock, 
  Bot, 
  Users as UsersIcon,
  X,
  LayoutGrid,
  Maximize2,
  HelpCircle,
  MoreHorizontal,
  Download,
  Filter
} from 'lucide-react';
import ChatListItem from './ChatListItem';
import { ChatContact } from '../types';

const MOCK_CHATS: ChatContact[] = [
  {
    id: '1',
    name: 'Jessica Silva',
    lastMessage: 'Esse é presencial?',
    time: 'há cerca de 7 horas',
    agent: 'Jayana Pinheiro',
    sector: 'Comercial Ma',
    tags: ['MBAGFCA', '+5'],
    avatarUrl: 'https://picsum.photos/seed/jessica/100/100',
  },
  {
    id: '2',
    name: 'Leonardo',
    lastMessage: 'Ou posso fazer na cidade mais próxima?',
    time: 'há cerca de 9 horas',
    agent: 'Erika',
    sector: 'Comercial PA',
    tags: ['Nacional', 'Comercial Pará'],
    avatarUrl: 'https://picsum.photos/seed/leonardo/100/100',
    unreadCount: 4
  }
];

const AtendimentoView: React.FC = () => {
  const [activeTopTab, setActiveTopTab] = useState('inbox');
  const [activeSubTab, setActiveSubTab] = useState('atendimento');

  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden">
      {/* Left Sidebar (Chat List) */}
      <div className="w-[480px] bg-white flex flex-col border-r border-gray-200 overflow-hidden">
        {/* Top Header Tabs - Inbox, Pausados, Resolvidos, Busca */}
        <div className="flex border-b border-gray-100 h-16 shrink-0">
          <button 
            onClick={() => setActiveTopTab('inbox')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTopTab === 'inbox' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Download size={20} className={activeTopTab === 'inbox' ? 'scale-110' : ''} />
            <span className="text-[11px] font-bold">Inbox</span>
            {activeTopTab === 'inbox' && <div className="absolute bottom-0 w-[80%] h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTopTab('pausados')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTopTab === 'pausados' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Pause size={20} />
            <span className="text-[11px] font-bold">Pausados</span>
            {activeTopTab === 'pausados' && <div className="absolute bottom-0 w-[80%] h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTopTab('resolvidos')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTopTab === 'resolvidos' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <CheckCircle size={20} />
            <span className="text-[11px] font-bold">Resolvidos</span>
            {activeTopTab === 'resolvidos' && <div className="absolute bottom-0 w-[80%] h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTopTab('busca')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTopTab === 'busca' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Search size={20} />
            <span className="text-[11px] font-bold">Busca</span>
            {activeTopTab === 'busca' && <div className="absolute bottom-0 w-[80%] h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
        </div>

        {/* Action Bar - Novo, Switches, Setores */}
        <div className="p-4 border-b border-gray-50 flex items-center justify-between shrink-0">
          <button className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
            <Plus size={16} /> NOVO
          </button>
          
          <div className="flex items-center gap-4">
             {/* Switches from screenshot */}
             <div className="flex items-center gap-2">
               <UsersIcon size={18} className="text-gray-400" />
               <div className="w-10 h-5 bg-[#10b981] rounded-full relative cursor-pointer p-0.5">
                  <div className="absolute right-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
               </div>
             </div>
             
             <div className="flex items-center gap-2">
               <Filter size={18} className="text-gray-400" />
               <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer p-0.5">
                  <div className="absolute left-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
               </div>
             </div>

             <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 font-semibold hover:bg-gray-50">
                Setores <ChevronDown size={14} />
             </button>
          </div>
        </div>

        {/* Sub-tabs - ATENDIMENTO, AGUARDANDO, NO BOT, GRUPOS */}
        <div className="flex bg-white shrink-0">
          <button 
            onClick={() => setActiveSubTab('atendimento')}
            className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'atendimento' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <div className="relative mb-1">
              <MessageSquare size={22} />
              <span className="absolute -top-2 -right-3 bg-[#0ea5e9] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">21</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Atendimento</span>
            {activeSubTab === 'atendimento' && <div className="absolute bottom-0 w-full h-0.5 bg-blue-500" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('aguardando')}
            className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'aguardando' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Clock size={22} className="mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Aguardando</span>
            {activeSubTab === 'aguardando' && <div className="absolute bottom-0 w-full h-0.5 bg-blue-500" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('nobot')}
            className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'nobot' ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Bot size={22} className="mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">No Bot</span>
            {activeSubTab === 'nobot' && <div className="absolute bottom-0 w-full h-0.5 bg-blue-500" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('grupos')}
            className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'grupos' ? 'text-blue-500' : 'text-gray-400'}`}
          >
             <div className="relative mb-1">
              <UsersIcon size={22} />
              <span className="absolute -top-2 -right-2 bg-[#0ea5e9] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">1</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Grupos</span>
            {activeSubTab === 'grupos' && <div className="absolute bottom-0 w-full h-0.5 bg-blue-500" />}
          </button>
        </div>

        {/* Chat List Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {MOCK_CHATS.length > 0 ? (
            MOCK_CHATS.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
               <h4 className="font-bold text-gray-800 mb-1">Nada aqui!</h4>
               <p className="text-sm">Nenhum atendimento encontrado com esse status ou termo pesquisado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white flex flex-col relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-gray-50/50">
          <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-6">
                <X size={48} strokeWidth={1.5} />
             </div>
             <p className="text-gray-500 font-medium text-lg leading-relaxed">
               Selecione um atendimento para visualizar as mensagens e começar a conversar.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtendimentoView;
