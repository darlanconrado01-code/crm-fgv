
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
  LayoutGrid
} from 'lucide-react';
import AtendimentoView from './components/AtendimentoView';
import SettingsView from './components/SettingsView';
import ContactsView from './components/ContactsView';
import SchedulingView from './components/SchedulingView';
import TasksView from './components/TasksView';
import { NavigationPage } from './types';

const HeaderDropdown = ({ label, icon: Icon, items, active, onClick }: { label: string, icon: any, items?: any[], active?: boolean, onClick?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative group" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${active ? 'bg-gray-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
        {items && <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {items && isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {items.map((item, idx) => (
            <button 
              key={idx} 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
              onClick={() => {
                if (item.action) item.action();
                setIsOpen(false);
              }}
            >
              {item.icon && <item.icon size={16} />}
              {item.label}
              {item.badge && <Settings size={14} className="ml-auto text-gray-400" />}
            </button>
          ))}
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
    { label: 'Usuários', icon: Users },
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

          <nav className="hidden lg:flex items-center gap-1">
            <HeaderDropdown label="Dashboard" icon={LayoutDashboard} active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
            <HeaderDropdown label="Atendimentos" icon={MessageSquare} items={atendimentosItems} active={['atendimento', 'contatos', 'agendamento'].includes(currentPage)} />
            <HeaderDropdown label="Tarefas" icon={ClipboardList} active={currentPage === 'tarefas'} onClick={() => setCurrentPage('tarefas')} />
            <HeaderDropdown label="Bots" icon={Bot} active={currentPage === 'bots'} />
            <HeaderDropdown label="Admin" icon={UserCheck} items={adminItems} />
            <HeaderDropdown label="Configurações" icon={Settings} items={configItems} active={currentPage === 'configuracoes'} />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
             <img src="https://picsum.photos/seed/user/100/100" alt="Profile" />
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
