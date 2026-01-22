
import React, { useState, useEffect } from 'react';
import {
    Users,
    Bot,
    UserCheck,
    Plus,
    Search,
    MoreVertical,
    Trash2,
    Edit2,
    Shield,
    Globe,
    Zap,
    Save,
    X,
    MessageSquare,
    Activity
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface HumanUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    lastSeen?: any;
}

interface AIRobot {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    type: 'ia';
    prompt: string;
    intent: string;
    knowledgeBase: string;
    sector: string;
    model: string;
    isFirstContact: boolean;
    updatedAt: any;
}

const UsersView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'HUMANOS' | 'IA'>('HUMANOS');
    const [humans, setHumans] = useState<HumanUser[]>([]);
    const [robots, setRobots] = useState<AIRobot[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingRobot, setEditingRobot] = useState<Partial<AIRobot> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<HumanUser> | null>(null);

    useEffect(() => {
        // Escutar Humanos (Mock ou real se tiver coleção users)
        const qH = query(collection(db, "users"), orderBy("name", "asc"));
        const unsubH = onSnapshot(qH, (snapshot) => {
            setHumans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HumanUser)));
        });

        // Escutar Robôs
        const qR = query(collection(db, "ai_agents"), orderBy("name", "asc"));
        const unsubR = onSnapshot(qR, (snapshot) => {
            setRobots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIRobot)));
            setLoading(false);
        });

        return () => { unsubH(); unsubR(); };
    }, []);

    const handleSaveRobot = async () => {
        if (!editingRobot?.name) return alert("Dê um nome ao seu robô!");

        const id = editingRobot.id || `bot_${Date.now()}`;
        const robotData = {
            ...editingRobot,
            id,
            type: 'ia',
            status: editingRobot.status || 'active',
            updatedAt: serverTimestamp(),
            prompt: editingRobot.prompt || '',
            intent: editingRobot.intent || '',
            knowledgeBase: editingRobot.knowledgeBase || '',
            model: editingRobot.model || 'gemini-1.5-flash',
            sector: editingRobot.sector || 'Geral',
            isFirstContact: editingRobot.isFirstContact || false
        };

        try {
            await setDoc(doc(db, "ai_agents", id), robotData);
            setIsModalOpen(false);
            setEditingRobot(null);
        } catch (e) {
            alert("Erro ao salvar robô");
        }
    };

    const handleDeleteRobot = async (id: string) => {
        if (!confirm("Excluir este robô permanentemente?")) return;
        try {
            await deleteDoc(doc(db, "ai_agents", id));
        } catch (e) {
            alert("Erro ao excluir");
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser?.name || !editingUser?.email) return alert("Preencha o nome e email!");

        const id = editingUser.id || `user_${Date.now()}`;
        const userData = {
            ...editingUser,
            id,
            status: editingUser.status || 'active',
            role: editingUser.role || 'Agente',
            lastSeen: editingUser.lastSeen || serverTimestamp()
        };

        try {
            await setDoc(doc(db, "users", id), userData);
            setIsUserModalOpen(false);
            setEditingUser(null);
        } catch (e) {
            alert("Erro ao salvar usuário");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Remover este usuário do sistema?")) return;
        try {
            await deleteDoc(doc(db, "users", id));
        } catch (e) {
            alert("Erro ao excluir");
        }
    };

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Gestão de Usuários</h1>
                            <p className="text-xs text-gray-500 font-medium">Gerencie sua equipe humana e seus agentes de IA.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'IA') {
                                setEditingRobot({});
                                setIsModalOpen(true);
                            } else {
                                setEditingUser({});
                                setIsUserModalOpen(true);
                            }
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} /> {activeTab === 'IA' ? 'Novo Robô (IA)' : 'Convidar Humano'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('HUMANOS')}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HUMANOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        👨‍💼 Humanos ({humans.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('IA')}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'IA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        🤖 Robôs IA ({robots.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'HUMANOS' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {humans.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                Nenhum usuário humano cadastrado
                            </div>
                        ) : humans.map(h => (
                            <div key={h.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-xl border border-blue-100">
                                        {h.name.charAt(0)}
                                    </div>
                                    <span className={`px-3 py-1 ${h.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'} text-[10px] font-black rounded-full uppercase tracking-tighter`}>
                                        {h.status === 'active' ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-1">{h.name}</h3>
                                <p className="text-xs text-gray-500 mb-4">{h.email}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{h.role || 'Agente'}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingUser(h); setIsUserModalOpen(true); }}
                                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(h.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {robots.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs bg-white rounded-[2rem] border-2 border-dashed border-emerald-100/50">
                                Nenhum robô IA configurado
                            </div>
                        ) : robots.map(r => (
                            <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-2 h-full ${r.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 relative">
                                        <Bot size={28} />
                                        {r.isFirstContact && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white" title="Primeiro Contato">
                                                <Zap size={10} fill="white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${r.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            {r.status === 'active' ? 'TREINADO' : 'DESLIGADO'}
                                        </span>
                                        <span className="text-[9px] text-gray-300 font-mono uppercase italic">{r.model}</span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-1">{r.name}</h3>
                                <p className="text-xs text-gray-500 mb-2 font-medium">Setor: {r.sector}</p>
                                <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Zap size={10} className="text-yellow-500" /> Gatilho
                                    </p>
                                    <p className="text-[11px] text-gray-600 font-mono truncate">{r.intent || 'Qualquer mensagem'}</p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-300 uppercase">Contexto</span>
                                            <span className="text-xs font-bold text-gray-600">{r.knowledgeBase ? 'Carregado' : 'Vazio'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingRobot(r); setIsModalOpen(true); }}
                                            className="p-2 bg-gray-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRobot(r.id)}
                                            className="p-2 bg-gray-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Robot Config Modal (Full Screen slide) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#f8fafc]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-100">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Treinamento do Robô</h2>
                                    <p className="text-xs text-gray-500 font-medium italic">Ensine como seu agente de IA deve se comportar.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingRobot(null); }}
                                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl border border-gray-200 transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome do Agente</label>
                                    <div className="relative">
                                        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Assistente Comercial"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={editingRobot?.name || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Modelo de IA</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 appearance-none transition-all"
                                            value={editingRobot?.model || 'gemini-1.5-flash'}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, model: e.target.value })}
                                        >
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Inteligente)</option>
                                            <option value="gpt-4o">GPT-4o</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Gatilho / Intenção</label>
                                    <div className="relative">
                                        <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: precificação, suporte, oi"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                                            value={editingRobot?.intent || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, intent: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Setor de Atuação</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Comercial, SAC"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={editingRobot?.sector || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, sector: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Bot size={14} /> Persona e Instruções (Prompt)
                                    </label>
                                    <span className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Cuidado: Mantenha instruções claras</span>
                                </div>
                                <textarea
                                    rows={6}
                                    placeholder="Ex: Você é um assistente da FGV. Seja cordial, use emojis, e foque em descobrir o interesse do lead..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-6 py-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-[150px] resize-none"
                                    value={editingRobot?.prompt || ''}
                                    onChange={(e) => setEditingRobot({ ...editingRobot, prompt: e.target.value })}
                                />
                            </div>

                            {/* Knowledge Base */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Save size={14} /> Base de Conhecimento (Contexto)
                                </label>
                                <textarea
                                    rows={6}
                                    placeholder="Cole aqui informações sobre preços, horários, catálogo, scripts de venda, etc."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-6 py-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-[150px] resize-none"
                                    value={editingRobot?.knowledgeBase || ''}
                                    onChange={(e) => setEditingRobot({ ...editingRobot, knowledgeBase: e.target.value })}
                                />
                            </div>

                            {/* Advanced Flags */}
                            <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Fluxo Automático</h4>
                                    <p className="text-[11px] text-blue-800 font-bold">Definir como Robô de Primeiro Contato?</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={editingRobot?.isFirstContact || false}
                                        onChange={(e) => setEditingRobot({ ...editingRobot, isFirstContact: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Advanced Toggle */}
                            <div className="p-6 bg-[#0f172a] rounded-[2rem] border border-gray-800 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <Activity size={18} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Estado de Operação</h4>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={editingRobot?.status === 'active'}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, status: e.target.checked ? 'active' : 'inactive' })}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                                <p className="text-[11px] text-gray-500 italic">Quando ativo, este robô responderá automaticamente de acordo com o gatilho configurado.</p>
                            </div>
                        </div>

                        <footer className="px-8 py-6 border-t border-gray-100 bg-[#f8fafc] flex gap-4 shrink-0">
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingRobot(null); }}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveRobot}
                                className="flex-[2] bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> SALVAR E TREINAR AGORA
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-blue-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo Usuário</h2>
                                    <p className="text-xs text-gray-500 font-medium italic">Adicione um novo membro à sua equipe de atendimento.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }}
                                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl border border-gray-200 transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                                <input
                                    type="text"
                                    placeholder="Nome do usuário"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={editingUser?.name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">E-mail de Acesso</label>
                                <input
                                    type="email"
                                    placeholder="email@empresa.com"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={editingUser?.email || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Função / Cargo</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                                        value={editingUser?.role || 'Agente'}
                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    >
                                        <option value="Administrador">Administrador</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Agente">Agente</option>
                                        <option value="Estagiário">Estagiário</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Status</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                                        value={editingUser?.status || 'active'}
                                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <footer className="px-8 py-6 border-t border-gray-100 bg-[#f8fafc] flex gap-4 shrink-0">
                            <button
                                onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> SALVAR USUÁRIO
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default UsersView;
