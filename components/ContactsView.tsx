
import React from 'react';
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
  Phone
} from 'lucide-react';

const ContactsView: React.FC = () => {
  const contacts = Array.from({ length: 12 }, (_, i) => ({
    id: `(91) 8198-8520`,
    atendente: `(Comercial Pará)`,
    tag: i === 0 ? 'Nacional' : (i === 4 ? 'Interessado +4' : (i === 8 ? 'Interessado' : null))
  }));

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2 text-blue-500">
          <Users size={20} />
          <h1 className="text-lg font-bold">Contatos</h1>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-blue-500 text-blue-500 rounded text-[11px] font-bold hover:bg-blue-50 transition-colors uppercase">
          <Plus size={14} strokeWidth={3} /> Abrir Filtro
        </button>
      </div>

      <div className="px-6 py-4 flex items-center justify-between shrink-0">
        <div className="text-sm font-bold text-gray-700">8048 Contatos</div>
        <div className="flex items-center gap-2">
          <button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 transition-colors uppercase">
            <Download size={14} /> Importar
          </button>
          <button className="bg-black hover:bg-gray-900 text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 transition-colors uppercase">
            <Plus size={14} /> Adicionar
          </button>
          <button className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 transition-colors uppercase">
            <Share2 size={14} /> Exportar
          </button>
          <button className="bg-[#10b981] hover:bg-[#059669] text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 transition-colors uppercase">
            <Plus size={14} /> Novo Grupo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-4 px-2 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
              <th className="py-4 px-2 w-16"></th>
              <th className="py-4 px-2">Nome</th>
              <th className="py-4 px-2">ID</th>
              <th className="py-4 px-2">Atendente</th>
              <th className="py-4 px-2">Email</th>
              <th className="py-4 px-2">Tags</th>
              <th className="py-4 px-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, idx) => (
              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-2 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                <td className="py-4 px-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    <Users size={20} />
                  </div>
                </td>
                <td className="py-4 px-2 text-sm text-gray-700"></td>
                <td className="py-4 px-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center text-white">
                      <Phone size={10} fill="white" />
                    </div>
                    {contact.id}
                  </div>
                </td>
                <td className="py-4 px-2 text-sm text-gray-500 font-medium">{contact.atendente}</td>
                <td className="py-4 px-2"></td>
                <td className="py-4 px-2">
                  {contact.tag && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      contact.tag.includes('Nacional') ? 'bg-emerald-500 text-white' : 
                      'bg-[#a855f7] text-white'
                    }`}>
                      {contact.tag}
                    </span>
                  )}
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center justify-end gap-3 text-gray-400">
                    <button className="hover:text-[#25D366]"><Phone size={16} /></button>
                    <button className="hover:text-blue-500"><Edit2 size={16} /></button>
                    <button className="hover:text-gray-700"><List size={16} /></button>
                    <button className="hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContactsView;
