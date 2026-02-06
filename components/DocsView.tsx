
import React, { useState } from 'react';
import {
    BookOpen,
    Search,
    Code,
    Globe,
    Shield,
    Copy,
    Check,
    ChevronRight,
    ChevronDown,
    Lock,
    Zap,
    MessageSquare,
    Users,
    BarChart2,
    Database,
    Calendar,
    Settings,
    Trash2,
    ExternalLink,
    Smartphone
} from 'lucide-react';

interface Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    description: string;
}

interface DocSection {
    title: string;
    icon: any;
    endpoints: Endpoint[];
}

const DocsView: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedPath, setCopiedPath] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('Autenticação');
    const [userApiKey, setUserApiKey] = useState('');
    const [showCurlFor, setShowCurlFor] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPath(text);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    const generateCurl = (method: string, path: string) => {
        // Base URL logic: Local SDR runs on 3021, Vite on 3020. 
        // We suggest hitting the origin (Vite) because it proxies to the SDR.
        // In production, hits the root as well.
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://comversa.online';
        const apiKey = userApiKey || 'cv_vpdmp2uusecjze6w0vs6';

        let curl = `curl --request ${method} \\\n  --url '${baseUrl}${path}' \\\n  --header 'Authorization: Bearer ${apiKey}' \\\n  --header 'Content-Type: application/json'`;

        if (method !== 'GET' && method !== 'DELETE') {
            const data: any = {
                chatId: "55..."
            };
            if (path.includes('n8n-action')) {
                data.action = "updateStatus";
                data.data = { status: "aguardando" };
            } else if (path.includes('send')) {
                data.text = "Olá, enviado via API!";
            } else if (path.includes('Receber Imagem')) {
                // Simulação de Payload da Evolution com Imagem
                data.event = "messages.upsert";
                data.data = {
                    key: {
                        remoteJid: "5591988888888@s.whatsapp.net",
                        fromMe: false,
                        id: "TEST_IMG_" + Date.now()
                    },
                    pushName: "Tester",
                    messageType: "imageMessage",
                    message: {
                        imageMessage: {
                            url: "https://example.com/image.jpg",
                            mimetype: "image/jpeg",
                            caption: "Legenda da Foto"
                        }
                    },
                    mediaUrl: "https://github.com/shadcn.png"
                };
                // Ajuste para bater no webhook real
                curl = curl.replace("Receber Imagem", "").replace("/api/webhook", "/api/webhook");
            }
            curl += ` \\\n  --data '${JSON.stringify(data, null, 2).replace(/\n/g, '\n    ')}'`;
        }

        return curl;
    };

    const sections: DocSection[] = [
        {
            title: 'Autenticação e SDR',
            icon: Lock,
            endpoints: [
                { method: 'POST', path: '/api/n8n-action', description: 'Endpoint central para ações do SDR (status, tags, campos, etc).' },
                { method: 'POST', path: '/api/webhook', description: 'Recebe eventos da Evolution API (Webhooks).' },
                { method: 'POST', path: '/api/webhook (Receber Imagem)', description: 'Simula o recebimento de uma imagem via Webhook (Evolution).' },
            ]
        },
        {
            title: 'Mensagens e WhatsApp',
            icon: MessageSquare,
            endpoints: [
                { method: 'POST', path: '/api/send-message', description: 'Envia mensagem de texto ou mídia via Evolution.' },
                { method: 'POST', path: '/api/send/{to}', description: 'Alias rápido para envio de texto.' },
                { method: 'POST', path: '/api/transcribe', description: 'Converte áudio do WhatsApp em texto usando Whisper.' },
                { method: 'POST', path: '/api/sync-profile', description: 'Sincroniza foto e nome do contato da Evolution.' },
            ]
        },
        {
            title: 'Contatos e CRM',
            icon: Users,
            endpoints: [
                { method: 'GET', path: '/api/contacts', description: 'Lista contatos sincronizados no CRM.' },
                { method: 'GET', path: '/api/contacts/{id}', description: 'Busca um contato específico pelo número.' },
                { method: 'POST', path: '/api/contacts', description: 'Cria ou atualiza um contato manualmente.' },
            ]
        },
        {
            title: 'Agenda e Reuniões',
            icon: Calendar,
            endpoints: [
                { method: 'GET', path: '/api/agenda', description: 'Consulta eventos e reuniões agendadas.' },
                { method: 'POST', path: '/api/agenda', description: 'Cria um novo compromisso na agenda.' },
                { method: 'POST', path: '/api/deep-analysis', description: 'Análise profunda da conversa para sugestão de tarefas.' },
            ]
        },
        {
            title: 'Sistema e Arquivos',
            icon: Database,
            endpoints: [
                { method: 'POST', path: '/api/upload-r2', description: 'Faz upload de arquivos para o Cloudflare R2.' },
                { method: 'POST', path: '/api/evaluate-chat', description: 'Avalia e qualifica a conversa usando IA.' },
            ]
        }
    ];

    const filteredSections = sections.map(section => ({
        ...section,
        endpoints: section.endpoints.filter(e =>
            e.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            section.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(section => section.endpoints.length > 0);

    return (
        <div className="h-full w-full bg-[#f8fafc] flex overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-80 bg-white border-r border-gray-100 flex flex-col shrink-0">
                <div className="p-8 border-b border-gray-50 bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Documentação</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Central de Desenvolvedor</p>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar endpoints..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredSections.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => setExpandedSection(section.title)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${expandedSection === section.title ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                        >
                            <section.icon size={18} className={expandedSection === section.title ? 'text-white' : 'text-gray-400'} />
                            <span className="text-xs font-black uppercase tracking-widest">{section.title}</span>
                            <ChevronRight size={14} className={`ml-auto transition-transform ${expandedSection === section.title ? 'rotate-90' : ''}`} />
                        </button>
                    ))}
                </nav>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <Zap size={14} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Base URL</span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-500 break-all bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {typeof window !== 'undefined' ? window.location.origin : 'https://api.seudominio.com'}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Hero Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Code size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">API ComVersa v1.0.0</span>
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">Integração Total</h2>
                        <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl">
                            Utilize nossa API RESTful para conectar seus sistemas ao CRM FGV. Automatize envios, gerencie contatos e sincronize sua agenda de forma simples e segura.
                        </p>

                        {/* API Key Config for Examples */}
                        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
                                    <Shield size={32} />
                                </div>
                                <div className="flex-1 space-y-2 text-center md:text-left">
                                    <h4 className="text-xl font-black uppercase tracking-tight">Personalize seus Exemplos</h4>
                                    <p className="text-blue-100 text-sm font-medium opacity-80">Insira sua API Key abaixo para gerar comandos cURL prontos para copiar e colar no n8n.</p>
                                </div>
                                <div className="w-full md:w-80">
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
                                        <input
                                            type="password"
                                            placeholder="Cole sua API Key aqui..."
                                            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white outline-none focus:bg-white/20 focus:border-white/40 transition-all placeholder:text-blue-200"
                                            value={userApiKey}
                                            onChange={(e) => setUserApiKey(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Authentication Card */}
                    <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Autenticação Bearer</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Segurança em primeiro lugar</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Para autenticar suas requisições, você deve enviar sua chave de API no cabeçalho <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-500 font-bold">Authorization</code> precedido pela palavra <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">Bearer</code>.
                        </p>
                        <div className="bg-gray-900 rounded-3xl p-6 font-mono text-sm overflow-x-auto border-4 border-gray-800">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                                <span className="text-gray-500 text-[10px] items-center gap-2 flex uppercase tracking-widest font-bold font-sans">
                                    <Smartphone size={14} /> Example Header
                                </span>
                                <button
                                    onClick={() => copyToClipboard('Authorization: Bearer SUA_CHAVE_AQUI')}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    {copiedPath === 'Authorization: Bearer SUA_CHAVE_AQUI' ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <span className="text-emerald-400">Authorization:</span> <span className="text-blue-400">Bearer</span> <span className="text-amber-200">SUA_CHAVE_DE_API_AQUI</span>
                        </div>
                    </section>

                    {/* Endpoints Sections */}
                    {filteredSections.map((section, sIdx) => (
                        <section key={sIdx} className="space-y-6">
                            <div className="flex items-center gap-3 ml-2">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                    <section.icon size={22} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{section.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {section.endpoints.map((e, eIdx) => (
                                    <div key={eIdx} className="group bg-white rounded-3xl border border-gray-100 p-0 hover:shadow-xl hover:border-blue-100 transition-all overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${e.method === 'GET' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            e.method === 'POST' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                            {e.method}
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-gray-700 tracking-tight">{e.path}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium leading-relaxed pl-1">
                                                        {e.description}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setShowCurlFor(showCurlFor === e.path ? null : e.path)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showCurlFor === e.path ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        <Code size={14} />
                                                        {showCurlFor === e.path ? 'Ocultar cURL' : 'Gerar cURL'}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(e.path)}
                                                        className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                    >
                                                        {copiedPath === e.path ? <Check size={18} /> : <Copy size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {showCurlFor === e.path && (
                                            <div className="bg-gray-900 p-6 border-t border-gray-800 animate-in slide-in-from-top-4 duration-300">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">cURL pronto para n8n</span>
                                                    <button
                                                        onClick={() => copyToClipboard(generateCurl(e.method, e.path))}
                                                        className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                                                    >
                                                        {copiedPath === generateCurl(e.method, e.path) ? (
                                                            <><Check size={14} /> Copiado</>
                                                        ) : (
                                                            <><Copy size={14} /> Copiar cURL</>
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                                    {generateCurl(e.method, e.path)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}

                    {/* External Links */}
                    <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-white shadow-2xl shadow-blue-200">
                        <div className="flex items-center gap-6">
                            <div className="p-6 bg-white/10 rounded-[2rem] border border-white/20">
                                <ExternalLink size={48} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black uppercase tracking-tight leading-none">Dúvidas Técnicas?</h3>
                                <p className="text-blue-100 text-lg font-medium opacity-80">Acesse nosso repositório no GitHub ou fale com nosso suporte técnico.</p>
                                <div className="flex gap-4 pt-4">
                                    <button className="bg-white text-blue-600 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95">Abrir Suporte</button>
                                    <button className="bg-white/10 border border-white/20 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">Documentação Completa</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default DocsView;
