
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
  Database
} from 'lucide-react';
import AtendimentoView from './components/AtendimentoView';
import SettingsView from './components/SettingsView';
import ContactsView from './components/ContactsView';
import SchedulingView from './components/SchedulingView';
import TasksView from './components/TasksView';
import UsersView from './components/UsersView';
import CustomFieldsView from './components/CustomFieldsView';
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
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 ${active
          ? 'bg-blue-50 text-blue-600 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
      >
        <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
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

  const atendimentosItems = [
    { label: 'Atendimentos', icon: MessageSquare, badge: true, action: () => setCurrentPage('atendimento') },
    { label: 'Modo Kanban', icon: LayoutGrid, action: () => setCurrentPage('atendimento') },
    { label: 'Contatos', icon: Users, action: () => setCurrentPage('contatos') },
    { label: 'Mensagens', icon: MessageSquare },
    { label: 'Agendamento', icon: Calendar, action: () => setCurrentPage('agendamento') },
    { label: 'Tags', icon: Zap },
  ];

  const adminItems = [
    { label: 'Usuários', icon: Users, action: () => setCurrentPage('usuarios') },
    { label: 'Campos Personalizados', icon: Database, action: () => setCurrentPage('campos_personalizados') },
    { label: 'Setores', icon: ClipboardList },
    { label: 'Auditoria de login', icon: CheckCircle2 },
  ];

  const configItems = [
    { label: 'Configurações', icon: Settings, action: () => setCurrentPage('configuracoes') },
    { label: 'Conexões', icon: Zap },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between shrink-0 z-[60]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <Zap size={18} fill="white" />
            </div>
            <span className="text-xl font-bold text-gray-800">ConverseAi <span className="text-blue-500">D3</span></span>
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            <HeaderDropdown label="Dashboard" icon={LayoutDashboard} active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
            <HeaderDropdown label="Atendimentos" icon={MessageSquare} items={atendimentosItems} active={['atendimento', 'contatos', 'agendamento'].includes(currentPage)} />
            <HeaderDropdown label="Tarefas" icon={ClipboardList} active={currentPage === 'tarefas'} onClick={() => setCurrentPage('tarefas')} />
            <HeaderDropdown label="Bots" icon={Bot} active={currentPage === 'usuarios'} onClick={() => setCurrentPage('usuarios')} />
            <HeaderDropdown label="Admin" icon={UserCheck} items={adminItems} />
            <HeaderDropdown label="Configurações" icon={Settings} items={configItems} active={currentPage === 'configuracoes'} />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 group" title="Sair">
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all">
            <img src="https://picsum.photos/seed/user/100/100" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {currentPage === 'atendimento' && <AtendimentoView />}
          {currentPage === 'configuracoes' && <SettingsView />}
          {currentPage === 'contatos' && <ContactsView />}
          {currentPage === 'agendamento' && <SchedulingView />}
          {currentPage === 'tarefas' && <TasksView />}
          {currentPage === 'usuarios' && <UsersView />}
          {currentPage === 'campos_personalizados' && <CustomFieldsView />}

          {['dashboard', 'bots', 'relatorios'].includes(currentPage) && (
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
