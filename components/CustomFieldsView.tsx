
import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Settings,
    Type,
    Hash,
    CheckSquare,
    AlignLeft,
    Save,
    X,
    Database,
    AlertCircle,
    ListFilter
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export type CustomFieldType = 'string' | 'boolean' | 'text' | 'number' | 'select';

export interface CustomField {
    id: string;
    label: string;
    type: CustomFieldType;
    placeholder?: string;
    required: boolean;
    active: boolean;
    options?: string[]; // Para campos do tipo 'select'
    updatedAt: any;
}

const CustomFieldsView: React.FC = () => {
    const [fields, setFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<Partial<CustomField> | null>(null);

    useEffect(() => {
        const q = query(collection(db, "custom_fields"), orderBy("label", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setFields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomField)));
            setLoading(false);
        });
        return unsub;
    }, []);

    const handleSaveField = async () => {
        if (!editingField?.label || !editingField?.type) {
            return alert("Preencha o nome e o tipo do campo!");
        }

        const id = editingField.id || `field_${Date.now()}`;
        const fieldData = {
            ...editingField,
            id,
            active: editingField.active ?? true,
            required: editingField.required ?? false,
            updatedAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, "custom_fields", id), fieldData);
            setIsModalOpen(false);
            setEditingField(null);
        } catch (e) {
            alert("Erro ao salvar campo");
        }
    };

    const handleDeleteField = async (id: string) => {
        if (!confirm("Excluir este campo personalizado? Isso não apagará os dados já preenchidos nos contatos, mas o campo não aparecerá mais.")) return;
        try {
            await deleteDoc(doc(db, "custom_fields", id));
        } catch (e) {
            alert("Erro ao excluir");
        }
    };

    const getTypeIcon = (type: CustomFieldType) => {
        switch (type) {
            case 'string': return <Type size={18} className="text-blue-500" />;
            case 'number': return <Hash size={18} className="text-orange-500" />;
            case 'boolean': return <CheckSquare size={18} className="text-emerald-500" />;
            case 'text': return <AlignLeft size={18} className="text-purple-500" />;
            case 'select': return <ListFilter size={18} className="text-amber-500" />;
            default: return <Database size={18} />;
        }
    };

    const getTypeName = (type: CustomFieldType) => {
        switch (type) {
            case 'string': return 'Texto Curto';
            case 'number': return 'Número';
            case 'boolean': return 'Booleano (Sim/Não)';
            case 'text': return 'Texto Longo';
            case 'select': return 'Menu Suspenso';
            default: return type;
        }
    };

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Database size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Campos Personalizados</h1>
                            <p className="text-xs text-gray-500 font-medium">Configure campos adicionais para coletar dados dos seus contatos.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingField({ type: 'string', active: true, required: false });
                            setIsModalOpen(true);
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} /> Novo Campo
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : fields.length === 0 ? (
                    <div className="max-w-2xl mx-auto py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-10">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Database size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">Nenhum campo personalizado</h3>
                        <p className="text-sm text-gray-400 mb-8">Crie campos para armazenar informações específicas como CPF, Endereço, Data de Nascimento, etc.</p>
                        <button
                            onClick={() => {
                                setEditingField({ type: 'string', active: true, required: false });
                                setIsModalOpen(true);
                            }}
                            className="text-indigo-600 font-bold text-sm uppercase tracking-widest hover:underline"
                        >
                            Criar meu primeiro campo
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fields.map(field => (
                            <div key={field.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                {!field.active && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                        <span className="bg-gray-800 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">DESATIVADO</span>
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                        {getTypeIcon(field.type)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-tighter ${field.type === 'string' ? 'bg-blue-50 text-blue-600' :
                                            field.type === 'number' ? 'bg-orange-50 text-orange-600' :
                                                field.type === 'boolean' ? 'bg-emerald-50 text-emerald-600' :
                                                    field.type === 'select' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-purple-50 text-purple-600'
                                            }`}>
                                            {getTypeName(field.type)}
                                        </span>
                                        {field.required && (
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Obrigatório</span>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-1">{field.label}</h3>
                                <p className="text-xs text-gray-400 font-medium truncate mb-4">
                                    {field.placeholder || 'Sem marcador (placeholder)'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <span className="text-[9px] font-black text-gray-300 uppercase font-mono">{field.id}</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingField(field); setIsModalOpen(true); }}
                                            className="p-2 bg-gray-50 text-indigo-600 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteField(field.id)}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#f8fafc]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                                        {editingField?.id ? 'Editar Campo' : 'Novo Campo'}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium italic">Configure como o campo deve aparecer.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingField(null); }}
                                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl border border-gray-200 transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8">
                            {/* Nome */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome do Campo</label>
                                <input
                                    type="text"
                                    placeholder="Ex: CPF, Data de Nascimento, Empresa..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={editingField?.label || ''}
                                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                                />
                            </div>

                            {/* Tipo */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Tipo de Dado</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'string', label: 'Texto Curto', icon: Type },
                                        { id: 'text', label: 'Texto Longo', icon: AlignLeft },
                                        { id: 'number', label: 'Número', icon: Hash },
                                        { id: 'boolean', label: 'Sim/Não', icon: CheckSquare },
                                        { id: 'select', label: 'Menu Suspenso', icon: ListFilter },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setEditingField({ ...editingField, type: type.id as CustomFieldType })}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${editingField?.type === type.id
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                                : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            <type.icon size={20} className={editingField?.type === type.id ? 'text-indigo-600' : 'text-gray-400'} />
                                            <span className="text-xs font-bold uppercase tracking-tight">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options for Select */}
                            {editingField?.type === 'select' && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Opções do Menu</label>
                                    <div className="space-y-2">
                                        {(editingField.options || []).map((option, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(editingField.options || [])];
                                                        newOptions[index] = e.target.value;
                                                        setEditingField({ ...editingField, options: newOptions });
                                                    }}
                                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newOptions = (editingField.options || []).filter((_, i) => i !== index);
                                                        setEditingField({ ...editingField, options: newOptions });
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newOptions = [...(editingField.options || []), ''];
                                                setEditingField({ ...editingField, options: newOptions });
                                            }}
                                            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-black text-gray-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition-all"
                                        >
                                            + Adicionar Opção
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Placeholder */}
                            {editingField?.type !== 'boolean' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Marcador (Placeholder)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Digite o CPF..."
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={editingField?.placeholder || ''}
                                        onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Toggles */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">Ativo</p>
                                        <p className="text-[10px] text-gray-400">Mostrar este campo nos formulários</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={editingField?.active !== false}
                                            onChange={(e) => setEditingField({ ...editingField, active: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">Obrigatório</p>
                                        <p className="text-[10px] text-gray-400">Exigir preenchimento deste campo</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={editingField?.required === true}
                                            onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                    Os campos personalizados serão exibidos na tela de detalhes do contato e poderão ser preenchidos pelos agentes durante o atendimento.
                                </p>
                            </div>
                        </div>

                        <footer className="px-8 py-6 border-t border-gray-100 bg-[#f8fafc] flex gap-4 shrink-0">
                            <button
                                onClick={() => { setIsModalOpen(false); setEditingField(null); }}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveField}
                                className="flex-[2] bg-indigo-500 text-white font-bold py-4 rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> SALVAR CAMPO
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomFieldsView;
