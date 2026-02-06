
import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Search,
    Calendar,
    Clock,
    User,
    Mail,
    Smartphone,
    Filter,
    ArrowUpDown,
    CheckCircle2
} from 'lucide-react';
import { db } from '../firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    limit
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoginAudit {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: any;
    userAgent: string;
    platform: string;
    action: string;
}

const AuditView: React.FC = () => {
    const [audits, setAudits] = useState<LoginAudit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "login_audits"),
            orderBy("timestamp", "desc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const auditData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LoginAudit));
            setAudits(auditData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredAudits = audits.filter(audit =>
        audit.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-8 bg-white border-b border-gray-100 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Auditoria de Login</h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Segurança e Controle de Acesso</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Usuário</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Data e Hora</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Dispositivo / Sistema</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredAudits.length > 0 ? (
                                        filteredAudits.map((audit) => (
                                            <tr key={audit.id} className="group hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-200">
                                                            {audit.userName?.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{audit.userName}</p>
                                                            <p className="text-xs font-medium text-gray-400">{audit.userEmail}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-gray-700">
                                                            <Calendar size={14} className="text-emerald-500" />
                                                            <span className="text-xs font-bold">
                                                                {audit.timestamp?.toDate ? format(audit.timestamp.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '---'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-400">
                                                            <Clock size={14} />
                                                            <span className="text-[11px] font-medium">
                                                                {audit.timestamp?.toDate ? format(audit.timestamp.toDate(), "HH:mm:ss") : '---'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                                            <Smartphone size={16} />
                                                        </div>
                                                        <div className="max-w-[200px]">
                                                            <p className="text-[11px] font-bold text-gray-600 truncate" title={audit.userAgent}>
                                                                {audit.userAgent || 'Não identificado'}
                                                            </p>
                                                            <p className="text-[10px] uppercase font-black text-emerald-600 tracking-widest mt-0.5">
                                                                {audit.platform || 'WEB'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                        <CheckCircle2 size={12} />
                                                        {audit.action || 'LOGIN_SUCCESS'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                                                        <ShieldCheck size={48} />
                                                    </div>
                                                    <p className="text-gray-400 font-medium">Nenhum registro de auditoria encontrado.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default AuditView;
