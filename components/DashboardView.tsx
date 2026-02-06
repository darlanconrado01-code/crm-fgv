
import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Activity,
    MessageSquare,
    Smartphone,
    Zap,
    Cpu,
    Monitor,
    Layout,
    ChevronRight,
    Plus
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    fromMe: boolean;
    sender: string;
    timestamp: any;
    isBot?: boolean;
}

interface ChatMonitorProps {
    chatId: string;
    chatName: string;
    avatarUrl: string;
}

const MiniChatWindow: React.FC<ChatMonitorProps> = ({ chatId, chatName, avatarUrl }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
            limit(8)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message)).reverse();
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [chatId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="bg-[#f0f2f5] rounded-3xl overflow-hidden border border-gray-100 shadow-xl flex flex-col h-[400px] animate-in zoom-in-95 duration-500 relative group">
            {/* Header Estilo WhatsApp */}
            <div className="bg-[#075e54] p-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-md">
                    <img src={avatarUrl} alt={chatName} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-white font-bold text-sm leading-tight truncate max-w-[150px]">{chatName}</h3>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] text-emerald-100/80 font-black uppercase tracking-widest">IA EM AÇÃO</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <Bot size={20} className="text-emerald-300" />
                </div>
            </div>

            {/* Background do Chat */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-2 relative custom-scrollbar"
                ref={scrollRef}
                style={{
                    backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                    backgroundSize: '250px'
                }}
            >
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs shadow-sm relative ${msg.fromMe ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                            <p className="leading-relaxed">{msg.text}</p>
                            <div className="text-[9px] text-gray-400 mt-1 flex justify-end">
                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Overlay de Status */}
            <div className="absolute top-20 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-1 rounded-full font-black flex items-center gap-1 ring-1 ring-white/10">
                    <Activity size={10} className="text-emerald-400" /> MONITORANDO INSTÂNCIA 01
                </div>
            </div>
        </div>
    );
};

const DashboardView: React.FC = () => {
    const [activeRobots, setActiveRobots] = useState<any[]>([]);
    const [stats, setStats] = useState({ activeRobotsCount: 0, totalSuccessRate: 98 });
    const [todayActivities, setTodayActivities] = useState<any[]>([]);

    useEffect(() => {
        // ... previous stats logic ...
        const qStats = query(collection(db, "chats"));
        const unsubStats = onSnapshot(qStats, (snapshot) => {
            const allChats = snapshot.docs.map(d => d.data());
            const botChats = allChats.filter(c => c.status === 'bot');

            // Taxa de sucesso REAL baseada em chats concluídos / total de chats finalizados (excluindo os que iniciaram agora)
            const finishedChats = allChats.filter(c => c.status !== 'bot' && c.status !== 'aguardando');
            const successChats = finishedChats.filter(c => c.status === 'concluido' || c.status === 'resolvido');

            const rate = finishedChats.length > 0
                ? Math.round((successChats.length / finishedChats.length) * 100)
                : 0;

            setStats({
                activeRobotsCount: botChats.length,
                totalSuccessRate: rate
            });
        });

        const qMonitor = query(collection(db, "chats"), where("status", "==", "bot"), orderBy("updatedAt", "desc"), limit(4));
        const unsubMonitor = onSnapshot(qMonitor, (snapshot) => {
            setActiveRobots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Today's Activities
        const todayStr = new Date().toISOString().split('T')[0];

        // Listen to Events
        const qEvents = query(collection(db, "agenda_events"), where("startDate", "==", todayStr));
        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            const evs = snapshot.docs.map(doc => ({ id: doc.id, type: 'event', ...doc.data() }));
            updateCombinedActivities(evs, null);
        });

        // Listen to Tasks
        const qTasks = query(collection(db, "tasks"), where("status", "==", "pending"));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const tks = snapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() }))
                .filter((t: any) => t.date === todayStr || t.endDate === todayStr || t.startDate === todayStr);
            updateCombinedActivities(null, tks);
        });

        let currentEvents: any[] = [];
        let currentTasks: any[] = [];

        const updateCombinedActivities = (evs: any[] | null, tks: any[] | null) => {
            if (evs) currentEvents = evs;
            if (tks) currentTasks = tks;
            setTodayActivities([...currentEvents, ...currentTasks].sort((a, b) => (a.startTime || '23:59').localeCompare(b.startTime || '23:59')));
        };

        return () => {
            unsubStats();
            unsubMonitor();
            unsubEvents();
            unsubTasks();
        };
    }, []);

    return (
        <div className="h-full w-full bg-[#f8fafc] overflow-y-auto p-8 custom-scrollbar">
            {/* Header de Monitoramento */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Monitor size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Live Dashboard</h1>
                            <p className="text-gray-400 font-bold text-sm tracking-wide">MONITORAMENTO DE IA EM TEMPO REAL</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-gray-800 leading-none">{stats.activeRobotsCount}</div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Robôs Ativos</div>
                        </div>
                    </div>

                    <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <Activity size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-gray-800 leading-none">{stats.totalSuccessRate}%</div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Taxa de Sucesso</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Monitoramento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                {activeRobots.length > 0 ? (
                    activeRobots.map(robot => (
                        <MiniChatWindow
                            key={robot.id}
                            chatId={robot.id}
                            chatName={robot.name || robot.id}
                            avatarUrl={robot.avatarUrl || `https://ui-avatars.com/api/?name=${robot.name || robot.id}&background=random`}
                        />
                    ))
                ) : (
                    <div className="col-span-full h-[400px] bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center animate-pulse">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-6">
                            <Zap size={40} className="animate-bounce" />
                        </div>
                        <h2 className="text-xl font-black text-gray-400 uppercase tracking-tight">Escaneando Atendimentos</h2>
                        <p className="max-w-xs text-gray-400 text-sm mt-2 font-medium">O radar de inteligência artificial está aguardando novos leads para iniciar o monitoramento live.</p>
                    </div>
                )}
            </div>

            {/* Novas Seções de Dashboard */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Atividades Hoje */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Atividades para Hoje</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Sua agenda e entregas do dia</p>
                        </div>
                        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {todayActivities.length} PENDENTES
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {todayActivities.length > 0 ? (
                            todayActivities.map((act) => (
                                <div key={act.id} className="flex items-center gap-6 p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all group">
                                    <div className="shrink-0 flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 ${act.type === 'event' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {act.type === 'event' ? <Monitor size={20} /> : <Zap size={20} />}
                                        </div>
                                        <span className="text-[9px] font-black text-gray-400">{act.startTime || 'DIA'}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${act.type === 'event' ? 'bg-purple-50 text-purple-500' : 'bg-orange-50 text-orange-500'}`}>
                                                {act.type === 'event' ? 'REUNIÃO' : 'ENTREGA'}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-300">•</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{act.responsible}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">{act.title}</h4>
                                    </div>
                                    <button className="shrink-0 w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center text-center">
                                <Activity size={40} className="text-gray-100 mb-4" />
                                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Tudo em dia por hoje!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resumo de Metas / Performance */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Performance Global</h4>
                        <div className="text-4xl font-black tracking-tighter mb-4">{stats.totalSuccessRate}%</div>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6">
                            Sua taxa de sucesso real baseada em atendimentos concluídos com êxito.
                        </p>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full transition-all duration-1000" style={{ width: `${stats.totalSuccessRate}%` }} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 flex flex-col justify-between flex-1">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                                <Zap size={14} className="text-blue-500" /> Atalhos Rápidos
                            </h4>
                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                                    Novo Atendimento <Plus size={14} />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                                    Relatório Mensal <Activity size={14} />
                                </button>
                            </div>
                        </div>
                        <button className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
                            Extrair Leads (CSV)
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default DashboardView;
