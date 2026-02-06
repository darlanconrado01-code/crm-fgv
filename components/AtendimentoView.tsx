
import React, { useState, useEffect } from 'react';
import {
  Pause, CheckCircle, Search, Plus, ChevronDown, MessageSquare,
  Clock, Bot, Users as UsersIcon, Download, Filter, Trash2, Activity, User2, LayoutGrid, ClipboardList, X, Phone
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, getDocs, writeBatch, doc, deleteDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import ChatListItem from './ChatListItem';
import ChatWindow from './ChatWindow';
import ChatsKanbanView from './ChatsKanbanView';
import { ChatContact } from '../types';
import { useNotification } from './Notification';
import { format, isToday, isYesterday, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtendimentoViewProps {
  user: any;
}

const AtendimentoView: React.FC<AtendimentoViewProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'chats' | 'bot' | 'aguardado' | 'grupos' | 'resolvido' | 'tarefas'>('chats');
  const [showResolved, setShowResolved] = useState(false); // New state for toggling resolved view
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatContact | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'chats_kanban'>('classic');
  const [filterScope, setFilterScope] = useState<'all' | 'mine'>(() => {
    const saved = localStorage.getItem('atendimento_filter_pref');
    if (saved === 'all' || saved === 'mine') return saved;
    return user?.role === 'admin' ? 'all' : 'mine';
  });

  useEffect(() => {
    localStorage.setItem('atendimento_filter_pref', filterScope);
  }, [filterScope]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [attendants, setAttendants] = useState<any[]>([]);
  const [selectedAttendant, setSelectedAttendant] = useState<string | null>(null);
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [showAttendantDropdown, setShowAttendantDropdown] = useState(false);

  // New Contact Modal
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatData, setNewChatData] = useState({ name: '', phone: '', message: '' });
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  const { notify } = useNotification();

  const isAdmin = user?.role === 'admin';
  const userName = user?.displayName || user?.name || '';

  const [contactsMap, setContactsMap] = useState<Record<string, any>>({});
  const [rawChats, setRawChats] = useState<any[]>([]);
  const [rawTasks, setRawTasks] = useState<any[]>([]);

  useEffect(() => {
    // 1. Subscribe to Chats
    const qChats = query(collection(db, "chats"));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const tA = a.data().updatedAt instanceof Timestamp ? a.data().updatedAt.toMillis() : 0;
        const tB = b.data().updatedAt instanceof Timestamp ? b.data().updatedAt.toMillis() : 0;
        return tB - tA;
      });
      setRawChats(sortedDocs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Subscribe to Tasks
    const qTasks = query(collection(db, "tasks"));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const tA = a.data().createdAt instanceof Timestamp ? a.data().createdAt.toMillis() : 0;
        const tB = b.data().createdAt instanceof Timestamp ? b.data().createdAt.toMillis() : 0;
        return tB - tA;
      });
      setRawTasks(sortedDocs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Subscribe to Contacts (for name sync)
    const qContacts = query(collection(db, "contacts"));
    const unsubContacts = onSnapshot(qContacts, (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setContactsMap(map);
    });

    return () => {
      unsubChats();
      unsubTasks();
      unsubContacts();
    };
  }, []);

  // 3. Merge Chats and Tasks with Contact Data
  useEffect(() => {
    const chatList: ChatContact[] = rawChats.map(data => {
      const contact = contactsMap[data.id] || {};

      let timeLabel = '';
      if (data.updatedAt instanceof Timestamp) {
        const date = data.updatedAt.toDate();
        if (isToday(date)) timeLabel = format(date, 'HH:mm');
        else if (isYesterday(date)) timeLabel = 'Ontem';
        else if (isSameWeek(date, new Date())) {
          const wd = format(date, 'eeee', { locale: ptBR });
          timeLabel = wd.charAt(0).toUpperCase() + wd.slice(1).split('-')[0];
        } else {
          timeLabel = format(date, 'dd/MM/yyyy');
        }
      }
      const isGroup = data.isGroup || data.id.includes('@g.us') || (data.remoteJid && data.remoteJid.includes('@g.us'));

      // Prioritize Name from Contacts > Chat Display > ID
      const finalName = contact.name || data.displayPhone || data.name || data.id;
      const finalAvatar = contact.avatarUrl || data.avatarUrl || `https://ui-avatars.com/api/?name=${finalName}&background=random`;

      return {
        id: data.id,
        name: finalName, // Syncs with Contact
        lastMessage: data.lastMessage || '',
        time: timeLabel,
        agent: data.agent || 'Sem Agente',
        sector: data.sector || 'Geral',
        tags: contact.tags || data.tags || [], // Also sync tags
        avatarUrl: finalAvatar,
        unreadCount: data.unreadCount || 0,
        status: data.status || 'atendimento',
        remoteJid: data.remoteJid || '',
        isGroup: !!isGroup,
        isTask: false
      };
    });

    const taskList: ChatContact[] = rawTasks.map(data => {
      let timeLabel = '';
      const lastActivity = data.updatedAt || data.createdAt;
      if (lastActivity instanceof Timestamp) {
        const date = lastActivity.toDate();
        if (isToday(date)) timeLabel = format(date, 'HH:mm');
        else if (isYesterday(date)) timeLabel = 'Ontem';
        else if (isSameWeek(date, new Date())) {
          const wd = format(date, 'eeee', { locale: ptBR });
          timeLabel = wd.charAt(0).toUpperCase() + wd.slice(1).split('-')[0];
        } else {
          timeLabel = format(date, 'dd/MM/yyyy');
        }
      }

      return {
        id: data.id,
        name: data.title,
        lastMessage: data.comments?.length ? `💬 ${data.comments[data.comments.length - 1].content}` : (data.description || 'Sem descrição'),
        time: timeLabel,
        agent: data.responsible || 'Sem Responsável',
        sector: 'Tarefas', // Special sector for Tasks
        tags: ['Tarefa'],
        avatarUrl: data.coverUrl || `https://ui-avatars.com/api/?name=${data.title}&background=random&color=0ea5e9`,
        unreadCount: 0, // Implement read status for tasks later
        status: data.status === 'completed' ? 'concluido' : 'atendimento',
        remoteJid: '',
        isGroup: false,
        isTask: true,
        // Extra fields for tasks if needed in ChatWindow
        responsibleId: data.responsibleId
      };
    });

    setChats([...chatList, ...taskList]);
    setLoading(false);
  }, [rawChats, rawTasks, contactsMap]);

  useEffect(() => {
    // Fetch Sectors
    const loadSectors = async () => {
      const snap = await getDocs(collection(db, "sectors"));
      setSectors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadSectors();

    // Fetch Attendants (for Admin)
    if (isAdmin) {
      const loadAttendants = async () => {
        const snap = await getDocs(collection(db, "users"));
        setAttendants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      loadAttendants();
    }
  }, [isAdmin]);

  const filteredChats = chats.filter(chat => {
    // Focus Mode
    // Focus Mode (Skip for Groups to show all company groups)
    if (activeSubTab !== 'grupos' && activeSubTab !== 'tarefas') {
      if (filterScope === 'mine') {
        if (chat.agent !== userName) return false;
      } else if (!isAdmin) {
        // Normal Mode for Attendant
        if (chat.agent !== userName && chat.agent !== 'Sem Agente') return false;
      }
    }

    // Sector Filter
    if (selectedSector && chat.sector !== selectedSector) return false;

    // Attendant Filter (Admin only)
    if (isAdmin && selectedAttendant && chat.agent !== selectedAttendant) return false;

    // Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = chat.name.toLowerCase().includes(term);
      const matchesPhone = chat.id.includes(term);
      // const matchesMessage = chat.lastMessage.toLowerCase().includes(term); // Only matches last message
      if (!matchesName && !matchesPhone) return false;
      // Note: Full message search requires server-side implementation or client-side indexing of all messages which is heavy. 
      // For now, searching by name/phone is standard.
    }

    // Sub-tab filtering
    if (activeSubTab === 'bot') return chat.status === 'bot';

    if (activeSubTab === 'aguardado') {
      return chat.status === 'aguardando';
    }

    // Logic for Chats and Groups with Resolved Toggle
    const isResolved = chat.status === 'concluido' || chat.status === 'resolvido';

    if (activeSubTab === 'chats') {
      if (chat.isGroup || chat.isTask) return false;
      return showResolved ? isResolved : !isResolved && (chat.status === 'atendimento' || !chat.status || (chat.status === 'aguardando' && (chat.unreadCount || 0) > 0));
    }

    if (activeSubTab === 'grupos') {
      if (!chat.isGroup) return false;
      // Typically groups are always 'active', but if we have resolved groups, show them only when toggled
      return showResolved ? isResolved : !isResolved;
    }

    if (activeSubTab === 'tarefas') {
      if (!chat.isTask) return false;

      // Filter: Only tasks the user is participating in (Responsible)
      // Allow Admin to see all if scope is 'all', otherwise strict
      if (isAdmin && filterScope === 'all') {
        return showResolved ? isResolved : !isResolved;
      }

      const isResponsibleId = chat.responsibleId && (chat.responsibleId === (user.uid || user.id));
      const isResponsibleName = chat.agent === userName;

      if (!isResponsibleId && !isResponsibleName) return false;

      return showResolved ? isResolved : !isResolved;
    }

    // Legacy fallback
    if (activeSubTab === 'resolvido') return isResolved;

    return true;
  });

  useEffect(() => {
    const handleSelectChat = (e: any) => {
      const { chatId } = e.detail;
      if (chatId) {
        const targetChat = chats.find(c => c.id === chatId);
        if (targetChat) {
          setSelectedChat(targetChat);
          if (targetChat.status === 'bot') setActiveSubTab('bot');
          else if (targetChat.status === 'aguardando') setActiveSubTab('aguardado');
          else if (targetChat.status === 'resolvido' || targetChat.status === 'concluido') setActiveSubTab('resolvido');
          else if (targetChat.isGroup) setActiveSubTab('grupos');
          else if (targetChat.isTask) setActiveSubTab('tarefas');
          else setActiveSubTab('chats');
          // Ao selecionar chat por evento (ex: Busca), volta pro modo clássico
          setViewMode('classic');
        } else {
          setSelectedChat({ id: chatId, name: 'Buscando...' } as any);
        }
      }
    };

    window.addEventListener('selectChat', handleSelectChat);
    return () => window.removeEventListener('selectChat', handleSelectChat);
  }, [chats]);

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatData.name || !newChatData.phone || !newChatData.message) {
      return notify("Preencha todos os campos!", "error");
    }

    setIsCreatingNewChat(true);
    let cleanPhone = newChatData.phone.replace(/\D/g, '');

    // Auto-prepend 55 for Brazil if not present (10 or 11 digits = DDD + 8/9 digits)
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const chatId = `${cleanPhone}@s.whatsapp.net`;

    try {
      // 1. Criar/Atualizar Contato e Chat
      const contactRef = doc(db, "contacts", chatId);
      await setDoc(contactRef, {
        id: chatId,
        name: newChatData.name,
        phone: cleanPhone,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Force-create Chat Document to ensure it appears in the list
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        name: newChatData.name,
        unreadCount: 0,
        status: 'atendimento',
        agent: userName,
        lastMessage: 'Iniciando conversa...',
        updatedAt: serverTimestamp(),
        isGroup: false
      }, { merge: true });

      // 2. Enviar Mensagem Inicial via API
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6`
        },
        body: JSON.stringify({
          chatId: chatId,
          text: newChatData.message,
          contactName: newChatData.name,
          type: 'chat',
          agent: userName
        })
      });

      // Optimistically save the initial message
      if (response.ok && newChatData.message) {
        try {
          await addDoc(collection(db, "chats", chatId, "messages"), {
            text: newChatData.message,
            sender: 'me',
            fromMe: true,
            timestamp: serverTimestamp(),
            type: 'chat'
          });
        } catch (e) { console.error("Erro saving initial msg", e); }
      }

      if (!response.ok) throw new Error("Erro ao enviar mensagem inicial");

      // 3. Selecionar o Chat
      setSelectedChat({
        id: chatId,
        name: newChatData.name,
        phone: cleanPhone,
        status: 'atendimento',
        agent: userName
      } as any);

      setIsNewChatModalOpen(false);
      setNewChatData({ name: '', phone: '', message: '' });
      notify("Conversa iniciada com sucesso!", "success");

    } catch (err) {
      console.error(err);
      notify("Erro ao iniciar conversa.", "error");
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const unreadCounts = React.useMemo(() => {
    const counts = { bot: 0, aguardado: 0, chats: 0, grupos: 0, resolvido: 0 };

    chats.forEach(chat => {
      // Global Filters Check
      // 1. Sector
      if (selectedSector && chat.sector !== selectedSector) return;
      // 2. Attendant (Admin only)
      if (isAdmin && selectedAttendant && chat.agent !== selectedAttendant) return;
      // 3. Permission/Scope
      if (filterScope === 'mine') {
        if (chat.agent !== userName) return;
      } else if (!isAdmin) {
        // Non-admin "All" view = Own + Unassigned
        if (chat.agent !== userName && chat.agent !== 'Sem Agente') return;
      }

      // Must be unread to count
      if ((chat.unreadCount || 0) === 0) return;

      // Categorize
      if (chat.isGroup) {
        counts.grupos++;
        return;
      }

      const status = chat.status || 'atendimento';
      if (status === 'bot') counts.bot++;
      else if (status === 'aguardando') counts.aguardado++;
      else if (status === 'concluido' || status === 'resolvido') counts.resolvido++;
      else counts.chats++; // atendimento
    });

    return counts;
  }, [chats, selectedSector, selectedAttendant, filterScope, isAdmin, userName]);

  return (
    <div className="h-full w-full bg-gray-50 overflow-hidden font-sans relative">
      {viewMode === 'chats_kanban' ? (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#f8fafc]">
          {/* Floating Switcher in Kanban Mode */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-2xl border border-white flex gap-4 z-[60] animate-in slide-in-from-bottom-5 duration-500 ring-1 ring-black/5">
            <button
              onClick={() => setViewMode('classic')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              <MessageSquare size={16} /> Modo Chat
            </button>

            <div className="h-10 w-[1px] bg-gray-200" />

            <button
              onClick={() => setFilterScope(prev => prev === 'all' ? 'mine' : 'all')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${filterScope === 'mine' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-gray-100 text-gray-500'}`}
            >
              {filterScope === 'all' ? <UsersIcon size={16} /> : <User2 size={16} />}
              {filterScope === 'all' ? (isAdmin ? 'Ver Geral' : 'Ver Fluxo') : 'Focar em Mim'}
            </button>
          </div>

          <ChatsKanbanView
            chats={chats.filter(c => {
              if (selectedSector && c.sector !== selectedSector) return false;
              if (isAdmin && selectedAttendant && c.agent !== selectedAttendant) return false;
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!c.name.toLowerCase().includes(term) && !c.id.includes(term)) return false;
              }

              if (filterScope === 'mine') return c.agent === userName;
              if (!isAdmin) return c.agent === userName || c.agent === 'Sem Agente';
              return true;
            })}
            onSelectChat={(chat) => { setSelectedChat(chat); setViewMode('classic'); }}
          />
        </div>
      ) : (
        <div className="flex h-full w-full overflow-hidden">
          {/* Sidebar - Only in Classic Mode */}
          <div className="w-[480px] bg-white flex flex-col border-r border-gray-200 overflow-hidden shadow-xl z-10 shrink-0">
            {/* Action Bar */}
            <div className="p-4 border-b border-gray-50 flex items-center justify-between shrink-0 bg-[#fafafa]">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <Plus size={18} /> NOVO
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex-1 max-w-[180px] relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  className="w-full bg-gray-100 border-none rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => { setFilterScope('all'); setSelectedAttendant(null); }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${filterScope === 'all' && !selectedAttendant ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    title={isAdmin ? "Ver todos os atendimentos" : "Ver meus atendimentos e novos"}
                  >
                    {isAdmin ? 'GERAL' : 'TODOS'}
                  </button>
                  <button
                    onClick={() => setFilterScope('mine')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${filterScope === 'mine' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-400'}`}
                    title="Ver apenas conversas atribuídas a mim"
                  >
                    MEUS
                  </button>
                </div>

                {/* Sectors Filter */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSectorDropdown(!showSectorDropdown); setShowAttendantDropdown(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${selectedSector ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                  >
                    <Filter size={12} /> {selectedSector || 'Setores'}
                  </button>
                  {showSectorDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                      <button onClick={() => { setSelectedSector(null); setShowSectorDropdown(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50">Limpar Filtro</button>
                      <div className="h-[1px] bg-gray-50 my-1" />
                      {sectors.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSector(s.name); setShowSectorDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors ${selectedSector === s.name ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attendants Filter (Admin only) */}
                {isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowAttendantDropdown(!showAttendantDropdown); setShowSectorDropdown(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${selectedAttendant ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <User2 size={12} /> {selectedAttendant || 'Atendentes'}
                    </button>
                    {showAttendantDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                        <button onClick={() => { setSelectedAttendant(null); setShowAttendantDropdown(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50">Ver Todos</button>
                        <div className="h-[1px] bg-gray-50 my-1" />
                        {attendants.map(a => (
                          <button key={a.id} onClick={() => { setSelectedAttendant(a.name || a.displayName || a.email); setShowAttendantDropdown(false); setFilterScope('all'); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-purple-50 transition-colors ${selectedAttendant === (a.name || a.displayName || a.email) ? 'text-purple-600 bg-purple-50/50' : 'text-gray-600'}`}>
                            {a.name || a.displayName || a.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Toggle Solved Button */}
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${showResolved ? 'bg-gray-800 border-gray-800 text-white shadow-lg' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                  title="Exibir atendimentos concluídos"
                >
                  <CheckCircle size={14} />
                  {showResolved ? 'Ocultar Concluídos' : 'Ver Concluídos'}
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-white shrink-0 border-b border-gray-50">
              {/* Tabs for Bots, Aguardado, Chats, Grupos */}
              <button onClick={() => setActiveSubTab('bot')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'bot' ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className="relative">
                  <Bot size={24} />
                  {unreadCounts.bot > 0 && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-sm border border-white">
                      {unreadCounts.bot}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-1">Bots</span>
                {activeSubTab === 'bot' && <div className="absolute bottom-0 w-full h-1 bg-indigo-600" />}
              </button>
              <button onClick={() => setActiveSubTab('aguardado')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'aguardado' ? 'text-amber-500' : 'text-gray-400'}`}>
                <div className="relative">
                  <Clock size={24} />
                  {unreadCounts.aguardado > 0 && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-sm border border-white">
                      {unreadCounts.aguardado}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-1">Aguardado</span>
                {activeSubTab === 'aguardado' && <div className="absolute bottom-0 w-full h-1 bg-amber-500" />}
              </button>
              <button onClick={() => setActiveSubTab('chats')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'chats' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className="relative">
                  <MessageSquare size={24} />
                  {unreadCounts.chats > 0 && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-sm border border-white">
                      {unreadCounts.chats}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-1">Chats</span>
                {activeSubTab === 'chats' && <div className="absolute bottom-0 w-full h-1 bg-blue-600" />}
              </button>
              <button onClick={() => setActiveSubTab('grupos')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'grupos' ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className="relative">
                  <UsersIcon size={24} />
                  {unreadCounts.grupos > 0 && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-sm border border-white">
                      {unreadCounts.grupos}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-1">Grupos</span>
                {activeSubTab === 'grupos' && <div className="absolute bottom-0 w-full h-1 bg-emerald-600" />}
              </button>
              <button onClick={() => setActiveSubTab('tarefas')} className={`flex-1 flex flex-col items-center py-4 relative transition-colors ${activeSubTab === 'tarefas' ? 'text-sky-500' : 'text-gray-400'}`}>
                <div className="relative">
                  <ClipboardList size={24} />
                  {/* Badge for tasks if needed */}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] mt-1">Tarefas</span>
                {activeSubTab === 'tarefas' && <div className="absolute bottom-0 w-full h-1 bg-sky-500" />}
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center p-8"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : (
                filteredChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setSelectedChat(chat); setViewMode('classic'); }} className={selectedChat?.id === chat.id ? 'bg-indigo-50/80 border-l-4 border-indigo-500 transition-all duration-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]' : ''}>
                    <ChatListItem chat={chat} />
                  </div>
                ))
              )}
            </div>

            {/* Mode Switcher in Classic (Hidden when in Fluxo) */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => setViewMode('chats_kanban')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                <LayoutGrid size={16} /> Abrir Modo Fluxo (Kanban)
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[#f1f5f9] flex flex-col relative overflow-hidden">
            {selectedChat ? (
              <ChatWindow
                chatId={selectedChat.id}
                contactName={selectedChat.name}
                currentUser={user}
                isTask={selectedChat.isTask}
                initialDraft={messageDrafts[selectedChat.id] || ''}
                onDraftChange={(text) => setMessageDrafts(prev => ({ ...prev, [selectedChat.id]: text }))}
              />
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
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Modal de Novo Atendimento */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-[#fcfcfc]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-100">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo Atendimento</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Inicie uma conversa por aqui</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </header>

            <form onSubmit={handleStartNewChat} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Contato</label>
                <input
                  required
                  placeholder="Ex: João Silva"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={newChatData.name}
                  onChange={e => setNewChatData({ ...newChatData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone (DDI + DDD + Número)</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    required
                    placeholder="5511999999999"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={newChatData.phone}
                    onChange={e => setNewChatData({ ...newChatData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mensagem Inicial</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Digite a mensagem que deseja enviar..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  value={newChatData.message}
                  onChange={e => setNewChatData({ ...newChatData, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingNewChat}
                className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCreatingNewChat ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    INICIANDO...
                  </>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    INICIAR CONVERSA AGORA
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtendimentoView;
