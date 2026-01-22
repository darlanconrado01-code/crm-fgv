import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  LayoutGrid, 
  List as ListIcon, 
  Users, 
  Edit2, 
  ChevronRight, 
  MoreHorizontal,
  Clock,
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', title: 'Fazer contato futuro', description: 'Aluno pediu para entrar em contato depois de um período', progress: 9, totalTasks: 34, completedTasks: 3 },
  { id: '2', title: 'Manter contato - Quente', description: 'Leads com alto interesse de fechamento', progress: 19, totalTasks: 117, completedTasks: 22 },
  { id: '3', title: 'Envio Documentação', description: 'Organização de documentos pendentes', progress: 75, totalTasks: 12, completedTasks: 9 },
  { id: '4', title: 'Taxa de inscrição', description: 'Enviou documentação e falta a taxa', progress: 0, totalTasks: 4, completedTasks: 0 },
  { id: '5', title: 'Fazer contato', description: 'Contatos iniciais', progress: 1, totalTasks: 176, completedTasks: 1 },
  { id: '6', title: 'Projeto de Produtividade', description: 'Desenvolvimento de nova ferramenta', progress: 20, totalTasks: 5, completedTasks: 1 },
  { id: '7', title: 'Financeiro', description: 'Gerenciamento financeiro e orçamentário', progress: 20, totalTasks: 5, completedTasks: 1 },
  { id: '8', title: 'Departamento Pessoal', description: 'Gestão de pessoas e processos', progress: 20, totalTasks: 5, completedTasks: 1 },
];

// Added React.FC type to handle standard props like 'key' correctly
const SummaryCard: React.FC<{ value: string | number, label: string, color: string, icon: any }> = ({ value, label, color, icon: Icon }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1 flex items-center justify-between min-w-[200px]">
    <div>
      <div className={`text-4xl font-bold mb-1`} style={{ color }}>{value}</div>
      <div className="text-sm font-bold text-gray-700">{label}</div>
    </div>
    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
      <Icon size={28} />
    </div>
  </div>
);

// Added React.FC type to handle standard props like 'key' correctly
const ProjectCard: React.FC<{ project: Project, onClick: () => void }> = ({ project, onClick }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={onClick}>
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-gray-800 text-[13px] group-hover:text-blue-600 transition-colors">{project.title}</h3>
      <Edit2 size={12} className="text-gray-300 group-hover:text-gray-500" />
    </div>
    <p className="text-[10px] text-gray-400 mb-4 line-clamp-2 min-h-[30px]">{project.description}</p>
    
    <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
      <span className="text-gray-700 uppercase">Progresso</span>
      <span className="text-blue-500">{project.progress}%</span>
    </div>
    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
      <div className="bg-sky-400 h-full rounded-full" style={{ width: `${project.progress}%` }} />
    </div>

    <div className="flex justify-between items-center text-[10px] font-bold">
      <span className="text-gray-500 flex items-center gap-1">
        <ClipboardList size={12} /> {project.totalTasks} tarefas
      </span>
      <span className="text-[#10b981] flex items-center gap-1">
        <CheckCircle2 size={12} /> {project.completedTasks} concluída(s)
      </span>
    </div>
  </div>
);

// Added React.FC type to handle standard props like 'key' correctly
const KanbanColumn: React.FC<{ title: string, count: number, color?: string }> = ({ title, count, color = "blue" }) => {
  const bgColorMap: Record<string, string> = { blue: 'bg-blue-50', gray: 'bg-gray-50', green: 'bg-emerald-50' };
  const borderColorMap: Record<string, string> = { blue: 'border-blue-200', gray: 'border-gray-200', green: 'border-emerald-200' };

  return (
    <div className="w-[300px] shrink-0 flex flex-col h-full bg-[#f1f5f9]/50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-4 px-1">
        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">{title}</h4>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bgColorMap[color]} text-blue-600 border ${borderColorMap[color]}`}>
          {count}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Mock Kanban Card */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:border-blue-200 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-gray-800">Manter contato</span>
              <button className="text-gray-300 hover:text-gray-500"><MoreHorizontal size={14} /></button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0 border border-gray-200">
                <Users size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-blue-600 truncate">Atendimento #2984</div>
                <div className="text-[10px] text-gray-500 truncate">Geraldo Cutrim 🧜‍♀️</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[9px] font-medium text-gray-400">
              <div className="flex items-center gap-1">
                <Clock size={10} /> há 5 dias
              </div>
              <Phone size={10} className="text-[#25D366]" fill="#25D366" />
            </div>
          </div>
        ))}
        
        <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all uppercase">
          Adicionar Tarefa
        </button>
      </div>
    </div>
  );
};

const TasksView: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'kanban'>('dashboard');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');

  if (currentView === 'kanban') {
    return (
      <div className="h-full w-full bg-[#f8fafc] flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('dashboard')} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Manter contato - Quente <Edit2 size={14} className="text-gray-300" />
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-blue-100 text-blue-500 rounded-lg text-xs font-bold uppercase hover:bg-blue-50">+ ADICIONAR COLUNA</button>
            <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 border border-blue-100 text-blue-500 rounded-lg text-xs font-bold uppercase hover:bg-blue-50">← VOLTAR</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto p-6 flex gap-6">
          <KanbanColumn title="A fazer - Jayana" count={24} />
          <KanbanColumn title="A fazer - Hellen" count={17} />
          <KanbanColumn title="A fazer Erika" count={0} />
          <KanbanColumn title="Em andamento Erika" count={4} color="blue" />
          <KanbanColumn title="A fazer - Elaine" count={18} />
          <KanbanColumn title="Concluída" count={95} color="green" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto">
      {/* Header Info */}
      <div className="px-8 pt-6 flex items-center gap-2 text-blue-500 mb-6">
        <ClipboardList size={22} />
        <h1 className="text-xl font-bold">Tarefas</h1>
      </div>

      {/* Summary Cards */}
      <div className="px-8 flex gap-6 mb-10 flex-wrap">
        <SummaryCard value={10} label="Projetos Total" color="#ef4444" icon={Clock} />
        <SummaryCard value={368} label="Tarefas Total" color="#f59e0b" icon={ClipboardList} />
        <SummaryCard value={352} label="Tarefas Atribuídas" color="#0ea5e9" icon={Users} />
        <SummaryCard value={40} label="Tarefas Completadas" color="#10b981" icon={CheckCircle2} />
        <SummaryCard value={268} label="Tarefas Atrasadas" color="#a855f7" icon={AlertCircle} />
      </div>

      {/* Main Content Section */}
      <div className="px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Novidades</h2>
            <p className="text-xs text-gray-500 mt-1">Agora você pode organizar o seu dia com a nossa ferramenta de produtividade</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-[#10b981] text-[#10b981] px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase hover:bg-emerald-50 transition-all tracking-tight">Crie novo projeto</button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
               <button 
                 onClick={() => setDisplayMode('list')}
                 className={`p-1.5 ${displayMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
               >
                 <ListIcon size={16} />
               </button>
               <button 
                 onClick={() => setDisplayMode('grid')}
                 className={`p-1.5 border-l border-gray-200 ${displayMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
               >
                 <LayoutGrid size={16} />
               </button>
            </div>
            <div className="flex items-center gap-2 ml-2">
               <Users size={18} className="text-gray-400" />
               <div className="w-8 h-4 bg-gray-200 rounded-full relative p-0.5">
                  <div className="w-3 h-3 bg-white rounded-full" />
               </div>
            </div>
          </div>
        </div>

        {displayMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MOCK_PROJECTS.map(project => (
              <ProjectCard key={project.id} project={project} onClick={() => setCurrentView('kanban')} />
            ))}
            
            <div className="border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-8 bg-white/50 cursor-pointer hover:bg-white hover:border-blue-200 transition-all min-h-[160px]">
               <div className="flex flex-col items-center text-gray-400">
                  <Plus size={24} className="mb-2" />
                  <span className="text-[11px] font-bold uppercase">Iniciar um novo projeto</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                  <th className="py-4 px-6">Título</th>
                  <th className="py-4 px-6">Descrição</th>
                  <th className="py-4 px-6">Progresso</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_PROJECTS.map(project => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-4 px-6 font-bold text-gray-700 text-xs">{project.title}</td>
                    <td className="py-4 px-6 text-[10px] text-gray-500 truncate max-w-xs">{project.description}</td>
                    <td className="py-4 px-6 w-72">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold text-gray-500 whitespace-nowrap min-w-[70px] flex items-center gap-1">
                          <ClipboardList size={10} /> {project.totalTasks} tarefas
                        </div>
                        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sky-400 h-full rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <div className="text-[10px] font-bold text-[#10b981] whitespace-nowrap flex items-center gap-1">
                          <CheckCircle2 size={10} /> {project.completedTasks} concluída(s)
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setCurrentView('kanban')} className="bg-[#10b981] text-white px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-[#059669] transition-colors">
                            <ChevronRight size={12} /> Visualizar
                          </button>
                          <button className="bg-[#f97316] text-white px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-[#ea580c] transition-colors">
                            <Edit2 size={12} /> Editar
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksView;