
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
    Activity,
    BookOpen,
    Database,
    ClipboardList,
    FileText,
    Clock
} from 'lucide-react';
import { db } from '../firebase';
import { useNotification } from './Notification';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

interface HumanUser {
    id: string;
    name: string;
    email: string;
    role: string;
    sector?: string;
    status: 'active' | 'inactive' | 'pending';
    approved?: boolean;
    lastSeen?: any;
    photoURL?: string;
    workSchedule?: {
        start: string;
        end: string;
        days: string[];
    };
}

interface AIRobot {
    id: string;
    name: string;
    type: 'ia';
    prompt: string;
    function: string;      // Sua função
    persona: string;       // Sua persona
    sector: string;
    flowStrategy: 'initial' | 'standard'; // Fluxo Inicial (Novo) ou Fluxo Padrão (Base)
    missions?: string[]; // IDs dos campos personalizados que o robô deve preencher
    updatedAt: any;
    avatarUrl?: string;
}

const UsersView: React.FC<{ initialTab?: 'HUMANOS' | 'PERSONAS' }> = ({ initialTab = 'HUMANOS' }) => {
    const [activeTab, setActiveTab] = useState<'HUMANOS' | 'PERSONAS'>(initialTab);
    const [humans, setHumans] = useState<HumanUser[]>([]);
    const [robots, setRobots] = useState<AIRobot[]>([]);
    const [loading, setLoading] = useState(true);
    const { notify, confirm } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingRobot, setEditingRobot] = useState<Partial<AIRobot> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<HumanUser> | null>(null);
    const [sectors, setSectors] = useState<{ id: string, name: string }[]>([]);
    const [availableFields, setAvailableFields] = useState<{ id: string, label: string }[]>([]);

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

        // Escutar Setores
        const qS = query(collection(db, "sectors"), orderBy("name", "asc"));
        const unsubS = onSnapshot(qS, (snapshot) => {
            setSectors(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        });

        // Escutar Campos Personalizados
        const qF = query(collection(db, "custom_fields"), orderBy("label", "asc"));
        const unsubF = onSnapshot(qF, (snapshot) => {
            setAvailableFields(snapshot.docs.map(doc => ({
                id: doc.id,
                label: doc.data().label
            })).filter(f => (snapshot.docs.find(d => d.id === f.id)?.data()?.active !== false)));
        });

        return () => { unsubH(); unsubR(); unsubS(); unsubF(); };
    }, []);

    const handleSaveRobot = async () => {
        if (!editingRobot?.name) {
            notify("Dê um nome ao seu robô!", "warning");
            return;
        }

        const id = editingRobot.id || `bot_${Date.now()}`;
        const robotData = {
            ...editingRobot,
            id,
            type: 'ia',
            updatedAt: serverTimestamp(),
            prompt: editingRobot.prompt || '',
            function: editingRobot.function || '',
            persona: editingRobot.persona || '',
            sector: editingRobot.sector || 'Geral',
            flowStrategy: editingRobot.flowStrategy || 'initial',
            missions: editingRobot.missions || []
        };

        try {
            await setDoc(doc(db, "ai_agents", id), robotData);
            setIsModalOpen(false);
            setEditingRobot(null);
            notify("Persona registrada com sucesso!", "success");
        } catch (e) {
            notify("Erro ao salvar registro.", "error");
        }
    };



    const handleDeleteRobot = async (id: string) => {
        if (await confirm({
            title: 'Excluir Registro',
            message: 'Tem certeza que deseja apagar esta definição de persona? Esta ação é irreversível.',
            type: 'danger',
            confirmText: 'Apagar'
        })) {
            try {
                await deleteDoc(doc(db, "ai_agents", id));
                notify("Registro removido.", "success");
            } catch (e) {
                notify("Erro ao excluir.", "error");
            }
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser?.name || !editingUser?.email) {
            notify("Preencha o nome e email!", "warning");
            return;
        }

        const id = editingUser.id || `user_${Date.now()}`;
        const userData = {
            ...editingUser,
            id,
            status: editingUser.status || 'active',
            role: editingUser.role || 'Agente',
            sector: editingUser.sector || '',
            lastSeen: editingUser.lastSeen || serverTimestamp(),
            workSchedule: editingUser.workSchedule || { start: '08:00', end: '18:00', days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] }
        };

        try {
            await setDoc(doc(db, "users", id), userData);
            setIsUserModalOpen(false);
            setEditingUser(null);
            notify("Usuário salvo com sucesso!", "success");
        } catch (e) {
            notify("Erro ao salvar usuário.", "error");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (await confirm({
            title: 'Remover Usuário',
            message: 'Tem certeza que deseja remover este usuário do sistema? Ele perderá acesso ao painel.',
            type: 'danger',
            confirmText: 'Remover'
        })) {
            try {
                await deleteDoc(doc(db, "users", id));
                notify("Usuário removido com sucesso.", "success");
            } catch (e) {
                notify("Erro ao excluir.", "error");
            }
        }
    };

    const handleApproveUser = async (id: string, name: string) => {
        if (await confirm({
            title: 'Aprovar Acesso',
            message: `Deseja liberar o acesso ao sistema para ${name}?`,
            type: 'info',
            confirmText: 'Aprovar'
        })) {
            try {
                await updateDoc(doc(db, "users", id), {
                    status: 'active',
                    approved: true
                });
                notify("Acesso liberado com sucesso!", "success");
            } catch (e) {
                console.error(e);
                notify("Erro ao aprovar usuário.", "error");
            }
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
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                                {activeTab === 'HUMANOS' ? 'Gestão de Usuários' : 'Gestão de Robôs (IA)'}
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                {activeTab === 'HUMANOS' ? 'Gerencie sua equipe humana.' : 'Crie e configure seus agentes de inteligência artificial.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'PERSONAS') {
                                setEditingRobot({});
                                setIsModalOpen(true);
                            } else {
                                setEditingUser({});
                                setIsUserModalOpen(true);
                            }
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} /> {activeTab === 'PERSONAS' ? 'Nova Persona' : 'Convidar Humano'}
                    </button>
                </div>

                {/* Tabs - Only show if we want to toggle, but for now we are splitting views. 
                    However, the user asked to SPLIT the menu items. 
                    If we want to strictly enforce it, we can hide tabs if a specific one is passed, OR just set default.
                    Let's just keep the tabs for flexibility but default to the correct one, 
                    OR hide them if we want a stricter separation. 
                    Given "Não vamos mais misturar", let's Hide the tabs if we are in a specific view mode.
                */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('HUMANOS')}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HUMANOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'} ${initialTab === 'PERSONAS' ? 'hidden' : ''}`}
                    >
                        👨‍💼 Humanos ({humans.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('PERSONAS')}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PERSONAS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'} ${initialTab === 'HUMANOS' ? 'hidden' : ''}`}
                    >
                        📋 Personas Agentes ({robots.length})
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
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 overflow-hidden flex items-center justify-center text-blue-500 font-bold text-xl border border-blue-100 relative">
                                        {h.photoURL ? (
                                            <img src={h.photoURL} alt={h.name} className="w-full h-full object-cover" />
                                        ) : (
                                            h.name.charAt(0)
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 ${h.status === 'active' ? 'bg-emerald-50 text-emerald-600' : h.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-400'} text-[10px] font-black rounded-full uppercase tracking-tighter`}>
                                        {h.status === 'active' ? 'ONLINE' : h.status === 'pending' ? 'PENDENTE' : 'OFFLINE'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-1">{h.name}</h3>
                                <p className="text-xs text-gray-500 mb-4">{h.email}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{h.role || 'Agente'}</span>
                                        <span className="text-[9px] font-bold text-blue-500 uppercase">{h.role === 'Administrador' ? 'Geral' : (sectors.find(s => s.id === h.role)?.name || h.role || 'Sem Setor')}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {h.status === 'pending' && (
                                            <button
                                                onClick={() => handleApproveUser(h.id, h.name)}
                                                className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-500 hover:text-white transition-colors"
                                                title="Aprovar Acesso"
                                            >
                                                <UserCheck size={16} />
                                            </button>
                                        )}
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
                                <div className={`absolute top-0 right-0 py-1 px-4 ${r.flowStrategy === 'standard' ? 'bg-emerald-600' : 'bg-orange-500'} text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg flex items-center gap-1 z-10`}>
                                    {r.flowStrategy === 'standard' ? <ClipboardList size={10} /> : <Zap size={10} fill="white" />}
                                    {r.flowStrategy === 'standard' ? 'Fluxo Padrão (Base)' : 'Fluxo Inicial (Novo)'}
                                </div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 relative">
                                        <FileText size={28} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase trekking-widest bg-gray-50 px-2 py-1 rounded-lg">REG: {r.id.split('_')[1] || r.id}</span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-1">{r.name}</h3>
                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2">{r.function || 'Função não definida'}</p>
                                <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <UserCheck size={10} className="text-emerald-500" /> Persona
                                    </p>
                                    <p className="text-[11px] text-gray-600 font-medium italic line-clamp-2">{r.persona || 'Sem persona definida'}</p>
                                </div>

                                {r.missions && r.missions.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            🎯 Missões Ativas ({r.missions.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {r.missions.map(mId => {
                                                const field = availableFields.find(f => f.id === mId);
                                                return field ? (
                                                    <span key={mId} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-md border border-blue-100">
                                                        {field.label}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-gray-300 uppercase">Setor</span>
                                        <span className="text-xs font-bold text-gray-600 truncate max-w-[120px]">{sectors.find(s => s.id === r.sector)?.name || r.sector || 'Geral'}</span>
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
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Ficha da Persona</h2>
                                    <p className="text-xs text-gray-500 font-medium italic">Registre as definições estratégicas deste agente.</p>
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
                                        <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Consultor FGV"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={editingRobot?.name || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Sua Função</label>
                                    <div className="relative">
                                        <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Qualificação de Leads, Suporte..."
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={editingRobot?.function || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, function: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Setor de Atuação</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 appearance-none transition-all"
                                            value={editingRobot?.sector || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, sector: e.target.value })}
                                        >
                                            <option value="Geral">Geral (Todos)</option>
                                            {sectors.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Sua Persona (Identidade)</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Um atendente jovem, prestativo e que gosta de tecnologia"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={editingRobot?.persona || ''}
                                            onChange={(e) => setEditingRobot({ ...editingRobot, persona: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Missions / Custom Fields */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        🎯 Missões do Robô (Coleta de Dados)
                                    </label>
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">Objetivos de preenchimento</span>
                                </div>
                                <p className="text-[11px] text-gray-500 italic ml-1 mb-4">Selecione quais campos este robô deve tentar preencher suavemente durante a conversa.</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {availableFields.length === 0 ? (
                                        <div className="col-span-2 p-4 border border-dashed border-gray-100 rounded-2xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhum campo personalizado ativo disponível.</p>
                                        </div>
                                    ) : availableFields.map(field => (
                                        <button
                                            key={field.id}
                                            onClick={() => {
                                                const currentMissions = editingRobot?.missions || [];
                                                const newMissions = currentMissions.includes(field.id)
                                                    ? currentMissions.filter(id => id !== field.id)
                                                    : [...currentMissions, field.id];
                                                setEditingRobot({ ...editingRobot, missions: newMissions });
                                            }}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${editingRobot?.missions?.includes(field.id)
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                                : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${editingRobot?.missions?.includes(field.id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-200 group-hover:border-blue-400'
                                                }`}>
                                                {editingRobot?.missions?.includes(field.id) && <Plus size={14} className="rotate-45" />}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-tight">{field.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <FileText size={14} /> Persona e Instruções (Prompt)
                                    </label>
                                    <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded font-bold uppercase">Definição Mestre</span>
                                </div>
                                <textarea
                                    rows={6}
                                    placeholder="Ex: Você é um assistente da FGV. Seja cordial, use emojis, e foque em descobrir o interesse do lead..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-6 py-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-[150px] resize-none"
                                    value={editingRobot?.prompt || ''}
                                    onChange={(e) => setEditingRobot({ ...editingRobot, prompt: e.target.value })}
                                />
                            </div>

                            {/* Strategy Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    🎯 Estratégia de Ativação (n8n Logic)
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setEditingRobot({ ...editingRobot, flowStrategy: 'initial' })}
                                        className={`p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-2 ${editingRobot?.flowStrategy !== 'standard'
                                            ? 'bg-orange-50 border-orange-500 shadow-lg'
                                            : 'bg-white border-gray-100 grayscale opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editingRobot?.flowStrategy !== 'standard' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Zap size={18} fill={editingRobot?.flowStrategy !== 'standard' ? "currentColor" : "none"} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-tight">Fluxo Inicial</p>
                                            <p className="text-[10px] text-gray-500 font-bold leading-tight mt-1">Para clientes inexistentes no CRM (Novos Leads).</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setEditingRobot({ ...editingRobot, flowStrategy: 'standard' })}
                                        className={`p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-2 ${editingRobot?.flowStrategy === 'standard'
                                            ? 'bg-emerald-50 border-emerald-500 shadow-lg'
                                            : 'bg-white border-gray-100 grayscale opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editingRobot?.flowStrategy === 'standard' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <ClipboardList size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-tight">Fluxo Padrão</p>
                                            <p className="text-[10px] text-gray-500 font-bold leading-tight mt-1">Para clientes da base com tickets reabertos.</p>
                                        </div>
                                    </button>
                                </div>
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
                                <Save size={18} /> SALVAR REGISTRO
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
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Setor Principal</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                                        value={editingUser?.sector || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, sector: e.target.value })}
                                    >
                                        <option value="">Nenhum</option>
                                        {sectors.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Working Hours Schedule */}
                            <div className="space-y-4 pt-4 border-t border-gray-100/50">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Clock size={14} /> Horário de Trabalho
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Início</label>
                                        <input
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={editingUser?.workSchedule?.start || '08:00'}
                                            onChange={(e) => setEditingUser({
                                                ...editingUser,
                                                workSchedule: { ...(editingUser?.workSchedule || { end: '18:00', days: [] }), start: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                                        <input
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={editingUser?.workSchedule?.end || '18:00'}
                                            onChange={(e) => setEditingUser({
                                                ...editingUser,
                                                workSchedule: { ...(editingUser?.workSchedule || { start: '08:00', days: [] }), end: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dias da Semana</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
                                            <button
                                                key={day}
                                                onClick={() => {
                                                    const currentDays = editingUser?.workSchedule?.days || [];
                                                    const newDays = currentDays.includes(day)
                                                        ? currentDays.filter(d => d !== day)
                                                        : [...currentDays, day];
                                                    setEditingUser({
                                                        ...editingUser,
                                                        workSchedule: { ...(editingUser?.workSchedule || { start: '08:00', end: '18:00' }), days: newDays }
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all ${(editingUser?.workSchedule?.days || []).includes(day)
                                                    ? 'bg-blue-500 text-white border-blue-500'
                                                    : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
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
