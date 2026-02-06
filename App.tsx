
import React, { useState } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Bot,
  UserCheck,
  Zap,
  Calendar,
  LayoutGrid,
  Database,
  BookOpen,
  Mic,
  Brain,
  Activity,
  MessageCirclePlus,
  Shield
} from 'lucide-react';
import AtendimentoView from './components/AtendimentoView';
import SettingsView from './components/SettingsView';
import ContactsView from './components/ContactsView';
import SchedulingView from './components/SchedulingView';
import TasksView from './components/TasksView';
import UsersView from './components/UsersView';
import CustomFieldsView from './components/CustomFieldsView';
import SectorsView from './components/SectorsView';
import TagsView from './components/TagsView';
import DashboardView from './components/DashboardView';
import FlowsView from './components/FlowsView';
import AgendaView from './components/AgendaView';
import DocsView from './components/DocsView';
import JarvisAssistant from './components/JarvisAssistant';
import VoiceCommandOverlay from './components/VoiceCommandOverlay';
import LandingPage from './components/LandingPage';
import AuthView from './components/AuthView';
import AuditView from './components/AuditView';
import ProfileView from './components/ProfileView';
import NotificationCenter from './components/NotificationCenter';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { NavigationPage } from './types';

const HeaderDropdown = ({ label, icon: Icon, items, active, onClick }: { label: string, icon: any, items?: any[], active?: boolean, onClick?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      className="relative group h-full flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${active
          ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
          : 'text-blue-100 hover:bg-white/5 hover:text-white'
          }`}
      >
        <Icon size={18} className={active ? 'text-white' : 'text-blue-300 group-hover:text-blue-100'} />
        <span className="text-sm font-semibold tracking-tight">{label}</span>
        {items && (
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 opacity-60 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {items && isOpen && (
        <div
          className="absolute top-[calc(100%-8px)] left-0 pt-2 w-64 z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseEnter={handleMouseEnter}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 py-2 ring-1 ring-black ring-opacity-5">
            {items.map((item, idx) => (
              <button
                key={idx}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left group/item"
                onClick={() => {
                  if (item.action) item.action();
                  setIsOpen(false);
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors">
                  {item.icon && <item.icon size={18} className="text-gray-400 group-hover/item:text-blue-600" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  {item.badge && <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Gerenciar</span>}
                </div>
                {item.badge && <Settings size={14} className="ml-auto text-gray-300 group-hover/item:text-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('atendimento');
  const [voiceMode, setVoiceMode] = useState<'default' | 'agent'>('default');
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);



  // ...

  <button
    onClick={() => {
      setVoiceMode('agent');
      setShowVoiceOverlay(true);
    }}
    className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-400/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all ml-0.5"
    title="Agente de Ação (IA)"
  >
    <Activity size={16} />
  </button>
  const [showJarvis, setShowJarvis] = useState(false);
  const [appMode, setAppMode] = useState<'landing' | 'auth' | 'app'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();
        setUser({ ...firebaseUser, ...userData });

        if (userData?.approved === false) {
          setAppMode('pending_approval');
        } else {
          setAppMode('app');
        }
      } else {
        setUser(null);
        if (appMode === 'app') setAppMode('landing');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setAppMode('landing');
  };

  const atendimentosItems = [
    { label: 'Dashboard Live', icon: LayoutDashboard, action: () => setCurrentPage('dashboard') },
    { label: 'Atendimentos', icon: MessageSquare, badge: true, action: () => setCurrentPage('atendimento') },
    { label: 'Contatos', icon: Users, action: () => setCurrentPage('contatos') },
    { label: 'Mensagens', icon: MessageSquare },
    { label: 'Agendamento', icon: Calendar, action: () => setCurrentPage('agendamento') },
    { label: 'Tags', icon: Zap, action: () => setCurrentPage('tags') },
  ];

  const adminItems = [
    { label: 'Usuários', icon: Users, action: () => setCurrentPage('usuarios') },
    { label: 'Robôs (IA)', icon: Bot, action: () => setCurrentPage('robos') },
    { label: 'Campos Personalizados', icon: Database, action: () => setCurrentPage('campos_personalizados') },
    { label: 'Setores', icon: ClipboardList, action: () => setCurrentPage('setores') },
    { label: 'Auditoria de login', icon: CheckCircle2, action: () => setCurrentPage('auditoria') },
  ];

  const configItems = [
    { label: 'Configurações', icon: Settings, action: () => setCurrentPage('configuracoes') },
    { label: 'Conexões', icon: Zap },
    { label: 'Documentação API', icon: BookOpen, action: () => setCurrentPage('documentacao') },
  ];

  React.useEffect(() => {
    const handleNavigation = (e: any) => {
      if (e.detail?.taskId) {
        setPendingNavigation(e.detail);
        setCurrentPage('tarefas');
      }
    };

    const handleChatNavigation = (e: any) => {
      if (e.detail?.chatId) {
        setCurrentPage('atendimento');
        // Re-dispara após um pequeno delay para garantir que AtendimentoView foi montado
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectChat', { detail: e.detail }));
        }, 100);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Shortcut: G for Transcription (Default Mode)
      if (e.key.toLowerCase() === 'g' && !showVoiceOverlay && appMode === 'app') {
        setVoiceMode('default');
        setShowVoiceOverlay(true);
      }
    };

    window.addEventListener('navigateToTask', handleNavigation);
    window.addEventListener('navigateToChat', handleChatNavigation);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('navigateToTask', handleNavigation);
      window.removeEventListener('navigateToChat', handleChatNavigation);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVoiceOverlay, appMode, voiceMode]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-blue-600 rounded-[2rem] animate-pulse">
            <MessageSquare size={40} className="text-white" />
          </div>
          <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs">ComVersa está carregando...</p>
        </div>
      </div>
    );
  }

  if (appMode === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => {
          setAuthMode('login');
          setAppMode('auth');
        }}
        onRegisterClick={() => {
          setAuthMode('register');
          setAppMode('auth');
        }}
      />
    );
  }

  if (appMode === 'pending_approval') {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#11141a] border border-gray-800 rounded-[2rem] p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
            <Shield size={40} className="text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Aprovação Pendente</h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Sua conta foi criada com sucesso, mas requer a aprovação de um administrador para acessar o sistema. Por favor, aguarde ou entre em contato com o suporte.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
          >
            Voltar / Sair
          </button>
        </div>
      </div>
    );
  }


  if (appMode === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        onBack={() => setAppMode('landing')}
        onSuccess={() => setAppMode('app')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 flex-col">
      {/* Top Header */}
      <header className="h-20 bg-gradient-to-r from-[#001540] via-[#003399] to-[#001540] border-b border-white/10 flex items-center px-8 justify-between shrink-0 z-[60] shadow-2xl">
        <div className="flex items-center gap-10">
          <div className="flex items-center">
            <img
              src="https://i.imgur.com/eWsWzH0.png"
              alt="ComVersa Logo"
              className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
            />
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${currentPage === 'dashboard'
                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                : 'text-blue-100 hover:bg-white/5 hover:text-white'
                }`}
            >
              <LayoutDashboard size={18} className={currentPage === 'dashboard' ? 'text-white' : 'text-blue-300'} />
              <span className="text-sm font-semibold tracking-tight">Dashboard</span>
            </button>

            <button
              onClick={() => {
                alert("Funcionalidade de Status em breve!");
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-400/10 text-green-400 hover:bg-green-500 hover:text-white transition-all ml-0.5 cursor-pointer z-50 pointer-events-auto"
              title="Status do WhatsApp (Em Breve)"
            >
              <MessageCirclePlus size={16} />
            </button>

            <HeaderDropdown label="Atendimentos" icon={MessageSquare} items={atendimentosItems} active={['atendimento', 'contatos', 'agendamento', 'tags'].includes(currentPage)} />

            <button
              onClick={() => setCurrentPage('tarefas')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${currentPage === 'tarefas'
                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                : 'text-blue-100 hover:bg-white/5 hover:text-white'
                }`}
            >
              <ClipboardList size={18} className={currentPage === 'tarefas' ? 'text-white' : 'text-blue-300'} />
              <span className="text-sm font-semibold tracking-tight">Tarefas</span>
            </button>

            <button
              onClick={() => setCurrentPage('agenda')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${currentPage === 'agenda'
                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                : 'text-blue-100 hover:bg-white/5 hover:text-white'
                }`}
            >
              <Calendar size={18} className={currentPage === 'agenda' ? 'text-white' : 'text-blue-300'} />
              <span className="text-sm font-semibold tracking-tight">Agenda</span>
            </button>

            <HeaderDropdown label="Admin" icon={UserCheck} items={adminItems} active={['usuarios', 'robos', 'campos_personalizados', 'setores'].includes(currentPage)} />

            <HeaderDropdown label="Configurações" icon={Settings} items={configItems} active={currentPage === 'configuracoes' || currentPage === 'documentacao'} />
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowJarvis(true)}
            className="p-3 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/5"
            title="Jarvis Assistant (IA)"
          >
            <Brain size={22} className="group-hover:scale-110 transition-transform" />
          </button>

          <div className="mr-2">
            <NotificationCenter user={user} />
          </div>

          <button
            onClick={() => setShowVoiceOverlay(true)}
            className="p-3 text-purple-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group bg-purple-500/10 border border-purple-500/20"
            title="Comando de Voz (IA)"
          >
            <Mic size={22} className="group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={handleLogout}
            className="p-3 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group"
            title="Sair"
          >
            <LogOut size={22} className="group-hover:scale-110 transition-transform" />
          </button>
          <div
            onClick={() => setCurrentPage('perfil')}
            className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer hover:opacity-80 transition-all group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white uppercase tracking-tighter group-hover:text-blue-200 transition-colors">{user?.displayName || user?.name || 'Agente'}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {(user?.role && !user.role.startsWith('SECTOR_')) ? user.role : 'Usuário'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 shadow-xl overflow-hidden hover:ring-2 hover:ring-blue-400/50 transition-all">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.name}&background=0D8ABC&color=fff`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {currentPage === 'atendimento' && <AtendimentoView user={user} />}
          {currentPage === 'configuracoes' && <SettingsView />}
          {currentPage === 'contatos' && <ContactsView />}
          {currentPage === 'agendamento' && <SchedulingView />}
          {currentPage === 'tarefas' && (
            <TasksView
              user={user}
              initialNavigation={pendingNavigation}
              onNavigationComplete={() => setPendingNavigation(null)}
            />
          )}
          {currentPage === 'usuarios' && <UsersView initialTab="HUMANOS" />}
          {currentPage === 'robos' && <UsersView initialTab="PERSONAS" />}
          {currentPage === 'campos_personalizados' && <CustomFieldsView />}
          {currentPage === 'setores' && <SectorsView />}
          {currentPage === 'tags' && <TagsView />}
          {currentPage === 'agenda' && <AgendaView user={user} />}
          {currentPage === 'auditoria' && <AuditView />}
          {currentPage === 'perfil' && <ProfileView onBack={() => setCurrentPage('atendimento')} />}

          {currentPage === 'dashboard' && <DashboardView />}
          {currentPage === 'documentacao' && <DocsView />}

          {showVoiceOverlay && (
            <VoiceCommandOverlay
              mode={voiceMode}
              onClose={() => setShowVoiceOverlay(false)}
            />
          )}

          {showJarvis && (
            <JarvisAssistant user={user} onClose={() => setShowJarvis(false)} />
          )}

          {['relatorios'].includes(currentPage) && (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col space-y-4">
              <div className="p-8 bg-white rounded-2xl shadow-sm flex flex-col items-center">
                <LayoutDashboard size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-600 capitalize">{currentPage}</h2>
                <p>Esta tela está em desenvolvimento.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
