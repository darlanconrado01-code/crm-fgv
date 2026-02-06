
import React, { useState, useEffect } from 'react';
import {
  Users,
  Download,
  Plus,
  FileText,
  Share2,
  Filter,
  MessageSquare,
  Edit2,
  List,
  Trash2,
  Phone,
  X,
  Save,
  User,
  Globe,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  User2,
  Users2,
  Upload,
  Check,
  Tag,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { useNotification } from './Notification';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

interface Contact {
  id: string;
  name: string;
  phone: string;
  remoteJidAlt?: string;
  lastMessage?: string;
  updatedAt?: any;
  avatarUrl?: string;
  [key: string]: any; // Para campos personalizados dinâmicos
}

interface CustomField {
  id: string;
  label: string;
  type: string;
  active: boolean;
  scope?: 'contact' | 'company'; // Adicionado para agrupar campos
}

const ContactsView: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { notify, confirm } = useNotification();

  // Estados para Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showFullRegistration, setShowFullRegistration] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Estados de Importação Avançada
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [showMappingStep, setShowMappingStep] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Estados para Seleção e Filtros
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'all' | 'private' | 'group'>('all');
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState('');

  useEffect(() => {
    // Escutar Contatos
    const q = query(collection(db, "contacts"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Contact[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contact));
      setContacts(list);
      setLoading(false);
    });

    // Escutar Campos Personalizados
    const qFields = query(collection(db, "custom_fields"));
    const unsubFields = onSnapshot(qFields, (snapshot) => {
      const fields = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CustomField))
        .filter(f => f.active !== false);
      setCustomFields(fields);
    });

    return () => {
      unsubscribe();
      unsubFields();
    };
  }, []);

  // Helper para exclusão profunda (Deep Delete)
  const deepDeleteContact = async (id: string) => {
    // 1. Excluir subcoleções do Chat (messages, appointment_suggestions)
    // Nota: O client SDK não deleta recursivo, então limpamos manualmente
    const deleteSubcollection = async (sub: string) => {
      const ref = collection(db, "chats", id, sub);
      const snap = await getDocs(ref);
      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    };

    await deleteSubcollection("messages");
    await deleteSubcollection("appointment_suggestions");

    // 2. Excluir documentos principais via Batch
    const batchMain = writeBatch(db);
    batchMain.delete(doc(db, "contacts", id));
    batchMain.delete(doc(db, "chats", id));
    await batchMain.commit();
  };

  const handleDelete = async (id: string) => {
    if (await confirm({
      title: 'Excluir Contato e Histórico',
      message: 'Tem certeza? Isso excluirá o contato e TODO o histórico de conversas permanentemente.',
      type: 'danger',
      confirmText: 'Excluir Tudo'
    })) {
      try {
        await deepDeleteContact(id);
        notify("Contato e histórico excluídos com sucesso!", "success");
      } catch (e) {
        console.error(e);
        notify("Erro ao excluir contato e histórico.", "error");
      }
    }
  };


  const handleSaveEdit = async () => {
    if (!editingContact) return;

    try {
      const contactRef = doc(db, "contacts", editingContact.id);
      const { id, ...updateData } = editingContact;

      await updateDoc(contactRef, updateData);

      // Também tentar atualizar no chat se existir
      try {
        const chatRef = doc(db, "chats", editingContact.id);
        await updateDoc(chatRef, {
          name: editingContact.name,
          avatarUrl: editingContact.avatarUrl || null
        });
      } catch (e) {
        // Ignora se chat não existir
      }

      setIsEditModalOpen(false);
      setEditingContact(null);
      notify("Contato atualizado com sucesso!", "success");
    } catch (e) {
      notify("Erro ao atualizar contato.", "error");
    }
  };

  const filteredContacts = contacts.filter(c => {
    const searchMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.id.includes(searchTerm);

    const isGroup = c.isGroup || c.id.includes('@g.us');
    if (typeFilter === 'private' && isGroup) return false;
    if (typeFilter === 'group' && !isGroup) return false;

    return searchMatch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };


  const handleBulkDelete = async () => {
    if (await confirm({
      title: 'Excluir em Massa',
      message: `Tem certeza que deseja excluir ${selectedIds.size} contatos selecionados e todo o histórico?`,
      type: 'danger',
      confirmText: 'Excluir Todos'
    })) {
      try {
        const ids = Array.from(selectedIds);
        // Executar um por um para garantir limpeza profunda
        for (const id of ids) {
          await deepDeleteContact(id as string);
        }

        setSelectedIds(new Set());
        notify(`${selectedIds.size} contatos e históricos excluídos.`, "success");
      } catch (e) {
        console.error(e);
        notify("Erro na exclusão em massa.", "error");
      }
    }
  };

  const handleBulkAddTag = async () => {
    if (!bulkTag) return;
    try {
      const batch = Array.from(selectedIds).map(async (id) => {
        const contact = contacts.find(c => c.id === id);
        const tags = Array.from(new Set([...(contact?.tags || []), bulkTag]));
        return updateDoc(doc(db, "contacts", id as string), { tags });
      });
      await Promise.all(batch);
      setSelectedIds(new Set());
      setBulkTagModalOpen(false);
      setBulkTag('');
      notify("Tags adicionadas com sucesso.", "success");
    } catch (e) {
      notify("Erro ao adicionar tags.", "error");
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0
      ? contacts.filter(c => selectedIds.has(c.id))
      : filteredContacts;

    const headers = ["ID", "Nome", "Telefone", "Etiquetas", "Avatar URL"];
    const rows = dataToExport.map(c => [
      c.id,
      c.name || "",
      c.phone || "",
      (c.tags || []).join(", "),
      c.avatarUrl || ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `contatos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateContact = async (data: any) => {
    if (!data.id || !data.name) return notify("Preencha nome e ID/Telefone!", "error");
    const id = data.id.includes('@') ? data.id : `${data.id.replace(/\D/g, '')}@s.whatsapp.net`;
    try {
      await updateDoc(doc(db, "contacts", id), {
        ...data,
        id,
        updatedAt: serverTimestamp()
      });
      setIsNewModalOpen(false);
      notify("Contato criado com sucesso!", "success");
    } catch (e) {
      // Se não existir, cria
      try {
        const { setDoc, serverTimestamp } = await import('firebase/firestore');
        await setDoc(doc(db, "contacts", id), {
          ...data,
          id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setIsNewModalOpen(false);
        notify("Contato cadastrado!", "success");
      } catch (err) {
        notify("Erro ao criar contato.", "error");
      }
    }
  };

  return (
    <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
      {/* Header Premium */}
      <div className="px-8 py-6 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Gestão de Contatos</h1>
              <p className="text-xs text-gray-500 font-medium">Visualize e edite as informações dos seus leads.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar contato..."
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all active:scale-95 shadow-lg"
            >
              <Plus size={16} /> Novo Contato
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg"
            >
              <Upload size={16} /> Importar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${typeFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('private')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${typeFilter === 'private' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                Privado
              </button>
              <button
                onClick={() => setTypeFilter('group')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${typeFilter === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                Grupos
              </button>
            </div>
            {contacts.slice(0, 5).map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                {c.avatarUrl ? <img src={c.avatarUrl} className="w-full h-full rounded-full object-cover" /> : c.name?.charAt(0)}
              </div>
            ))}
            {contacts.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">
                +{contacts.length - 5}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contatos na Base</span>

          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Exportar CSV"><Download size={20} /></button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 px-8 py-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4 text-white">
            <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
            <span className="text-sm font-black uppercase tracking-widest">{selectedIds.size} selecionados</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBulkTagModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2"
            >
              <Tag size={14} /> Adicionar Tag
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Trash2 size={14} /> Excluir Seleção
            </button>
          </div>
        </div>
      )}

      {/* Lista Estilizada */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                <th className="py-5 px-8 w-16 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredContacts.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-5 px-4 w-16 text-center">Tipo</th>
                <th className="py-5 px-4 w-16">Foto</th>
                <th className="py-5 px-4">Nome e Telefone</th>
                <th className="py-5 px-4">ID / JID</th>
                <th className="py-5 px-4">Status / Tags</th>
                <th className="py-5 px-8 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : filteredContacts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum contato encontrado</td></tr>
              ) : filteredContacts.map((contact, idx) => (
                <tr key={contact.id} className={`hover:bg-blue-50/30 transition-all group group/row ${selectedIds.has(contact.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-5 px-8 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelectOne(contact.id)}
                    />
                  </td>
                  <td className="py-5 px-4 text-center">
                    {(contact.isGroup || contact.id.includes('@g.us')) ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto" title="Grupo">
                        <Users2 size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto" title="Privado">
                        <User2 size={16} />
                      </div>
                    )}
                  </td>
                  <td className="py-5 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 font-black text-lg border border-blue-100 overflow-hidden shadow-sm">
                      {contact.avatarUrl ? (
                        <img src={contact.avatarUrl} className="w-full h-full object-cover" />
                      ) : contact.name?.charAt(0) || 'U'}
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-800 tracking-tight">{contact.name}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                          <Phone size={8} fill="white" />
                        </div>
                        <span className="text-xs font-bold text-gray-500">{contact.phone || contact.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded-lg w-fit">
                        {contact.remoteJidAlt || contact.id + '@s.whatsapp.net'}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.map((tag: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded-md uppercase">
                          {tag}
                        </span>
                      )) || <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">Sem etiquetas</span>}
                    </div>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingContact({ ...contact }); setIsEditModalOpen(true); }}
                        className="p-2.5 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 transition-all shadow-sm"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-2.5 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-gray-100 transition-all shadow-sm"
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
      </div>

      {/* Modal de Edição Ultra Premium */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#f8fafc]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Editar Perfil</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Gerencie os dados básicos e personalizados.</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingContact(null); }}
                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl border border-gray-200 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {/* Avatar e Nome Principal */}
              <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-blue-500 overflow-hidden">
                    {editingContact.avatarUrl ? <img src={editingContact.avatarUrl} className="w-full h-full object-cover" /> : editingContact.name?.charAt(0)}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                    <Plus size={14} />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome do Lead</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={editingContact.name || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Telefone / ID</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      disabled
                      className="w-full bg-gray-100 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-500 cursor-not-allowed outline-none"
                      value={editingContact.phone || editingContact.id}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Avatar URL</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="https://..."
                    value={editingContact.avatarUrl || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, avatarUrl: e.target.value })}
                  />
                </div>
              </div>

              {/* CAMPOS PERSONALIZADOS */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <List size={16} className="text-blue-500" /> Campos Personalizados
                  </h3>
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Sincronizado com n8n</span>
                </div>

                {customFields.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhum campo personalizado cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {['contact', 'company'].map(scope => {
                      const filtered = customFields.filter(f => (f.scope || 'contact') === scope);
                      if (filtered.length === 0) return null;

                      return (
                        <div key={scope} className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            {scope === 'contact' ? <User2 size={14} className="text-blue-500" /> : <Building size={14} className="text-emerald-500" />}
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {scope === 'contact' ? 'Dados Únicos do Usuário' : 'Dados Corporativos / Empresa'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {filtered.map(field => (
                              <div key={field.id} className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                <input
                                  type="text"
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                  placeholder={`Preencher ${field.label}...`}
                                  value={editingContact[field.id] || ''}
                                  onChange={(e) => setEditingContact({ ...editingContact, [field.id]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notificação Visual */}
              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Alterar estes campos impactará diretamente nos gatilhos de automação e na personalização das mensagens enviadas pela IA.
                </p>
              </div>
            </div>

            <footer className="px-8 py-6 border-t border-gray-100 bg-[#f8fafc] flex gap-4 shrink-0">
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingContact(null); }}
                className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={18} /> ATUALIZAR CONTATO
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Novo Contato */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <header className="px-10 py-8 bg-gray-50 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"><Plus size={24} /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">Novo Contato</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Cadastro rápido ou completo</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X size={24} /></button>
            </header>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data: any = {
                name: formData.get('name'),
                id: formData.get('id'),
                phone: formData.get('id'),
                tags: []
              };

              // Coletar campos personalizados se for modo completo
              if (showFullRegistration) {
                customFields.forEach(f => {
                  const val = formData.get(`custom_${f.id}`);
                  if (val) data[f.id] = val;
                });
              }

              handleCreateContact(data);
            }} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome Completo *</label>
                  <input name="name" required placeholder="Ex: João Silva" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Telefone (DDI + DDD + Nº) *</label>
                  <input name="id" required placeholder="5511999999999" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <List size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-blue-800 tracking-tight">Cadastro Completo</h4>
                    <p className="text-[9px] text-blue-600 font-bold opacity-70">Preencher campos personalizados agora?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullRegistration(!showFullRegistration)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showFullRegistration ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showFullRegistration ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {showFullRegistration && (
                <div className="space-y-6 pt-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Tag size={14} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações Adicionais</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {customFields.map(f => (
                      <div key={f.id} className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{f.label}</label>
                        <input
                          name={`custom_${f.id}`}
                          placeholder={`Informar ${f.label.toLowerCase()}...`}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    ))}
                    {customFields.length === 0 && (
                      <p className="text-[10px] text-gray-400 text-center italic py-4">Nenhum campo personalizado configurado.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Adição de Tag em Massa */}
      {bulkTagModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2"><Tag className="text-blue-600" /> Adicionar Tag</h3>
            <p className="text-xs text-gray-400 mb-6 font-medium">Isso adicionará uma nova tag para os {selectedIds.size} contatos selecionados.</p>
            <input
              autoFocus
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              placeholder="Ex: Cliente VIP..."
              className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setBulkTagModalOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-400">Cancelar</button>
              <button onClick={handleBulkAddTag} className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg">ADICIONAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação Avançada */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <header className="px-10 py-8 bg-gray-50 flex items-center justify-between shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><Upload size={24} /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">Importar Base</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {!showMappingStep ? 'Selecione o arquivo CSV' : 'Mapeie as colunas da sua planilha'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsImportModalOpen(false); setShowMappingStep(false); setImportFile(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X size={24} /></button>
            </header>

            {!showMappingStep ? (
              <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                <div
                  className="p-12 border-2 border-dashed border-gray-200 rounded-[2.5rem] text-center hover:border-indigo-400 transition-all bg-gray-50/50 cursor-pointer group"
                  onClick={() => document.getElementById('fileImport')?.click()}
                >
                  <div className="w-20 h-20 bg-white shadow-xl rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <FileText size={32} className="text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight mb-2">Arraste sua planilha aqui</h3>
                  <p className="text-xs text-gray-500 font-medium">Suporta apenas arquivos .CSV com separador ";" ou ","</p>
                  <input
                    id="fileImport"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        const delimiter = text.includes(';') ? ';' : ',';
                        const lines = text.split('\n').filter(l => l.trim());
                        if (lines.length < 1) return alert("Arquivo vazio!");

                        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
                        const rows = lines.slice(1).map(l => l.split(delimiter).map(c => c.trim().replace(/"/g, '')));

                        setImportHeaders(headers);
                        setImportRows(rows);
                        setImportFile(file);

                        // Auto mapping
                        const initialMapping: Record<string, string> = {};
                        headers.forEach(h => {
                          const lower = h.toLowerCase();
                          if (lower.includes('nome')) initialMapping['name'] = h;
                          if (lower.includes('telefone') || lower.includes('id') || lower.includes('whatsapp')) initialMapping['id'] = h;
                        });
                        setMapping(initialMapping);
                        setShowMappingStep(true);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>

                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-amber-800 tracking-tight">Dica Importante</h4>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-1">
                      Certifique-se de que a coluna de telefone tenha o código do país (ex: 55 para Brasil).
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      Mapeamento de Campos
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Campos Fixos */}
                      <div className="flex items-center gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campo no Sistema: <span className="text-blue-600">NOME</span></label>
                          <select
                            className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none"
                            value={mapping['name']}
                            onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                          >
                            <option value="">-- Não importar --</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campo no Sistema: <span className="text-blue-600">TELEFONE / ID</span></label>
                          <select
                            className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none"
                            value={mapping['id']}
                            onChange={(e) => setMapping({ ...mapping, id: e.target.value })}
                          >
                            <option value="">-- Não importar --</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Campos Personalizados */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pr-2">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campos Personalizados (Opcional)</h4>
                          <button
                            onClick={async () => {
                              const label = prompt("Nome do novo campo:");
                              if (!label) return;
                              const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                              try {
                                await setDoc(doc(db, "custom_fields", id), {
                                  id, label, active: true, type: 'text', scope: 'contact', updatedAt: serverTimestamp()
                                });
                                notify("Campo criado com sucesso!", "success");
                              } catch (e) { notify("Erro ao criar campo.", "error"); }
                            }}
                            className="text-[9px] font-black text-indigo-600 uppercase tracking-tight hover:underline flex items-center gap-1"
                          >
                            <PlusCircle size={12} /> Criar Novo Campo
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {customFields.map(f => (
                            <div key={f.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">{f.label}</label>
                              <select
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                value={mapping[f.id] || ''}
                                onChange={(e) => setMapping({ ...mapping, [f.id]: e.target.value })}
                              >
                                <option value="">-- Não importar --</option>
                                {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="p-10 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
                  <button
                    onClick={() => setShowMappingStep(false)}
                    className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest hover:bg-white rounded-2xl border border-transparent hover:border-gray-200 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      if (!mapping['name'] || !mapping['id']) return notify("Mapeie Nome e Telefone!", "error");
                      setIsImporting(true);
                      try {
                        let successCount = 0;
                        for (const row of importRows) {
                          const contactData: any = {};

                          // Mapear campos baseados na regra do usuário
                          Object.entries(mapping).forEach(([systemKey, csvHeader]) => {
                            if (!csvHeader) return;
                            const headerIndex = importHeaders.indexOf(csvHeader);
                            if (headerIndex !== -1) contactData[systemKey] = row[headerIndex];
                          });

                          if (!contactData.name || !contactData.id) continue;

                          const id = contactData.id.includes('@') ? contactData.id : `${contactData.id.replace(/\D/g, '')}@s.whatsapp.net`;
                          await setDoc(doc(db, "contacts", id), {
                            ...contactData,
                            id,
                            phone: contactData.id,
                            updatedAt: serverTimestamp()
                          }, { merge: true });
                          successCount++;
                        }
                        notify(`${successCount} contatos importados com sucesso!`, "success");
                        setIsImportModalOpen(false);
                        setShowMappingStep(false);
                      } catch (err) {
                        notify("Erro na importação.", "error");
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    disabled={isImporting}
                    className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {isImporting ? "IMPORTANDO..." : "INICIAR IMPORTAÇÃO"}
                  </button>
                </footer>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ContactsView;
