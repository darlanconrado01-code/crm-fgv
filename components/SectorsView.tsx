
import React, { useState, useEffect } from 'react';
import {
    ClipboardList,
    Plus,
    Trash2,
    Edit2,
    Users,
    Bot,
    X,
    Save,
    LayoutGrid,
    Search
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface Sector {
    id: string;
    name: string;
    description: string;
    color: string;
    active: boolean;
    updatedAt: any;
}

const SectorsView: React.FC = () => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSector, setEditingSector] = useState<Partial<Sector> | null>(null);

    const colors = [
        { name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
        { name: 'Blue', bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
        { name: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
        { name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
        { name: 'Rose', bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50' },
        { name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
        { name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
        { name: 'Slate', bg: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50' },
    ];

    useEffect(() => {
        const q = query(collection(db, "sectors"), orderBy("name", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSaveSector = async () => {
        if (!editingSector?.name) return alert("Dê um nome ao setor!");

        const id = editingSector.id || `sector_${Date.now()}`;
        const sectorData = {
            ...editingSector,
            id,
            active: editingSector.active ?? true,
            color: editingSector.color || colors[0].bg,
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, "sectors", id), sectorData);
            setIsModalOpen(false);
            setEditingSector(null);
        } catch (e) {
            alert("Erro ao salvar setor");
        }
    };

    const handleDeleteSector = async (id: string) => {
        if (!confirm("Excluir este setor? Isso não removerá os usuários, mas eles ficarão sem setor.")) return;
        try {
            await deleteDoc(doc(db, "sectors", id));
        } catch (e) {
            alert("Erro ao excluir");
        }
    };

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Setores da Empresa</h1>
                            <p className="text-xs text-gray-500 font-medium">Organize seus atendentes e robôs por departamentos.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSector({ color: colors[0].bg });
                            setIsModalOpen(true);
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} /> Novo Setor
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : sectors.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                        Nenhum setor cadastrado
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sectors.map(s => {
                            const colorObj = colors.find(c => c.bg === s.color) || colors[0];
                            return (
                                <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${s.color}`} />

                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 ${colorObj.light} ${colorObj.text} rounded-2xl`}>
                                            <LayoutGrid size={24} />
                                        </div>
                                        <span className={`px-3 py-1 ${s.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'} text-[10px] font-black rounded-full uppercase tracking-tighter`}>
                                            {s.active ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-gray-800 mb-1 uppercase tracking-tight">{s.name}</h3>
                                    <p className="text-xs text-gray-500 mb-6 font-medium line-clamp-2">{s.description || 'Sem descrição definida.'}</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 text-gray-400" title="Usuários">
                                                <Users size={14} />
                                                <span className="text-[10px] font-black tracking-widest">--</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-400" title="Robôs">
                                                <Bot size={14} />
                                                <span className="text-[10px] font-black tracking-widest">--</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => { setEditingSector(s); setIsModalOpen(true); }}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSector(s.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sector Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-indigo-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{editingSector?.id ? 'Editar Setor' : 'Novo Setor'}</h2>
                                    <p className="text-xs text-gray-500 font-medium italic">Configure os detalhes do departamento.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingSector(null); }}
                                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl border border-gray-200 transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome do Setor</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Comercial, Suporte Técnico..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={editingSector?.name || ''}
                                    onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Descrição</label>
                                <textarea
                                    rows={3}
                                    placeholder="Breve descrição das responsabilidades deste setor."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                    value={editingSector?.description || ''}
                                    onChange={(e) => setEditingSector({ ...editingSector, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cor de Identificação</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {colors.map(c => (
                                        <button
                                            key={c.bg}
                                            onClick={() => setEditingSector({ ...editingSector, color: c.bg })}
                                            className={`p-4 rounded-xl transition-all border-2 ${editingSector?.color === c.bg ? 'border-gray-800 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className={`w-full h-4 rounded-full ${c.bg}`} />
                                            <span className="text-[9px] font-bold uppercase tracking-tighter mt-1 block">{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Visibilidade</h4>
                                    <p className="text-[11px] text-gray-600 font-bold">Setor ativo para atendimentos?</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={editingSector?.active ?? true}
                                        onChange={(e) => setEditingSector({ ...editingSector, active: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                        </div>

                        <footer className="px-8 py-6 border-t border-gray-100 bg-[#f8fafc] flex gap-4 shrink-0">
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingSector(null); }}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveSector}
                                className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> SALVAR SETOR
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

export default SectorsView;
