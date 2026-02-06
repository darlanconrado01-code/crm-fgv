
import React from 'react';
import {
    Zap,
    MessageSquare,
    Bot,
    Shield,
    Globe,
    ChevronRight,
    Mic,
    Sparkles,
    LayoutGrid,
    Calendar,
    Users,
    CheckCircle2,
    ArrowRight,
    Smartphone,
    PlayCircle,
    BarChart3,
    Terminal
} from 'lucide-react';

interface LandingPageProps {
    onLoginClick: () => void;
    onRegisterClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
    return (
        <div className="min-h-screen bg-[#0a0c10] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden">
            {/* Dark Gradient Overlay */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-[#003399]/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all">
                            <MessageSquare size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-black uppercase tracking-tighter">ComVersa</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#ia" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">Inteligência Artificial</a>
                        <a href="#api" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">API</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onLoginClick}
                            className="px-6 py-2.5 text-sm font-bold text-gray-300 hover:text-white transition-colors"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={onRegisterClick}
                            className="px-6 py-2.5 text-sm font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-blue-500/40 transition-all active:scale-95 shadow-xl"
                        >
                            Começar Agora
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 z-10">
                <div className="max-w-7xl mx-auto text-center space-y-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Sparkles size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">O Sistema Operacional da sua Empresa</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Sua Operação <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400">Totalmente Conectada</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        CRM Multi-agente para WhatsApp com Automação por IA, Comandos de Voz e dashboards integrados em uma única plataforma de elite.
                    </p>

                    <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <button
                            onClick={onRegisterClick}
                            className="w-full md:w-auto px-10 py-5 bg-[#003399] text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-blue-600 hover:scale-105 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3"
                        >
                            Criar Conta Grátis <ChevronRight size={20} />
                        </button>
                        <button className="w-full md:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all">
                            Ver Documentação
                        </button>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="pt-20 relative animate-in zoom-in-95 duration-1000">
                        <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full scale-75" />
                        <div className="relative bg-gradient-to-b from-white/10 to-transparent p-1 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                            <img
                                src="/comversa-ui.png"
                                alt="ComVersa UI Preview"
                                className="w-full rounded-[2.8rem] opacity-90 transition-opacity hover:opacity-100"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Potência Tecnológica</h2>
                        <p className="text-gray-500 font-medium">Construído para escalar sua comunicação sem perder o toque humano.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: MessageSquare, title: "Multi-Agente", desc: "Vários atendentes em um único número oficial de WhatsApp com gestão de filas." },
                            { icon: Bot, title: "Agentes de IA", desc: "Bots treinados com seus dados que respondem leads 24/7 com contexto e naturalidade." },
                            { icon: Mic, title: "Interface por Voz", desc: "Gerencie tarefas, agendamentos e consulte métricas apenas falando com o sistema." },
                            { icon: LayoutGrid, title: "Pipeline Vision", desc: "Visualize seus leads no modo Kanban e nunca perca um follow-up importante." },
                            { icon: BarChart3, title: "Data Driven", desc: "Dashboards em tempo real com performance de atendentes, taxas de conversão e gargalos." },
                            { icon: Terminal, title: "API de Elite", desc: "Integração via Webhooks pronta para n8n, Make e seus sistemas internos." }
                        ].map((feature, i) => (
                            <div key={i} className="group p-10 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-[#003399]/20 hover:border-blue-500/30 transition-all duration-500">
                                <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl w-fit mb-6 group-hover:scale-110 group-hover:bg-[#003399] group-hover:text-white transition-all shadow-xl">
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
                                <p className="text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Content Highlight - Trusted By */}
            <section className="py-20 border-y border-white/5 relative z-10 bg-[#001540]/30">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-xs font-black uppercase tracking-[0.4em] text-gray-600 mb-12">Empresas que confiam na ComVersa</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all cursor-crosshair">
                        <div className="text-2xl font-black tracking-tighter uppercase italic">TECHCORP</div>
                        <div className="text-2xl font-black tracking-tighter uppercase italic">CLOUDNET</div>
                        <div className="text-2xl font-black tracking-tighter uppercase italic">SOLARIS</div>
                        <div className="text-2xl font-black tracking-tighter uppercase italic">FGV CRM</div>
                        <div className="text-2xl font-black tracking-tighter uppercase italic">ORBITAL</div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 relative z-10">
                <div className="max-w-5xl mx-auto relative group">
                    <div className="absolute inset-0 bg-[#003399] blur-[120px] opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-[#001540] via-[#003399] to-indigo-900 p-16 md:p-24 rounded-[4rem] text-center space-y-10 border border-white/10 shadow-3xl">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.8]">Pronto para o <br /> Próximo Nível?</h2>
                        <p className="text-xl text-blue-100 font-medium opacity-80 max-w-2xl mx-auto leading-relaxed">
                            Junte-se a centenas de empresas que já transformaram seus resultados com a ComVersa.
                        </p>
                        <div className="pt-6">
                            <button
                                onClick={onRegisterClick}
                                className="px-12 py-6 bg-white text-[#003399] rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl active:scale-95"
                            >
                                Criar Minha Conta
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 text-gray-500 relative z-10 bg-[#0a0c10]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl">
                                <MessageSquare size={20} className="text-white" />
                            </div>
                            <span className="text-lg font-black uppercase tracking-tighter text-white">ComVersa</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">O sistema operacional de comunicações para empresas de alto crescimento.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Produto</h4>
                        <ul className="space-y-4 text-sm font-semibold">
                            <li className="hover:text-white cursor-pointer transition-colors">Funcionalidades</li>
                            <li className="hover:text-white cursor-pointer transition-colors">API & Docs</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Roadmap</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Solução</h4>
                        <ul className="space-y-4 text-sm font-semibold">
                            <li className="hover:text-white cursor-pointer transition-colors">Atendimento</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Vendas</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Automação</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Suporte</h4>
                        <ul className="space-y-4 text-sm font-semibold">
                            <li className="hover:text-white cursor-pointer transition-colors">Central de Ajuda</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Comunidade</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Status</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-20 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5 mt-20">
                    <p className="text-xs font-bold uppercase tracking-widest">© 2026 ComVersa - Todos os direitos reservados</p>
                    <div className="flex gap-8 text-xs font-bold uppercase tracking-widest">
                        <span className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Termos de Uso</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
