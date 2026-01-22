
import React, { useState, useEffect } from 'react';
import {
    Tag,
    Plus,
    Trash2,
    Edit2,
    X,
    Save,
    Search,
    Hash
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface TagData {
    id: string;
    name: string;
    color: string;
    count?: number;
    updatedAt: any;
}

const TagsView: React.FC = () => {
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Partial<TagData> | null>(null);

    const colors = [
        { name: 'Gray', bg: 'bg-gray-500', text: 'text-white' },
        { name: 'Blue', bg: 'bg-blue-500', text: 'text-white' },
        { name: 'Emerald', bg: 'bg-emerald-500', text: 'text-white' },
        { name: 'Indigo', bg: 'bg-indigo-500', text: 'text-white' },
        { name: 'Violet', bg: 'bg-violet-500', text: 'text-white' },
        { name: 'Rose', bg: 'bg-rose-500', text: 'text-white' },
        { name: 'Amber', bg: 'bg-amber-500', text: 'text-white' },
        { name: 'Orange', bg: 'bg-orange-500', text: 'text-white' },
        { name: 'Cyan', bg: 'bg-cyan-500', text: 'text-white' },
        { name: 'Lime', bg: 'bg-lime-500', text: 'text-white' },
        { name: 'Red', bg: 'bg-red-600', text: 'text-white' },
        { name: 'Yellow', bg: 'bg-yellow-400', text: 'text-gray-800' },
    ];

    useEffect(() => {
        const q = query(collection(db, "tags"), orderBy("name", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setTags(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TagData)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSaveTag = async () => {
        if (!editingTag?.name) return alert("Dê um nome à tag!");

        const id = editingTag.id || `tag_${Date.now()}`;
        const tagData = {
            ...editingTag,
            id,
            color: editingTag.color || colors[0].bg,
            updatedAt: serverTimestamp(),
            count: editingTag.count || 0
        };

        try {
            await setDoc(doc(db, "tags", id), tagData);
            setIsModalOpen(false);
            setEditingTag(null);
        } catch (e) {
            alert("Erro ao salvar tag");
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!confirm("Excluir esta tag permanentemente?")) return;
        try {
            await deleteDoc(doc(db, "tags", id));
        } catch (e) {
            alert("Erro ao excluir");
        }
    };

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full w-full bg-white flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className="px-8 py-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                            <Tag size={22} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Tags</h1>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTag({ color: colors[0].bg });
                            setIsModalOpen(true);
                        }}
                        className="bg-[#00a3ff] text-white px-6 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-100"
                    >
                        <Plus size={16} strokeWidth={3} /> Adicionar Tag
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                        <tr>
                            <th className="px-8 py-4 w-12 text-center pointer-events-none">
                                <input type="checkbox" className="rounded border-gray-300" disabled />
                            </th>
                            <th className="px-4 py-4">Nome</th>
                            <th className="px-4 py-4 text-center">Número de contatos</th>
                            <th className="px-8 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filteredTags.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                    Nenhuma tag encontrada
                                </td>
                            </tr>
                        ) : filteredTags.map(tag => (
                            <tr key={tag.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-8 py-4 text-center">
                                    <input type="checkbox" className="rounded border-gray-300 pointer-events-none" />
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-tight ${tag.color} ${colors.find(c => c.bg === tag.color)?.text || 'text-white shadow-sm'}`}>
                                        {tag.name}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="text-sm font-bold text-gray-500">{tag.count || 0}</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingTag(tag); setIsModalOpen(true); }}
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Tag Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{editingTag?.id ? 'Editar Tag' : 'Nova Tag'}</h2>
                                    <p className="text-xs text-gray-400 font-medium italic">Personalize sua etiqueta de organização.</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingTag(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome da Etiqueta</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Urgente, Lead Frio, Pago..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={editingTag?.name || ''}
                                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cor</label>
                                <div className="grid grid-cols-6 gap-3">
                                    {colors.map(c => (
                                        <button
                                            key={c.bg}
                                            onClick={() => setEditingTag({ ...editingTag, color: c.bg })}
                                            className={`w-full aspect-square rounded-xl transition-all border-4 ${editingTag?.color === c.bg ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                            style={{ backgroundColor: c.bg.includes('-') ? '' : c.bg }}
                                        >
                                            <div className={`w-full h-full rounded-lg ${c.bg}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button
                                    onClick={() => { setIsModalOpen(false); setEditingTag(null); }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleSaveTag}
                                    className="flex-[2] bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> SALVAR TAG
                                </button>
                            </div>
                        </div>
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

export default TagsView;
