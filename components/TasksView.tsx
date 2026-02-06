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
  AlertCircle,
  X,
  Calendar,
  Paperclip,
  User2,
  Trash2,
  MessageSquare,
  Send,
  MoreVertical,
  Settings,
  Tag,
  MessageCircle,
  Hash,
  UserPlus,
  Activity,
  Image as ImageIcon,
  FileText,
  Eye,
  EyeOff,
  Upload,
  Search,
  Archive,
  Repeat
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  limit
} from 'firebase/firestore';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: any;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Contact {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  remoteJidAlt?: string;
}

interface TaskStep {
  columnName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'completed';
  responsibleId?: string;
  responsibleName?: string;
  responsibleAvatar?: string;
}

interface RecurrenceConfig {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  weekDays?: number[]; // 0=Sun, 6=Sat
  trigger: 'scheduled' | 'completion';
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  description: string;
  responsible: string;
  responsibleId?: string;
  startDate?: string;
  recurrence?: RecurrenceConfig;
  endDate?: string;
  date: string; // Keep for legacy
  priority?: string;
  attendanceId: string;
  clientName: string;
  clientAvatar?: string;
  daysAgo: string;
  status: 'pending' | 'completed';
  column?: string;
  timelineSteps?: TaskStep[];
  comments?: Comment[];
  attachments?: Attachment[];
  participants?: string[];
  assignees?: string[];
  coverUrl?: string;
  chatId?: string;
  sourceMessageIds?: string[];
  createdAt?: any;
}

interface ProjectColumn {
  name: string;
  assignees?: string[];
  responsibleId?: string;
  responsibleName?: string;
  responsibleAvatar?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  columns?: ProjectColumn[];
  createdAt?: any;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
}

const AuditView: React.FC<{ tasks: Task[], onTaskClick: (task: Task) => void }> = ({ tasks, onTaskClick }) => {
  const overdueTasks = tasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed');
  const unassignedTasks = tasks.filter(t => !t.responsible || t.responsible === 'Eu');
  const inactiveTasks = tasks.filter(t => {
    if (!t.createdAt) return false;
    const createdAt = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : new Date(t.createdAt).getTime();
    return (Date.now() - createdAt) > 15 * 24 * 60 * 60 * 1000 && t.status !== 'completed';
  });

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] custom-scrollbar animate-in fade-in duration-500">
      <header className="mb-12">
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Auditoria Operacional</h2>
        <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mt-2">Identificando gargalos e tarefas críticas</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { title: 'Atrasadas', count: overdueTasks.length, data: overdueTasks, color: 'text-red-600', bg: 'bg-red-50' },
          { title: 'Sem Responsável', count: unassignedTasks.length, data: unassignedTasks, color: 'text-orange-600', bg: 'bg-orange-50' },
          { title: 'Inativas (+15 dias)', count: inactiveTasks.length, data: inactiveTasks, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(section => (
          <div key={section.title} className="flex flex-col h-[600px] bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className={`p-6 border-b border-gray-50 flex items-center justify-between ${section.bg}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${section.color}`}>{section.title}</h3>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${section.color} bg-white shadow-sm`}>{section.count}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {section.data.map(task => (
                <div key={task.id} onClick={() => onTaskClick(task)} className="bg-gray-50 p-4 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] text-gray-400 border border-gray-100 uppercase">{task.clientName?.charAt(0)}</div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{task.clientName}</span>
                  </div>
                </div>
              ))}
              {section.data.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20">
                  <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Nenhum item crítico<br />encontrado nesta categoria</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ value: string | number, label: string, color: string, icon: any }> = ({ value, label, color, icon: Icon }) => (
  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex-1 flex items-center justify-between min-w-[240px] hover:shadow-xl transition-all duration-500 group">
    <div>
      <div className="text-5xl font-black mb-1 tracking-tighter transition-transform group-hover:scale-110" style={{ color }}>{value}</div>
      <div className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</div>
    </div>
    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 group-hover:bg-gray-100 group-hover:text-gray-400 transition-all">
      <Icon size={32} />
    </div>
  </div>
);

const ProjectCard: React.FC<{
  project: Project,
  onClick: () => void,
  onEdit: (e: React.MouseEvent) => void,
  onDelete: (e: React.MouseEvent) => void
}> = ({ project, onClick, onEdit, onDelete }) => (
  <div className="bg-white rounded-[1.5rem] border border-gray-100 p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between" onClick={onClick}>
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 transform hover:scale-105 shadow-sm"
            title="Editar Projeto"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105 shadow-sm"
            title="Excluir Projeto"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Progresso</span>
          <div className="text-sm font-black text-blue-600">{project.progress}%</div>
        </div>
      </div>

      <h3 className="font-black text-gray-800 text-[13px] uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{project.title}</h3>
      <p className="text-[10px] font-bold text-gray-400 mb-4 line-clamp-1 uppercase tracking-tighter leading-tight">{project.description || 'Sem descrição'}</p>
    </div>

    <div>
      <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }} />
      </div>

      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
        <span className="text-gray-500 flex items-center gap-1">
          <ClipboardList size={12} className="text-blue-500" /> {project.totalTasks} tarefas
        </span>
        <span className="text-emerald-500 flex items-center gap-1">
          <CheckCircle2 size={12} /> {project.completedTasks} OK
        </span>
      </div>
    </div>
  </div>
);

const KanbanCard: React.FC<{
  task: Task,
  allUsers: User[],
  showThumbnails: boolean,
  onClick: () => void,
  onDragStart: (e: React.DragEvent, taskId: string) => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onDelete: () => void
}> = ({ task, allUsers, showThumbnails, onClick, onDragStart, onEdit, onDuplicate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Derive assignees avatar data
  const assignedUsers = React.useMemo(() => {
    const names = task.assignees && task.assignees.length > 0 ? task.assignees : (task.responsible ? [task.responsible] : []);
    return names.map(name => {
      const user = allUsers.find(u => u.name === name);
      return { name, avatar: user?.avatar };
    });
  }, [task.responsible, task.assignees, allUsers]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer group active:scale-[0.98] overflow-hidden relative"
      onClick={onClick}
    >
      {showThumbnails && task.coverUrl && (
        <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden border-b border-gray-50 flex items-center justify-center bg-gray-50">
          <img src={task.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight leading-tight flex-1 pr-2">{task.title}</h4>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-50"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-[60] py-1 animate-in fade-in zoom-in-95 duration-200">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center gap-2">
                <Edit2 size={12} /> Editar
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDuplicate(); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center gap-2">
                <ClipboardList size={12} /> Duplicar
              </button>
              <div className="h-[1px] bg-gray-50 my-1" />
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-red-50 text-red-500 flex items-center gap-2">
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-4 line-clamp-2 overflow-hidden prose prose-xs" dangerouslySetInnerHTML={{ __html: task.description }} />
      )}

      <div className="flex items-center gap-3 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100 transition-colors group-hover:bg-white relative">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 overflow-hidden shrink-0 border-2 border-white shadow-lg ring-2 ring-gray-100">
          {task.clientAvatar ? <img src={task.clientAvatar} className="w-full h-full object-cover" /> : <User2 size={18} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest">Lead</div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID {task.attendanceId}</div>
          </div>
          <div className="text-xs font-black text-gray-800 truncate">{task.clientName}</div>
        </div>
        <div className="absolute -top-2 -right-2 p-1.5 bg-white rounded-lg shadow-md border border-gray-100 group-hover:scale-110 transition-transform">
          <Phone size={10} className="text-emerald-500" fill="currentColor" />
        </div>
      </div>

      {task.participants && task.participants.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {task.participants.map((p, i) => (
            <span key={i} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black border border-blue-100 uppercase">{p}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-blue-400" /> há {task.daysAgo}
        </div>
        <div className="flex items-center -space-x-2">
          {assignedUsers.map((u, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden shadow-sm z-10" title={u.name}>
              <img
                src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                alt={u.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {assignedUsers.length === 0 && (
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center" title="Sem responsável">
              <User2 size={10} className="text-emerald-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{
  title: string,
  tasks: Task[],
  assignees: string[],
  responsibleId?: string,
  allUsers: User[],
  showThumbnails: boolean,
  onTaskClick: (task: Task) => void,
  onAddTask: () => void,
  onSetResponsible: (userId: string) => void,
  onDeleteColumn: () => void,
  onEditColumn: () => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent) => void,
  onDragStart: (e: React.DragEvent) => void,
  onEditTask: (task: Task) => void,
  onDuplicateTask: (task: Task) => void,
  onDeleteTask: (taskId: string) => void
}> = ({
  title,
  tasks,
  assignees,
  responsibleId,
  allUsers,
  showThumbnails,
  onTaskClick,
  onAddTask,
  onSetResponsible,
  onDeleteColumn,
  onEditColumn,
  onDragOver,
  onDrop,
  onDragStart,
  onEditTask,
  onDuplicateTask,
  onDeleteTask
}) => {
    const count = tasks.length;
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);

    const responsibleUser = allUsers.find(u => u.id === responsibleId);

    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="w-[320px] shrink-0 flex flex-col h-full bg-[#f1f5f9]/50 rounded-[2rem] p-4 border border-gray-200/50"
      >
        <div className="flex flex-col mb-6 px-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-tighter">{title}</h4>
              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shadow-md shadow-blue-200">
                {count}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEditColumn(); }}
                className="p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 rounded-lg transition-all"
                title="Editar Nome"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteColumn(); }}
                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                title="Excluir Coluna"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Responsible Person UI */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Responsável:</span>
            <div className="relative">
              <button
                onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                className="flex items-center gap-2 hover:bg-white p-1 rounded-lg transition-all border border-transparent hover:border-gray-200"
                title={responsibleUser ? `Responsável: ${responsibleUser.name}` : "Definir Responsável"}
              >
                {responsibleUser ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-black border border-white shadow-sm overflow-hidden">
                      <img src={responsibleUser.avatar || `https://ui-avatars.com/api/?name=${responsibleUser.name}&background=random&color=fff`} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] font-black text-gray-700 uppercase truncate max-w-[80px]">{responsibleUser.name.split(' ')[0]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400 hover:text-blue-500">
                    <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center border-dashed">
                      <UserPlus size={10} />
                    </div>
                    <span className="text-[9px] font-bold uppercase">Definir</span>
                  </div>
                )}
              </button>

              {showAssigneeMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-1 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-3">Definir Responsável da Etapa</div>
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => { onSetResponsible(''); setShowAssigneeMenu(false); }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full border border-red-200 flex items-center justify-center bg-white"><X size={12} /></div>
                      <span className="text-[10px] font-bold uppercase">Remover Responsável</span>
                    </button>
                    {allUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { onSetResponsible(u.id); setShowAssigneeMenu(false); }}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg transition-all group ${responsibleId === u.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        <img
                          src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                        />
                        <span className="text-[10px] font-black uppercase truncate">{u.name}</span>
                        {responsibleId === u.id && <CheckCircle2 size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              allUsers={allUsers}
              showThumbnails={showThumbnails}
              onClick={() => onTaskClick(task)}
              onDragStart={(e, id) => {
                e.dataTransfer.setData('taskId', id);
                e.stopPropagation();
              }}
              onEdit={() => onEditTask(task)}
              onDuplicate={() => onDuplicateTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}

          <button
            onClick={onAddTask}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all uppercase tracking-widest shadow-sm"
          >
            Adicionar Tarefa
          </button>
        </div>
      </div>
    );
  };

const TimelineView: React.FC<{
  project: Project,
  tasks: Task[],
  allUsers: User[],
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
}> = ({ project, tasks, allUsers, onTaskUpdate }) => {
  const [daysToShow] = useState(30);
  const [startDate] = useState(new Date());

  const getDayPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return Math.max(0, diffDays * 120); // 120px per day
  };

  const getWidth = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24) + 1;
    return Math.max(80, diffDays * 120);
  };

  const handleAISchedule = async (task: Task) => {
    if (!task.startDate || !task.endDate) {
      alert("Defina a data de início e de entrega da tarefa para usar a IA.");
      return;
    }

    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const stepsCount = (project.columns || []).length;

    if (stepsCount === 0 || totalDays <= 0) return;

    const daysPerStep = Math.floor(totalDays / stepsCount);
    let currentStart = new Date(start);

    const newSteps: TaskStep[] = (project.columns || []).map((col, idx) => {
      const colName = typeof col === 'string' ? col : col.name;
      const stepStart = new Date(currentStart);
      const stepEnd = new Date(currentStart);
      stepEnd.setDate(stepEnd.getDate() + (idx === stepsCount - 1 ? Math.floor(totalDays - (idx * daysPerStep)) : daysPerStep - 1));

      currentStart.setDate(currentStart.getDate() + daysPerStep);

      return {
        columnName: colName,
        startDate: stepStart.toISOString().split('T')[0],
        endDate: stepEnd.toISOString().split('T')[0],
        status: 'pending'
      };
    });

    onTaskUpdate(task.id, { timelineSteps: newSteps } as any);
  };

  const handleAdjustStep = (task: Task, stepIdx: number, updates: Partial<TaskStep>) => {
    const newSteps = [...(task.timelineSteps || [])];
    const updatedStep = { ...newSteps[stepIdx], ...updates };

    // Dependency check: Cannot start before previous ends
    if (stepIdx > 0) {
      const prevStep = newSteps[stepIdx - 1];
      if (new Date(updatedStep.startDate) < new Date(prevStep.endDate)) {
        updatedStep.startDate = prevStep.endDate;
      }
    }

    newSteps[stepIdx] = updatedStep;

    // Chaining: Push subsequent steps if overlapped
    for (let i = stepIdx + 1; i < newSteps.length; i++) {
      const current = newSteps[i];
      const previous = newSteps[i - 1];
      if (new Date(current.startDate) <= new Date(previous.endDate)) {
        const duration = (new Date(current.endDate).getTime() - new Date(current.startDate).getTime());
        const nextStart = new Date(previous.endDate);
        nextStart.setDate(nextStart.getDate() + 1);
        const nextEnd = new Date(nextStart.getTime() + duration);

        newSteps[i] = {
          ...current,
          startDate: nextStart.toISOString().split('T')[0],
          endDate: nextEnd.toISOString().split('T')[0]
        };
      }
    }

    onTaskUpdate(task.id, { timelineSteps: newSteps } as any);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white">
      {/* Timeline Header (Dates) */}
      <div className="flex border-b border-gray-100 overflow-x-auto custom-scrollbar bg-gray-50/50">
        <div className="w-64 shrink-0 p-6 border-r border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest bg-white sticky left-0 z-30">Atividades</div>
        <div className="flex">
          {Array.from({ length: daysToShow }).map((_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            return (
              <div key={i} className="w-[120px] shrink-0 p-4 border-r border-gray-100 text-center">
                <div className="text-[10px] font-black text-blue-600 uppercase mb-1">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                <div className="text-sm font-black text-gray-800">{d.getDate()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {tasks.map(task => (
          <div key={task.id} className="flex border-b border-gray-50 group hover:bg-blue-50/20 transition-all">
            <div className="w-64 shrink-0 p-6 border-r border-gray-100 bg-white sticky left-0 z-20 overflow-hidden">
              <div className="font-black text-xs text-gray-800 uppercase truncate mb-1">{task.title}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAISchedule(task)} className="text-[8px] font-black text-blue-500 uppercase hover:underline flex items-center gap-1">
                  <Activity size={10} /> Sugestão IA
                </button>
                <span className="text-[8px] font-black text-gray-300 uppercase">Fim: {task.endDate || 'S/D'}</span>
              </div>
            </div>
            <div className="flex relative h-24 items-center">
              {(task.timelineSteps || []).map((step, idx) => (
                <div
                  key={idx}
                  draggable
                  className="absolute h-12 bg-white rounded-xl border-2 border-blue-400 shadow-sm flex flex-col justify-center px-4 cursor-move group/step hover:shadow-lg transition-all"
                  style={{
                    left: `${getDayPosition(step.startDate)}px`,
                    width: `${getWidth(step.startDate, step.endDate)}px`
                  }}
                >
                  <div className="text-[9px] font-black text-blue-600 uppercase truncate mb-0.5">{step.columnName}</div>
                  <div className="flex justify-between items-center">
                    <input
                      type="date"
                      className="text-[8px] font-bold text-gray-400 bg-transparent border-none p-0 outline-none w-1/2"
                      value={step.startDate}
                      onChange={(e) => handleAdjustStep(task, idx, { startDate: e.target.value })}
                    />
                    <input
                      type="date"
                      className="text-[8px] font-bold text-gray-400 bg-transparent border-none p-0 outline-none w-1/2 text-right"
                      value={step.endDate}
                      onChange={(e) => handleAdjustStep(task, idx, { endDate: e.target.value })}
                    />
                  </div>

                  <div className="absolute -top-3 -right-2">
                    <div className="relative group/user">
                      <button className={`w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm overflow-hidden ${step.responsibleName ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {step.responsibleName ? (
                          <img src={step.responsibleAvatar || allUsers.find(u => u.name === step.responsibleName)?.avatar || `https://ui-avatars.com/api/?name=${step.responsibleName}&background=random&color=fff`} className="w-full h-full object-cover" />
                        ) : <User2 size={10} />}
                      </button>

                      <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover/user:block z-50 overflow-hidden">
                        <div className="p-1 max-h-32 overflow-y-auto">
                          <button
                            onClick={() => handleAdjustStep(task, idx, { responsibleId: '', responsibleName: '', responsibleAvatar: '' })}
                            className="w-full text-left px-2 py-1 text-[9px] text-gray-400 hover:bg-gray-50 rounded-lg"
                          >
                            Sem Responsável
                          </button>
                          {allUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => handleAdjustStep(task, idx, { responsibleId: u.id, responsibleName: u.name, responsibleAvatar: u.avatar })}
                              className="w-full text-left px-2 py-1 text-[9px] font-bold text-gray-700 hover:bg-blue-50 rounded-lg truncate"
                            >
                              {u.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-200 group-hover/step:bg-blue-400 rounded-r-xl" />
                </div>
              ))}
              {/* Grid Background Lines */}
              {Array.from({ length: daysToShow }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-[1px] bg-gray-100" style={{ left: `${i * 120}px` }} />
              ))}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="p-20 text-center opacity-30">
            <Clock size={48} className="mx-auto mb-4" />
            <p className="font-black text-[10px] uppercase tracking-widest">Nenhuma tarefa para exibir na timeline</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SmallProjectCard: React.FC<{
  project: Project,
  onClick: () => void,
  onEdit: (e: React.MouseEvent) => void,
  onDelete: (e: React.MouseEvent) => void
}> = ({ project, onClick, onEdit, onDelete }) => (
  <div onClick={onClick} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
        <ClipboardList size={18} />
      </div>
      <div>
        <h4 className="font-black text-xs text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-[120px]">{project.title}</h4>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{project.totalTasks} tarefas</p>
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onEdit} className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg hover:bg-blue-50"><Edit2 size={12} /></button>
    </div>
  </div>
);

const TasksView: React.FC<{
  user: any,
  initialNavigation?: { taskId: string, projectId: string } | null,
  onNavigationComplete?: () => void
}> = ({ user, initialNavigation, onNavigationComplete }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'kanban' | 'detail' | 'timeline' | 'audit'>('dashboard');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [meOnly, setMeOnly] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Filtering & Search States
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');

  // Dashboard Global State
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [dashboardUserFilter, setDashboardUserFilter] = useState('all');
  const [dashboardClientFilter, setDashboardClientFilter] = useState('all');

  // Fetch Global Tasks for Dashboard (Timeline & Audit)
  React.useEffect(() => {
    if (currentView === 'dashboard') {
      // Include all status types for accurate dashboard stats, ordering by most recent
      const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"), limit(500));
      const unsub = onSnapshot(q, (snapshot) => {
        setGlobalTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      });
      return () => unsub();
    }
  }, [currentView]);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const currentMemberName = user?.displayName || user?.name || 'Agente';

  // Custom Modal State
  const [modalMode, setModalMode] = useState<'project' | 'column' | 'task' | null>(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    targetColumn: '',
    projectId: '',
    responsible: '',
    assignees: [] as string[],
    attendanceId: '#0000',
    clientName: 'Cliente',
    startDate: '',
    endDate: '',
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',
    recurrenceInterval: 1,
    recurrenceWeekDays: [] as number[],
    recurrenceTrigger: 'completion' as 'scheduled' | 'completion',
    attachments: [] as Attachment[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Mention Logic
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const commentInputRef = React.useRef<HTMLInputElement>(null);



  // Fetch Humans for assignees
  React.useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          avatar: data.avatar || data.photoURL || data.avatarUrl // Try multiple common field names
        } as User;
      }));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Contacts for Search
  React.useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)).slice(0, 100));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Projects
  React.useEffect(() => {
    const q = query(collection(db, "task_projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync selectedProject when projects change
  React.useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  // Navigation Logic
  const performNavigation = async (taskId: string, projectId: string) => {
    if (projectId) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        setSelectedProject(proj);
        setCurrentView('kanban');
      }
    }

    if (taskId) {
      const q = query(collection(db, "tasks"), where("__name__", "==", taskId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].id ? snap.docs[0].data() : null;
        if (data) {
          // Also ensure the project is selected if not already
          if (!selectedProject || selectedProject.id !== data.projectId) {
            const proj = projects.find(p => p.id === data.projectId);
            if (proj) setSelectedProject(proj);
          }
          setSelectedTask({ id: snap.docs[0].id, ...data } as Task);
          setCurrentView('detail');
          return true;
        }
      }
    }
    return false;
  };

  // Listen for navigation from Agenda or Notifications
  React.useEffect(() => {
    const handleNavEvent = (e: any) => {
      const { taskId, projectId } = e.detail;
      performNavigation(taskId, projectId);
    };

    window.addEventListener('navigateToTask', handleNavEvent);

    // Check initial navigation
    if (initialNavigation && projects.length > 0) {
      performNavigation(initialNavigation.taskId, initialNavigation.projectId).then(success => {
        if (success && onNavigationComplete) onNavigationComplete();
      });
    }

    return () => window.removeEventListener('navigateToTask', handleNavEvent);
  }, [projects, initialNavigation]);

  // Fetch Tasks for Selected Project
  React.useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, "tasks"), where("projectId", "==", selectedProject.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        let daysAgo = "Recém criada";
        if (data.createdAt instanceof Timestamp) {
          const diff = Date.now() - data.createdAt.toMillis();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          daysAgo = days === 0 ? "Hoje" : `${days}d`;
        }

        return {
          id: doc.id,
          ...data,
          daysAgo
        };
      }) as Task[];

      // Sort manually: items without createdAt (new ones) go to top
      tasksData.sort((a, b) => {
        const timeA = (a.createdAt as Timestamp)?.toMillis() || Date.now();
        const timeB = (b.createdAt as Timestamp)?.toMillis() || Date.now();
        return timeB - timeA;
      });

      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, [selectedProject]);

  // Sync selectedTask when tasks change (for real-time detail/comments)
  React.useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  const handleCreateProject = () => {
    setModalForm({
      title: '',
      subtitle: '',
      description: '',
      targetColumn: '',
      attendanceId: '',
      clientName: '',
      startDate: '',
      endDate: ''
    });
    setEditingProject(null);
    setModalMode('project');
  };

  const handleSaveProject = async () => {
    if (!modalForm.title) return;
    setIsSaving(true);
    try {
      if (editingProject) {
        await updateDoc(doc(db, "task_projects", editingProject.id), {
          title: modalForm.title,
          description: modalForm.description
        });
        setEditingProject(null);
      } else {
        await addDoc(collection(db, "task_projects"), {
          title: modalForm.title,
          description: modalForm.description || "",
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          columns: [{ name: 'A Fazer', assignees: [] }, { name: 'Em Progresso', assignees: [] }, { name: 'Concluído', assignees: [] }],
          createdAt: serverTimestamp()
        });
      }
      setModalMode(null);
    } catch (e) {
      console.error("Error adding project:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColumn = () => {
    setModalForm({
      title: '',
      subtitle: '',
      description: '',
      targetColumn: '',
      attendanceId: '',
      clientName: '',
      startDate: '',
      endDate: ''
    });
    setModalMode('column');
  };

  const handleSaveColumn = async () => {
    if (!selectedProject || !modalForm.title) return;

    // Prevent duplicate columns by name
    const existingNames = (selectedProject.columns || []).map(c => typeof c === 'string' ? c : c.name);
    if (existingNames.includes(modalForm.title)) {
      alert("Já existe uma etapa com este nome.");
      return;
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "task_projects", selectedProject.id);
      const newColumn = { name: modalForm.title, assignees: [] };
      await updateDoc(projectRef, {
        columns: arrayUnion(newColumn)
      });

      // State will be updated by the listener
      setModalMode(null);
    } catch (e) {
      console.error("Error adding column:", e);
    } finally {
      setIsSaving(false);
    }
  };



  const handleAddTask = (column: string) => {
    setModalForm({
      title: '',
      subtitle: '',
      responsible: '',
      assignees: [],
      description: '',
      targetColumn: column,
      projectId: selectedProject?.id || '',
      attendanceId: '#0000',
      clientName: 'Cliente',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceWeekDays: [],
      recurrenceTrigger: 'completion',
      attachments: []
    });
    setContactSearch('');
    setSelectedMessageIds([]);
    setRecentMessages([]);
    setModalMode('task');
    setEditingTask(null);
  };

  const fetchRecentMessages = async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setRecentMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSaveTask = async () => {
    const trimmedTitle = modalForm.title.trim();
    const pid = modalForm.projectId || selectedProject?.id;
    if (!pid || !trimmedTitle) {
      alert("O título da tarefa e o projeto são obrigatórios!");
      return;
    }
    setIsSaving(true);
    try {
      const targetProject = projects.find(p => p.id === pid);
      const targetCol = targetProject?.columns?.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name === modalForm.targetColumn;
      });
      let responsible = modalForm.responsible;

      // Auto-assign to stage owner if not specified
      if (!responsible && typeof targetCol !== 'string') {
        if (targetCol?.responsibleId) {
          const responsibleUser = allUsers.find(u => u.id === targetCol.responsibleId);
          if (responsibleUser) {
            responsible = responsibleUser.name;
          }
        } else if (targetCol?.assignees && targetCol.assignees.length > 0) {
          responsible = targetCol.assignees.join(", ");
        }
      }

      if (!responsible) {
        alert("É obrigatório definir um responsável para a tarefa (ou a etapa deve ter um responsável padrão).");
        setIsSaving(false);
        return;
      }

      const steps: TaskStep[] = (targetProject?.columns || []).map((col, idx, arr) => {
        const name = typeof col === 'string' ? col : col.name;
        // Default: split duration by steps if dates available
        return {
          columnName: name,
          startDate: modalForm.startDate || new Date().toISOString().split('T')[0],
          endDate: modalForm.endDate || modalForm.startDate || new Date().toISOString().split('T')[0],
          status: 'pending'
        };
      });

      const dataToSave = {
        projectId: pid,
        title: trimmedTitle,
        subtitle: modalForm.subtitle.trim() || "",
        description: modalForm.description.trim() || "",
        responsible,
        assignees: modalForm.assignees && modalForm.assignees.length > 0 ? modalForm.assignees : [responsible],
        attendanceId: modalForm.attendanceId,
        clientName: modalForm.clientName,
        startDate: modalForm.startDate,
        endDate: modalForm.endDate,
        // Only update status/column if creating new. For edit, keep existing unless implicitly changed by column move, 
        // but here we just save what is in form.
        column: modalForm.targetColumn,
        // timelineSteps: steps, // Re-generating steps on edit might be destructive if they have custom data. Skip for now on edit.
        // comments: [], // Don't overwrite comments on edit
        chatId: modalForm.attendanceId.includes('@') ? modalForm.attendanceId : null,
        sourceMessageIds: selectedMessageIds,
        recurrence: modalForm.recurrenceType !== 'none' ? {
          frequency: modalForm.recurrenceType,
          interval: modalForm.recurrenceInterval,
          weekDays: modalForm.recurrenceWeekDays,
          trigger: modalForm.recurrenceTrigger
        } : null,
        attachments: modalForm.attachments
      };

      if (editingTask) {
        // Update
        const taskRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskRef, dataToSave);
      } else {
        // Create
        const newTask = {
          ...dataToSave,
          status: 'pending',
          timelineSteps: steps,
          comments: [],
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "tasks"), newTask);

        // Update project counters
        const projectRef = doc(db, "task_projects", pid);
        await updateDoc(projectRef, {
          totalTasks: increment(1)
        });
      }

      setModalMode(null);
      setEditingTask(null);
    } catch (e) {
      console.error("Error adding task:", e);
      alert("Erro ao salvar tarefa. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande! Máximo 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content
        })
      });

      if (!response.ok) throw new Error('Falha no upload');

      const result = await response.json();
      if (result.status === 'success') {
        const newAttachment: Attachment = {
          name: file.name,
          url: result.url,
          type: file.type,
          size: file.size
        };
        setModalForm(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao subir arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande! Máximo 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText.slice(0, 100)}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        const newAttachment: Attachment = {
          name: file.name,
          url: result.url,
          type: file.type,
          size: file.size
        };

        const taskRef = doc(db, "tasks", selectedTask.id);
        const isImage = file.type.startsWith('image/');

        await updateDoc(taskRef, {
          attachments: arrayUnion(newAttachment),
          ...(isImage && !selectedTask.coverUrl ? { coverUrl: result.url } : {})
        });
      } else {
        alert('Erro ao subir arquivo: ' + result.message);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "Erro de conexão ou tamanho excedido.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateTaskField = async (taskId: string, field: string, value: any) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        [field]: value
      });
    } catch (e) {
      console.error(`Error updating task field ${field}:`, e);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;

    const comment: Comment = {
      id: `comment_${Date.now()}`,
      userId: user?.uid || 'unknown',
      userName: currentMemberName,
      content: newComment,
      createdAt: new Date().toISOString()
    };

    try {
      const taskRef = doc(db, "tasks", selectedTask.id);

      // Handle Mentions - Robust Check
      const uniqueParticipants = [...(selectedTask.participants || [])];
      let needsParticipantUpdate = false;
      const lowerComment = newComment.toLowerCase();

      // Check each user if they are mentioned in the text
      for (const u of allUsers) {
        // Check for full name or first name match
        const uName = u.name.toLowerCase();
        const uFirstName = uName.split(' ')[0];

        // We look for @Name pattern
        // Just checking includes is safe enough if we assume @ prefix was typed
        if (lowerComment.includes(`@${uName}`) || (uFirstName.length > 2 && lowerComment.includes(`@${uFirstName}`))) {

          // Add to participants
          if (!uniqueParticipants.includes(u.name)) {
            uniqueParticipants.push(u.name);
            needsParticipantUpdate = true;
          }

          // Send Notification
          if (u.id !== user?.uid) {
            await addDoc(collection(db, "notifications"), {
              userId: u.id,
              senderId: user?.uid,
              senderName: currentMemberName,
              title: 'Nova Menção',
              message: `mencionou você: "${selectedTask.title}"`,
              type: 'mention',
              taskId: selectedTask.id,
              projectId: selectedProject?.id || '',
              read: false,
              createdAt: serverTimestamp()
            });
          }
        }
      }

      const updates: any = {
        comments: arrayUnion(comment)
      };

      if (needsParticipantUpdate) {
        updates.participants = uniqueParticipants;
      }

      await updateDoc(taskRef, updates);
      setNewComment('');
    } catch (e) {
      console.error("Error adding comment:", e);
    }
  };

  const handleSetColumnResponsible = async (columnName: string, userId: string) => {
    if (!selectedProject) return;

    try {
      const projectRef = doc(db, "task_projects", selectedProject.id);
      const updatedColumns = (selectedProject.columns || []).map(col => {
        const colName = typeof col === 'string' ? col : col.name;
        if (colName === columnName) {
          const user = allUsers.find(u => u.id === userId);
          if (!user && userId) return typeof col === 'string' ? { name: col } : col;

          // Keep existing assignees to avoid breaking legacy view, but update responsible fields
          const existingAssignees = typeof col === 'string' ? [] : (col.assignees || []);

          if (!userId) {
            // Clear responsible
            return {
              ... (typeof col === 'string' ? { name: col } : col),
              responsibleId: null,
              responsibleName: null,
              responsibleAvatar: null
            };
          }

          return {
            name: colName,
            assignees: existingAssignees,
            responsibleId: user?.id,
            responsibleName: user?.name,
            responsibleAvatar: user?.avatar
          };
        }
        return typeof col === 'string' ? { name: col } : col;
      });

      await updateDoc(projectRef, {
        columns: updatedColumns
      });
    } catch (e) {
      console.error("Error setting column responsible:", e);
    }
  };


  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('kanban');
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditedDescription(task.description || '');
    setIsEditingDescription(false);
    setCurrentView('detail');
  };

  const getFilteredTasks = (taskList: Task[]) => {
    return taskList.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        t.clientName?.toLowerCase().includes(taskSearchTerm.toLowerCase());

      const targetUser = allUsers.find(u => u.name === responsibleFilter);
      const matchesResponsible = responsibleFilter === 'all' ||
        t.responsible?.toLowerCase() === responsibleFilter.toLowerCase() ||
        t.assignees?.some(a => a.toLowerCase() === responsibleFilter.toLowerCase()) ||
        (targetUser && t.responsibleId === targetUser.id);

      let matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'pending' && t.status === 'pending') ||
        (statusFilter === 'completed' && t.status === 'completed') ||
        (statusFilter === 'overdue' && t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed');

      if (!showCompleted && t.status === 'completed') {
        matchesStatus = false; // Hide completed tasks if toggle is off
      }

      const matchesMe = !meOnly ||
        t.responsible?.toLowerCase() === currentMemberName.toLowerCase() ||
        t.assignees?.some(a => a.toLowerCase() === currentMemberName.toLowerCase()) ||
        t.participants?.some(p => p.toLowerCase() === currentMemberName.toLowerCase()) ||
        t.responsibleId === user?.uid;

      return matchesSearch && matchesResponsible && matchesStatus && matchesMe;
    });
  };

  const getTasksByColumn = (column: string) => {
    const columnTasks = tasks.filter(t => t.column === column || (!t.column && column === 'A fazer'));
    return getFilteredTasks(columnTasks);
  };

  const calculateNextRecurrenceDate = (baseDate: Date, config: RecurrenceConfig): Date => {
    const next = new Date(baseDate);
    // Reset time to verify pure date math
    next.setHours(12, 0, 0, 0);

    switch (config.frequency) {
      case 'daily':
        next.setDate(next.getDate() + (config.interval || 1));
        break;
      case 'weekly':
        if (config.weekDays && config.weekDays.length > 0) {
          const currentDay = next.getDay();
          // Find next day in the list
          const sortedDays = [...config.weekDays].sort((a, b) => a - b);
          const nextDay = sortedDays.find(d => d > currentDay);
          if (nextDay !== undefined) {
            next.setDate(next.getDate() + (nextDay - currentDay));
          } else {
            // Wrap around to first day of next week
            next.setDate(next.getDate() + (7 - currentDay) + sortedDays[0]);
          }
        } else {
          next.setDate(next.getDate() + 7 * (config.interval || 1));
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + (config.interval || 1));
        break;
      case 'custom':
        next.setDate(next.getDate() + (config.interval || 1));
        break;
    }
    return next;
  };

  const handleToggleTaskStatus = async (task: Task) => {
    // Determine project ID (fallback to task.projectId if selectedProject is null)
    const pid = task.projectId || selectedProject?.id;
    if (!pid) return;

    try {
      const taskRef = doc(db, "tasks", task.id);
      const isCompleting = task.status !== 'completed';

      let updates: any = { status: isCompleting ? 'completed' : 'pending' };

      // Handle Recurrence Generation
      if (isCompleting && task.recurrence && task.recurrence.frequency !== 'none') {
        const baseDate = task.recurrence.trigger === 'scheduled' && task.startDate
          ? new Date(task.startDate + 'T12:00:00') // Force noon to avoid TZ issues
          : new Date();

        const nextDate = calculateNextRecurrenceDate(baseDate, task.recurrence);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Calculate End Date duration
        let nextEndDateStr = nextDateStr;
        if (task.startDate && task.endDate) {
          const d1 = new Date(task.startDate);
          const d2 = new Date(task.endDate);
          const duration = d2.getTime() - d1.getTime();
          if (duration > 0) {
            nextEndDateStr = new Date(nextDate.getTime() + duration).toISOString().split('T')[0];
          }
        }

        const newTask = {
          projectId: pid,
          title: task.title,
          subtitle: task.subtitle || '',
          description: task.description || '',
          responsible: task.responsible || 'Eu',
          responsibleId: task.responsibleId,
          attendanceId: (task as any).attendanceId || '',
          clientName: (task as any).clientName || '',
          startDate: nextDateStr,
          endDate: nextEndDateStr,
          status: 'pending',
          column: task.column || 'A Fazer',
          recurrence: task.recurrence, // Propagate recurrence
          createdAt: serverTimestamp(),
          comments: [],
          attachments: (task as any).attachments || [],
          participants: (task as any).participants || []
        };

        await addDoc(collection(db, "tasks"), newTask);
        await updateDoc(doc(db, "task_projects", pid), { totalTasks: increment(1) });

        // Remove recurrence from the finished task so it becomes a static history item
        updates.recurrence = null;
        // Notify user?
        // alert("Nova tarefa recorrente criada!");
      }

      await updateDoc(taskRef, updates);
      await updateDoc(doc(db, "task_projects", pid), { completedTasks: increment(isCompleting ? 1 : -1) });
    } catch (e) { console.error(e); }
  };

  const handleDragStartColumn = (e: React.DragEvent, colName: string) => {
    e.dataTransfer.setData('columnName', colName);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const draggedColName = e.dataTransfer.getData('columnName');

    if (taskId) {
      if (targetCol === 'completed-virtual') {
        // Mark as completed
        try {
          await updateDoc(doc(db, "tasks", taskId), {
            status: 'completed',
            column: 'Concluído', // Set to a default 'completed' column name
            endDate: new Date().toISOString().split('T')[0]
          });
          // Update project counters
          if (selectedProject) {
            await updateDoc(doc(db, "task_projects", selectedProject.id), {
              completedTasks: increment(1)
            });
          }
        } catch (e) { console.error(e); }
        return;
      }

      // If moving to a regular column, ensure status is pending
      const taskToMove = tasks.find(t => t.id === taskId);
      const updates: any = { column: targetCol };
      if (taskToMove?.status === 'completed') {
        updates.status = 'pending';
        if (selectedProject) {
          await updateDoc(doc(db, "task_projects", selectedProject.id), {
            completedTasks: increment(-1)
          });
        }
      }
      handleUpdateTaskField(taskId, 'column', targetCol);
      if (updates.status) {
        handleUpdateTaskField(taskId, 'status', updates.status);
      }
    } else if (draggedColName && draggedColName !== targetCol && selectedProject) {
      const cols = [...(selectedProject.columns || [])];
      const draggedIdx = cols.findIndex(c => (typeof c === 'string' ? c : c.name) === draggedColName);
      const targetIdx = cols.findIndex(c => (typeof c === 'string' ? c : c.name) === targetCol);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [movedCol] = cols.splice(draggedIdx, 1);
        cols.splice(targetIdx, 0, movedCol);
        try {
          await updateDoc(doc(db, "task_projects", selectedProject.id), { columns: cols });
        } catch (e) {
          console.error("Error reordering columns:", e);
        }
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Tem certeza que deseja excluir este projeto? Todas as tarefas serão perdidas.")) {
      try {
        await deleteDoc(doc(db, "task_projects", projectId));
        // Optionally delete all tasks associated
        const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
        // setProjects is automatic via snapshot
        setSelectedProject(null); // Clear selected project if deleted
        setCurrentView('dashboard');
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir projeto.");
      }
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setModalForm({
      title: project.title,
      subtitle: '',
      description: project.description || '',
      projectId: project.id,
      targetColumn: '',
      attendanceId: '',
      clientName: '',
      startDate: '',
      endDate: ''
    });
    setModalMode('project');
  };

  const handleDeleteColumn = async (columnName: string) => {
    if (!selectedProject || !confirm(`Excluir a etapa "${columnName}" e todas as suas tarefas?`)) return;
    try {
      const projectRef = doc(db, "task_projects", selectedProject.id);
      const updatedColumns = (selectedProject.columns || []).filter(c => (typeof c === 'string' ? c : c.name) !== columnName);
      await updateDoc(projectRef, { columns: updatedColumns });
      const tasksToDelete = tasks.filter(t => t.column === columnName);
      for (const t of tasksToDelete) {
        await deleteDoc(doc(db, "tasks", t.id));
      }
    } catch (e) {
      console.error("Error deleting column:", e);
    }
  };

  /* New Handler to Delete Task */
  const handleDeleteTask = async (taskId: string) => {
    if (!selectedProject || !confirm("Excluir esta tarefa?")) return;
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      await deleteDoc(doc(db, "tasks", taskId));
      await updateDoc(doc(db, "task_projects", selectedProject.id), {
        totalTasks: increment(-1),
        completedTasks: taskToDelete?.status === 'completed' ? increment(-1) : increment(0)
      });
      // Close detail view if deleting the currently open task
      if (selectedTask?.id === taskId) {
        setCurrentView('kanban');
        setSelectedTask(null);
      }
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setModalForm({
      title: task.title,
      responsible: task.responsible,
      assignees: task.assignees || (task.responsible ? [task.responsible] : []),
      subtitle: task.subtitle || '',
      description: task.description || '',
      targetColumn: task.column || '',
      projectId: task.projectId,
      attendanceId: task.attendanceId || '#0000',
      clientName: task.clientName || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      recurrenceType: task.recurrence?.frequency || 'none',
      recurrenceInterval: task.recurrence?.interval || 1,
      recurrenceWeekDays: task.recurrence?.weekDays || [],
      recurrenceTrigger: task.recurrence?.trigger || 'completion',
      attachments: task.attachments || []
    });
    setContactSearch('');
    setSelectedMessageIds(task.sourceMessageIds || []);
    setRecentMessages([]);
    setModalMode('task');
  };

  const handleDuplicateTask = async (task: Task) => {
    if (!confirm("Duplicar esta tarefa?")) return;
    try {
      // Create a clean copy avoiding reference issues
      const newTask = {
        ...task,
        title: `${task.title} - Cópia`,
        createdAt: serverTimestamp(),
        comments: [], // Clear comments on duplicate
        status: 'pending' // Reset status
      };

      // Remove ID from copy
      delete (newTask as any).id;

      await addDoc(collection(db, "tasks"), newTask);
      await updateDoc(doc(db, "task_projects", task.projectId), { totalTasks: increment(1) });
      // alert("Tarefa duplicada com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao duplicar tarefa.");
    }
  };

  const handleDeleteComment = async (taskId: string, commentIndex: number, commentContent: Comment) => {
    if (!confirm("Excluir este comentário?")) return;
    try {
      const taskRef = doc(db, "tasks", taskId);
      // Since arrayRemove requires exact object match including timestamps, and we might have precision issues or missing fields,
      // it's safer to read-modify-write if we have the list, OR try arrayRemove if we are confident.
      // Given we are in the UI, we can use the exact object from the list.
      await updateDoc(taskRef, {
        comments: arrayRemove(commentContent)
      });
    } catch (e) { console.error(e); }
  }

  const handleDeleteAttachment = async (taskId: string, attachment: Attachment) => {
    if (!confirm("Excluir anexo?")) return;
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        attachments: arrayRemove(attachment)
      });
    } catch (e) { console.error(e); }
  }

  const handleEditColumn = async (columnName: string) => {
    const newName = prompt("Novo nome para a etapa:", columnName);
    if (!newName || newName === columnName) return;
    if (!selectedProject) return;

    try {
      const projectRef = doc(db, "task_projects", selectedProject.id);
      const updatedColumns = (selectedProject.columns || []).map(c => {
        const currentName = typeof c === 'string' ? c : c.name;
        if (currentName === columnName) {
          return typeof c === 'string' ? newName : { ...c, name: newName };
        }
        return c;
      });
      await updateDoc(projectRef, { columns: updatedColumns });
      const tasksToUpdate = tasks.filter(t => t.column === columnName);
      for (const t of tasksToUpdate) {
        await updateDoc(doc(db, "tasks", t.id), { column: newName });
      }
    } catch (e) {
      console.error("Error editing column:", e);
    }
  };

  const handleMoveTask = async (newProjectId: string, newColumn: string) => {
    if (!selectedTask) return;
    const oldProjectId = selectedTask.projectId;
    const isCompleted = selectedTask.status === 'completed';

    // Verify valid project
    const newProject = projects.find(p => p.id === newProjectId);
    if (!newProject) return;

    try {
      // 1. Update Old Project Counters
      if (oldProjectId !== newProjectId) {
        const oldProjectRef = doc(db, "task_projects", oldProjectId);
        await updateDoc(oldProjectRef, {
          totalTasks: increment(-1),
          completedTasks: isCompleted ? increment(-1) : increment(0)
        });

        // 2. Update New Project Counters
        const newProjectRef = doc(db, "task_projects", newProjectId);
        await updateDoc(newProjectRef, {
          totalTasks: increment(1),
          completedTasks: isCompleted ? increment(1) : increment(0)
        });
      }

      // 3. Update Task
      const taskRef = doc(db, "tasks", selectedTask.id);
      await updateDoc(taskRef, {
        projectId: newProjectId,
        column: newColumn
      });

      // 4. Update Local State
      setSelectedTask(prev => prev ? ({ ...prev, projectId: newProjectId, column: newColumn }) : null);

      // Notify
      // notify("Tarefa movida com sucesso!", "success");

      // If we moved it out of the CURRENT viewing project, maybe we should warn or just let it be.
      // It stays in 'detail' view, which is fine.
    } catch (e) {
      console.error("Erro ao mover tarefa:", e);
      // notify("Erro ao mover tarefa.", "error");
    }
  };

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');
  const [isEditingSubtitle, setIsEditingSubtitle] = React.useState(false);
  const [editedSubtitle, setEditedSubtitle] = React.useState('');

  const [showLinkLeadModal, setShowLinkLeadModal] = React.useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = React.useState('');
  const [foundLeads, setFoundLeads] = React.useState<any[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = React.useState(false);

  const handleSearchLeads = async () => {
    if (!leadSearchTerm.trim()) return;
    setIsSearchingLeads(true);
    try {
      // Search by name
      const q = query(
        collection(db, "contacts"),
        orderBy("name"),
        where("name", ">=", leadSearchTerm),
        where("name", "<=", leadSearchTerm + '\uf8ff'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFoundLeads(results);
    } catch (e) {
      console.error("Error searching leads:", e);
    } finally {
      setIsSearchingLeads(false);
    }
  };

  const handleLinkLead = async (contact: any) => {
    if (!selectedTask) return;
    try {
      await updateDoc(doc(db, "tasks", selectedTask.id), {
        chatId: contact.id, // ID is usually phone
        clientName: contact.name,
        attendanceId: contact.id,
        clientAvatar: contact.profilePicUrl || contact.avatarUrl || `https://ui-avatars.com/api/?name=${contact.name}&background=random&color=fff`
      });
      // Local update optimization if snapshot is slow
      setSelectedTask(prev => prev ? ({
        ...prev,
        chatId: contact.id,
        clientName: contact.name,
        attendanceId: contact.id,
        clientAvatar: contact.profilePicUrl || contact.avatarUrl || `https://ui-avatars.com/api/?name=${contact.name}&background=random&color=fff`
      }) : null);
      setShowLinkLeadModal(false);
      setLeadSearchTerm('');
      setFoundLeads([]);
    } catch (e) {
      console.error(e);
      alert("Erro ao vincular lead.");
    }
  };

  // Dashboard/Kanban Task Filtering logic
  const dashboardFilteredTasks = React.useMemo(() => {
    return globalTasks.filter(t => {
      const targetUser = allUsers.find(u => u.name === dashboardUserFilter);
      const matchUser = dashboardUserFilter === 'all' ||
        t.responsible?.toLowerCase() === dashboardUserFilter.toLowerCase() ||
        t.assignees?.some(a => a.toLowerCase() === dashboardUserFilter.toLowerCase()) ||
        (targetUser && t.responsibleId === targetUser.id);

      const matchClient = dashboardClientFilter === 'all' || dashboardClientFilter === '' || (t.clientName || '').toLowerCase().includes(dashboardClientFilter.toLowerCase());
      return matchUser && matchClient;
    });
  }, [globalTasks, dashboardUserFilter, dashboardClientFilter, allUsers]);

  const kanbanFilteredTasks = React.useMemo(() => getFilteredTasks(tasks),
    [tasks, taskSearchTerm, responsibleFilter, statusFilter, showCompleted, meOnly, currentMemberName, user]);

  const stats = React.useMemo(() => {
    const sourceTasks = currentView === 'dashboard' ? dashboardFilteredTasks : kanbanFilteredTasks;
    const sourceProjects = currentView === 'dashboard' ? projects : (selectedProject ? [selectedProject] : projects);

    // Filter projects based on the active tasks if in dashboard
    const filteredProjects = currentView === 'dashboard'
      ? projects.filter(p => dashboardFilteredTasks.some(t => t.projectId === p.id) || (dashboardUserFilter === 'all' && dashboardClientFilter === 'all' && p.totalTasks > 0))
      : sourceProjects;

    return {
      totalProjects: filteredProjects.length,
      totalTasks: sourceTasks.length,
      tasksAssigned: sourceTasks.filter(t => !!t.responsible || (t.assignees && t.assignees.length > 0)).length,
      tasksCompleted: sourceTasks.filter(t => t.status === 'completed').length,
      tasksOverdue: sourceTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed').length
    };
  }, [currentView, dashboardFilteredTasks, kanbanFilteredTasks, projects, selectedProject, dashboardUserFilter, dashboardClientFilter]);

  // Dashboard Derived Data
  const filteredActiveProjects = React.useMemo(() => {
    // If no filters, return standard projects with tasks
    if (dashboardUserFilter === 'all' && dashboardClientFilter === 'all') {
      return projects.filter(p => p.totalTasks > 0);
    }

    // Valid Project IDs from filtered tasks
    const validProjectIds = new Set(dashboardFilteredTasks.map(t => t.projectId));

    // Return projects that contain at least one matching active task
    return projects
      .filter(p => validProjectIds.has(p.id))
      .map(p => {
        const pTasks = dashboardFilteredTasks.filter(t => t.projectId === p.id);
        const pCompleted = pTasks.filter(t => t.status === 'completed').length;
        return {
          ...p,
          totalTasks: pTasks.length, // Show count of FILTERED tasks
          completedTasks: pCompleted,
          progress: pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0,
          description: p.description
        };
      });
  }, [projects, dashboardFilteredTasks, dashboardUserFilter, dashboardClientFilter]);

  const activeProjects = filteredActiveProjects;
  const emptyProjects = projects.filter(p => p.totalTasks === 0);

  // Derive Unique Clients from Global Tasks for Filter
  const dashboardClients = React.useMemo(() => {
    return Array.from(new Set(globalTasks.map(t => t.clientName).filter(Boolean))).sort();
  }, [globalTasks]);

  const addMention = (userName: string) => {
    // Simplified: Just insert @Name with spaces. The display logic will handle it by matching the string.

    // Replace the current partial word with the mention
    const leftPart = newComment.slice(0, cursorPosition);
    const rightPart = newComment.slice(cursorPosition);

    // Find where the mention started
    const words = leftPart.split(/(\s+)/); // split but keep delimiters to find last word properly?
    // Simplified finding: just replace the last part after last space.

    const lastSpaceIndex = leftPart.lastIndexOf('@');
    if (lastSpaceIndex === -1) return; // Should not happen if filtered

    const baseLeft = leftPart.substring(0, lastSpaceIndex);

    // Add distinct marker or just text? User wants "more malleable".
    // " @Name " is best.
    const newText = `${baseLeft}@${userName} ${rightPart}`;

    setNewComment(newText);
    setShowMentionList(false);

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setNewComment(val);
    setCursorPosition(pos);

    // Simplistic trigger: if last typed char or word starts with @
    const leftPart = val.slice(0, pos);
    const lastAt = leftPart.lastIndexOf('@');
    if (lastAt !== -1) {
      // text after @, but ensure no space between @ and cursor (unless searching empty)
      // Check if there's a space AFTER the @ before the cursor
      const query = leftPart.slice(lastAt + 1);
      if (!query.includes(' ')) {
        setMentionSearch(query);
        setShowMentionList(true);
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionList) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const filtered = allUsers.filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase()));
        if (filtered.length > 0) {
          addMention(filtered[0].name);
        }
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
      return;
    }

    if (e.key === 'Enter') {
      handleAddComment(); // Ensure this calls the function to add comment
    }
  };

  const filteredGlobalTasks = globalTasks.filter(t => {
    if (dashboardUserFilter === 'all') return true;
    const targetUser = allUsers.find(u => u.name === dashboardUserFilter);
    return t.responsible?.toLowerCase() === dashboardUserFilter.toLowerCase() ||
      t.assignees?.some(a => a.toLowerCase() === dashboardUserFilter.toLowerCase()) ||
      (targetUser && t.responsibleId === targetUser.id);
  });

  const incompleteTasks = filteredGlobalTasks.filter(t =>
    !t.responsible || !t.clientName || !t.endDate || t.clientName === 'Cliente'
  );

  let content;
  if (currentView === 'detail' && selectedTask) {
    content = (
      <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="px-10 py-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('kanban')} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
              <ArrowLeft size={24} />
            </button>

            <div className="flex items-center gap-4">
              {/* Project Selector */}
              <div className="flex flex-col">
                <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest px-1 mb-1">Projeto</label>
                <select
                  className="bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border-none outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                  value={selectedTask.projectId}
                  onChange={(e) => {
                    const newProjId = e.target.value;
                    const newProj = projects.find(p => p.id === newProjId);
                    // Default to first column if available, else 'A fazer'
                    const firstColumn = (newProj?.columns && newProj.columns.length > 0)
                      ? (typeof newProj.columns[0] === 'string' ? newProj.columns[0] : newProj.columns[0].name)
                      : 'A fazer';
                    handleMoveTask(newProjId, firstColumn);
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Column Selector */}
              <div className="flex flex-col">
                <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest px-1 mb-1">Etapa</label>
                <select
                  className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                  value={selectedTask.column || 'A fazer'}
                  onChange={(e) => handleMoveTask(selectedTask.projectId, e.target.value)}
                >
                  {(projects.find(p => p.id === selectedTask.projectId)?.columns || []).map(col => {
                    const name = typeof col === 'string' ? col : col.name;
                    return <option key={name} value={name}>{name}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedTask.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
              {selectedTask.status === 'completed' ? 'Concluída' : 'Pendente'}
            </div>
            <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-3 text-gray-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={20} /></button>
            <button onClick={() => setCurrentView('kanban')} className="p-3 text-gray-300 hover:text-gray-600 rounded-xl transition-all"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      className="text-4xl font-black text-gray-900 uppercase tracking-tighter bg-white border border-gray-200 rounded-lg px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      autoFocus
                      onBlur={() => {
                        if (editedTitle !== selectedTask.title) handleUpdateTaskField(selectedTask.id, 'title', editedTitle);
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateTaskField(selectedTask.id, 'title', editedTitle);
                          setIsEditingTitle(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <h1
                    className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2 cursor-pointer hover:bg-gray-100 rounded-lg px-1 transition-colors -ml-1"
                    onClick={() => { setEditedTitle(selectedTask.title); setIsEditingTitle(true); }}
                    title="Clique para editar"
                  >
                    {selectedTask.title}
                  </h1>
                )}

                {isEditingSubtitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="text-lg font-bold text-gray-500 tracking-tight bg-white border border-gray-200 rounded-lg px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editedSubtitle}
                      onChange={(e) => setEditedSubtitle(e.target.value)}
                      autoFocus
                      onBlur={() => {
                        if (editedSubtitle !== selectedTask.subtitle) handleUpdateTaskField(selectedTask.id, 'subtitle', editedSubtitle);
                        setIsEditingSubtitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateTaskField(selectedTask.id, 'subtitle', editedSubtitle);
                          setIsEditingSubtitle(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p
                    className="text-lg font-bold text-gray-400 tracking-tight cursor-pointer hover:bg-gray-100 rounded-lg px-1 transition-colors -ml-1 inline-block"
                    onClick={() => { setEditedSubtitle(selectedTask.subtitle || ''); setIsEditingSubtitle(true); }}
                    title="Clique para editar subtítulo"
                  >
                    {selectedTask.subtitle || 'Sem subtítulo'}
                  </p>
                )}
              </div>

              <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 font-black text-xs text-gray-400 uppercase tracking-widest"><User2 size={18} className="text-blue-500" /> Lead Relacionado</div>
                  <button
                    onClick={() => setShowLinkLeadModal(true)}
                    className="text-[10px] font-black text-blue-500 uppercase hover:underline flex items-center gap-1"
                  >
                    <UserPlus size={14} /> {selectedTask.chatId ? 'Alterar Lead' : 'Vincular Lead'}
                  </button>
                </div>

                {selectedTask.chatId ? (
                  <div className="flex items-center justify-between p-6 bg-blue-50/20 rounded-[2rem] border border-blue-50 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                        {selectedTask.clientAvatar ? (
                          <img src={selectedTask.clientAvatar} alt={selectedTask.clientName} className="w-full h-full object-cover" />
                        ) : (
                          <User2 size={32} className="text-gray-200" />
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">WhatsApp / CRM</div>
                        <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">{selectedTask.clientName}</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ID: {selectedTask.attendanceId}</span>
                      </div>
                    </div>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToChat', { detail: { chatId: selectedTask.chatId } }))} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Abrir Conversa</button>
                  </div>
                ) : (
                  <div onClick={() => setShowLinkLeadModal(true)} className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                    <UserPlus size={32} className="text-gray-300 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600">Vincular um contato a esta tarefa</span>
                  </div>
                )}
              </section>

              <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 font-black text-xs text-gray-400 uppercase tracking-widest"><FileText size={18} className="text-blue-500" /> Descrição</div>
                  <button
                    onClick={() => {
                      if (!isEditingDescription) setEditedDescription(selectedTask.description || '');
                      setIsEditingDescription(!isEditingDescription);
                    }}
                    className="text-[10px] font-black text-blue-500 uppercase hover:underline"
                  >
                    {isEditingDescription ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {isEditingDescription ? (
                  <div className="space-y-4">
                    <textarea
                      className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                      rows={8}
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        await handleUpdateTaskField(selectedTask.id, 'description', editedDescription);
                        setIsEditingDescription(false);
                      }}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                    >Salvar Alterações</button>
                  </div>
                ) : (
                  <div className="prose prose-blue max-w-none text-gray-600 text-sm font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedTask.description || 'Nenhuma descrição informada.' }} />
                )}
              </section>

              {selectedTask.participants && selectedTask.participants.length > 0 && (
                <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 font-black text-xs text-gray-400 uppercase tracking-widest"><Users size={18} className="text-blue-500" /> Participantes</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.participants.map((p: string, i: number) => {
                      const user = allUsers.find(u => u.name === p);
                      return (
                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-black border border-blue-100 uppercase tracking-tight">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] overflow-hidden">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${p}&background=random&color=fff`} className="w-full h-full object-cover" />
                          </div>
                          {p}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 font-black text-xs text-gray-400 uppercase tracking-widest"><Paperclip size={18} className="text-blue-500" /> Anexos</div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase hover:underline">
                      {isUploading ? <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /> : <Upload size={14} />}
                      Subir Arquivo
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {(selectedTask.attachments || []).map((att: Attachment, idx: number) => (
                    <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="group p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 rounded-2xl transition-all shadow-sm">
                      <div className="aspect-video mb-3 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                        {att.type.startsWith('image/') ? <img src={att.url} className="w-full h-full object-cover" alt={att.name} /> : <FileText size={32} className="text-gray-400" />}
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.preventDefault(); handleDeleteAttachment(selectedTask.id, att); }} className="p-1 bg-white rounded-full text-red-500 shadow-md hover:scale-110 transition-transform">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="text-[10px] font-black text-gray-800 truncate uppercase mt-1">{att.name}</div>
                      <div className="text-[9px] font-bold text-gray-400">{(att.size / 1024 / 1024).toFixed(2)} MB</div>
                    </a>
                  ))}
                  {(selectedTask.attachments || []).length === 0 && !isUploading && (
                    <div className="col-span-full py-8 text-center text-[10px] font-black uppercase text-gray-300 tracking-widest">Nenhum arquivo anexado</div>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8 h-full flex flex-col">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm shrink-0">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Responsabilidade</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 block ml-1">Atribuído para</label>
                    <div className="flex flex-wrap gap-2">
                      {allUsers.map(u => {
                        const isSelected = (selectedTask.assignees?.includes(u.name)) || (selectedTask.responsible === u.name);
                        return (
                          <button
                            key={u.id}
                            onClick={async () => {
                              const currentAssignees = selectedTask.assignees || (selectedTask.responsible ? [selectedTask.responsible] : []);
                              let newAssignees;
                              if (currentAssignees.includes(u.name)) {
                                newAssignees = currentAssignees.filter(a => a !== u.name);
                              } else {
                                newAssignees = [...currentAssignees, u.name];
                              }

                              // Update both fields for compatibility in a single atomic operation
                              try {
                                const taskRef = doc(db, "tasks", selectedTask.id);
                                await updateDoc(taskRef, {
                                  assignees: newAssignees,
                                  responsible: newAssignees[0] || ''
                                });
                              } catch (e) {
                                console.error("Erro ao atualizar atribuídos:", e);
                              }
                            }}
                            className={`w-10 h-10 rounded-full relative transition-all group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                            title={u.name}
                          >
                            <img
                              src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                              alt={u.name}
                              className="w-full h-full rounded-full object-cover border border-gray-200"
                            />
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                <CheckCircle2 size={10} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:border-blue-500 uppercase"
                    value={selectedTask.endDate || ''}
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, 'endDate', e.target.value)}
                  />
                </div>

                {/* Recurrence Settings for Detail View */}
                <div className="pt-4 border-t border-gray-50 mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat size={14} className="text-blue-500" />
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recorrência</label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500 cursor-pointer"
                        value={selectedTask.recurrence?.frequency || 'none'}
                        onChange={(e) => {
                          const freq = e.target.value as any;
                          const newRecurrence = {
                            frequency: freq,
                            interval: selectedTask.recurrence?.interval || 1,
                            weekDays: selectedTask.recurrence?.weekDays || [],
                            trigger: selectedTask.recurrence?.trigger || 'completion'
                          };
                          handleUpdateTaskField(selectedTask.id, 'recurrence', freq === 'none' ? null : newRecurrence);
                        }}
                      >
                        <option value="none">Não repetir</option>
                        <option value="daily">Diariamente</option>
                        <option value="weekly">Semanalmente</option>
                        <option value="monthly">Mensalmente</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>

                    {selectedTask.recurrence && selectedTask.recurrence.frequency !== 'none' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">{selectedTask.recurrence.frequency === 'custom' ? 'Dias' : 'Gatilho'}</label>
                            {selectedTask.recurrence.frequency === 'custom' ? (
                              <input
                                type="number"
                                min="1"
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black"
                                value={selectedTask.recurrence.interval || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  handleUpdateTaskField(selectedTask.id, 'recurrence', { ...selectedTask.recurrence, interval: val });
                                }}
                              />
                            ) : (
                              <select
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                                value={selectedTask.recurrence.trigger}
                                onChange={(e) => {
                                  handleUpdateTaskField(selectedTask.id, 'recurrence', { ...selectedTask.recurrence, trigger: e.target.value });
                                }}
                              >
                                <option value="completion">Ao Concluir</option>
                                <option value="scheduled">Na Data</option>
                              </select>
                            )}
                          </div>
                          {selectedTask.recurrence.frequency !== 'custom' && (
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Intervalo</label>
                              <input
                                type="number"
                                min="1"
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black"
                                value={selectedTask.recurrence.interval || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  handleUpdateTaskField(selectedTask.id, 'recurrence', { ...selectedTask.recurrence, interval: val });
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {selectedTask.recurrence.frequency === 'weekly' && (
                          <div>
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Dias da Semana</label>
                            <div className="flex gap-1">
                              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const current = selectedTask.recurrence?.weekDays || [];
                                    const newDays = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
                                    handleUpdateTaskField(selectedTask.id, 'recurrence', { ...selectedTask.recurrence, weekDays: newDays });
                                  }}
                                  className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black transition-all ${selectedTask.recurrence?.weekDays?.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col flex-1 min-h-[400px]">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare size={18} className="text-blue-500" />
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Comentários</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                  {(selectedTask.comments || []).map((c: any, idx: number) => {
                    const user = allUsers.find(u => u.id === c.userId || u.name === c.userName);
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 shrink-0 uppercase overflow-hidden">
                          <img src={user?.avatar || `https://ui-avatars.com/api/?name=${c.userName}&background=random&color=fff`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-medium text-gray-700 min-h-[3rem] break-words whitespace-pre-wrap">
                            {/* Highlight mentions if present */}
                            {String(c.content || "").split(/(@\w+)/g).map((part: string, i: number) =>
                              part.startsWith('@') ? <span key={i} className="text-blue-600 font-bold bg-blue-50 px-1 rounded">{part}</span> : part
                            )}
                          </div>
                          <div className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-1 ml-1">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                          </div>
                        </div>
                        {/* Delete Comment Button */}
                        {(c.userId === user?.uid || user?.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteComment(selectedTask.id, idx, c)}
                            className="text-gray-300 hover:text-red-500 self-start p-1 ml-2 transition-colors"
                            title="Excluir comentário"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {(selectedTask.comments || []).length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <MessageSquare size={32} className="text-gray-200 mb-2" />
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum comentário ainda</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-50 flex gap-2 relative rounded-b-[2rem] mt-2">
                  {showMentionList && (
                    <div className="absolute bottom-16 left-4 bg-white shadow-xl border border-gray-100 rounded-xl p-2 w-48 max-h-48 overflow-y-auto z-50 animate-in slide-in-from-bottom-2 custom-scrollbar">
                      <div className="px-2 py-1 text-[8px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Mencionar</div>
                      {allUsers.filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase())).map(u => (
                        <button key={u.id} onClick={() => addMention(u.name)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs font-bold rounded-lg flex items-center gap-2 group transition-colors">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] group-hover:bg-blue-600 group-hover:text-white transition-colors">{u.name.charAt(0)}</div>
                          <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{u.name}</span>
                        </button>
                      ))}
                      {allUsers.filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-gray-400 text-center">Ninguém encontrado</div>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Escreva um comentário... (@ para mencionar)"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-400 transition-all"
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={handleMentionKeyDown}
                    ref={commentInputRef}
                    onSelect={(e: any) => setCursorPosition(e.target.selectionStart)}
                  />
                  <button onClick={handleAddComment} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"><Send size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Vinculação de Lead */}
        {showLinkLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Vincular Lead</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Selecione um contato para a tarefa</p>
                </div>
                <button onClick={() => setShowLinkLeadModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-4 bg-gray-50/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar contato..."
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all font-medium"
                    value={leadSearchTerm}
                    onChange={(e) => setLeadSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchLeads()}
                  />
                  <button
                    onClick={handleSearchLeads}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <ArrowLeft size={16} className="rotate-180" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                {isSearchingLeads ? (
                  <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest animate-pulse">Buscando contatos...</div>
                ) : (
                  <>
                    {foundLeads.length === 0 && leadSearchTerm && (
                      <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest">Nenhum contato encontrado</div>
                    )}
                    {foundLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => handleLinkLead(lead)}
                        className="flex items-center gap-4 p-4 rounded-[1.5rem] cursor-pointer hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm uppercase overflow-hidden border border-blue-200">
                          {lead.avatarUrl ? (
                            <img src={lead.avatarUrl} className="w-full h-full object-cover" alt={lead.name} />
                          ) : (
                            (lead.name || 'U').charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">{lead.name || 'Sem nome'}</h4>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{lead.phone || lead.id}</p>
                        </div>
                      </div>
                    ))}
                    {foundLeads.length === 0 && !leadSearchTerm && (
                      <div className="text-center py-10 text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                        Digite para buscar contatos
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if ((currentView === 'kanban' || currentView === 'timeline' || currentView === 'audit')) {
    content = (
      <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
        {/* Top Banner with Project Title */}
        <div className="px-10 py-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('dashboard')} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
                {selectedProject?.title || 'Auditoria'} <Edit2 size={16} className="text-gray-300" />
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedProject?.description || 'Filtrando tarefas globais'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMeOnly(!meOnly)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${meOnly ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white text-gray-400 border-2 border-gray-100 hover:border-blue-200'}`}
            >
              <User2 size={16} />
              {meOnly ? 'Minhas Tarefas' : 'Todas as Tarefas'}
            </button>
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showThumbnails ? 'bg-blue-50 text-blue-600 border-2 border-blue-100' : 'bg-gray-50 text-gray-400 border-2 border-gray-100'}`}
            >
              {showThumbnails ? <Eye size={16} /> : <EyeOff size={16} />}
              {showThumbnails ? 'Miniaturas ON' : 'Miniaturas OFF'}
            </button>
            <button
              onClick={() => setCurrentView(currentView === 'kanban' ? 'timeline' : 'kanban')}
              className="px-6 py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-400 transition-all shadow-sm flex items-center gap-2"
            >
              <LayoutGrid size={16} />
              {currentView === 'kanban' ? 'VER TIMELINE' : 'VER KANBAN'}
            </button>
            <button
              onClick={handleAddColumn}
              className="px-6 py-3 border-2 border-blue-100 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
            >
              + ADICIONAR COLUNA
            </button>
            <button onClick={() => setCurrentView('dashboard')} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">← VOLTAR</button>
          </div>
        </div>

        {/* Task Filter Bar (Unified) */}
        <div className="px-10 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4 shrink-0 transition-all z-20">
          <div className="flex-1 flex items-center gap-3 justify-center max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Filtrar por título, cliente ou descrição..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                value={taskSearchTerm}
                onChange={(e) => setTaskSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                {showCompleted ? <CheckCircle2 size={14} /> : <CheckCircle2 size={14} />}
                {showCompleted ? 'Ocultar Concluídos' : 'Mostrar Concluídos'}
              </button>
              <div className="w-[1px] h-6 bg-gray-200 mx-1" />
              {['all', 'pending', 'overdue'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-black text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  {f === 'all' && 'Todas'}
                  {f === 'pending' && 'Pendentes'}
                  {f === 'overdue' && 'Atrasadas'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 pl-4 border-l border-gray-200 ml-2">
              <button
                onClick={() => setResponsibleFilter('all')}
                className={`h-8 px-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${responsibleFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
              >
                Todos
              </button>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setResponsibleFilter(responsibleFilter === u.name ? 'all' : u.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-all relative group overflow-hidden ${responsibleFilter === u.name ? 'border-blue-500 ring-2 ring-blue-200 scale-110' : 'border-white hover:scale-110'}`}
                  title={u.name}
                >
                  <img
                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                    alt={u.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-100">
              <button onClick={() => setDisplayMode('grid')} className={`p-2 rounded-xl transition-all ${displayMode === 'grid' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setDisplayMode('list')} className={`p-2 rounded-xl transition-all ${displayMode === 'list' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}><ListIcon size={16} /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentView === 'kanban' && selectedProject && (
            <div className="flex-1 overflow-x-auto p-10 flex gap-10 bg-[#f8fafc] custom-scrollbar">
              {(selectedProject.columns || []).map(col => {
                const colName = typeof col === 'string' ? col : col.name;
                const colAssignees = typeof col === 'string' ? [] : (col.assignees || []);
                const colResponsible = typeof col === 'string' ? undefined : col.responsibleId;
                const filteredColumnTasks = getTasksByColumn(colName);
                return (
                  <KanbanColumn
                    key={colName}
                    title={colName}
                    assignees={colAssignees}
                    responsibleId={colResponsible}
                    allUsers={allUsers}
                    showThumbnails={showThumbnails}
                    tasks={filteredColumnTasks}
                    onTaskClick={handleTaskClick}
                    onAddTask={() => handleAddTask(colName)}
                    onSetResponsible={(id) => handleSetColumnResponsible(colName, id)}
                    onDeleteColumn={() => handleDeleteColumn(colName)}
                    onEditColumn={() => handleEditColumn(colName)}
                    onDragStart={(e) => handleDragStartColumn(e, colName)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, colName)}
                    onEditTask={handleEditTaskModal}
                    onDuplicateTask={handleDuplicateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                );
              })}

              {/* Render "Completed" Column if toggle is on */}
              {showCompleted && (
                <KanbanColumn
                  key="concluido-virtual-column"
                  title="Concluído"
                  tasks={tasks.filter(t => t.status === 'completed' && (meOnly ? (t.responsible === currentMemberName || t.responsibleId === user?.uid) : true))}
                  assignees={[]}
                  allUsers={allUsers}
                  showThumbnails={showThumbnails}
                  onTaskClick={(task) => { setSelectedTask(task); setCurrentView('detail'); }}
                  onAddTask={() => { }} // Cannot add directly to completed usually
                  onSetResponsible={() => { }}
                  onDeleteColumn={() => { if (confirm("Ocultar a coluna Concluído?")) setShowCompleted(false); }}
                  onEditColumn={() => alert("Esta é uma coluna do sistema.")}
                  onDragStart={(e) => { }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'completed-virtual')} // Need to handle drop to complete
                  onEditTask={handleEditTaskModal}
                  onDuplicateTask={handleDuplicateTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              <button
                onClick={handleAddColumn}
                className="w-[320px] shrink-0 h-[100px] rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2"
              >
                <Plus size={24} />
                <span className="text-xs font-black uppercase tracking-widest">Nova Coluna</span>
              </button>
            </div>
          )}

          {currentView === 'timeline' && selectedProject && (
            <TimelineView
              project={selectedProject}
              tasks={getFilteredTasks(tasks)}
              allUsers={allUsers}
              onTaskUpdate={(taskId, updates) => handleUpdateTaskField(taskId, Object.keys(updates)[0], Object.values(updates)[0])}
            />
          )}

          {currentView === 'audit' && (
            <AuditView
              tasks={getFilteredTasks(tasks)}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>
    );
  } else {
    content = (
      <div className="h-full w-full bg-[#f8fafc] overflow-y-auto p-10 custom-scrollbar">
        {/* Header Info */}
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20">
            <ClipboardList size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Tarefas</h1>
            <p className="text-gray-400 font-bold text-sm tracking-wide uppercase mt-0.5">Gerenciamento de produtividade</p>
          </div>
          <button
            onClick={() => setMeOnly(!meOnly)}
            className={`ml-auto flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${meOnly ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-gray-400 border-2 border-gray-100 hover:border-blue-200'}`}
          >
            <User2 size={16} />
            {meOnly ? 'Minhas Tarefas' : 'Todas as Tarefas'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <SummaryCard value={stats.totalProjects} label="Projetos Total" color="#ef4444" icon={Clock} />
          <SummaryCard value={stats.totalTasks} label="Tarefas Total" color="#f59e0b" icon={ClipboardList} />
          <SummaryCard value={stats.tasksAssigned} label="Tarefas Atribuídas" color="#0ea5e9" icon={Users} />
          <SummaryCard value={stats.tasksCompleted} label="Tarefas Completadas" color="#10b981" icon={CheckCircle2} />
          <SummaryCard value={stats.tasksOverdue} label="Tarefas Atrasadas" color="#a855f7" icon={AlertCircle} />
        </div>

        {/* Main Content Section */}
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Novidades</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Agora você pode organizar o seu dia com a nossa ferramenta de produtividade</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCreateProject}
                className="bg-white border-2 border-emerald-500 text-emerald-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
              >
                Crie novo projeto
              </button>
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 overflow-hidden shadow-inner">
                <button
                  onClick={() => setDisplayMode('list')}
                  className={`p-2.5 rounded-xl transition-all ${displayMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ListIcon size={18} />
                </button>
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={`p-2.5 rounded-xl transition-all ${displayMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>

          {displayMode === 'grid' ? (
            <div className="space-y-12">
              {/* Active Projects */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} /> Projetos em Andamento ({activeProjects.length})
                  </h3>

                  {/* Filters */}
                  {/* Filters */}
                  <div className="flex items-center gap-4">
                    {/* User Filter (Avatars) */}
                    <div className="flex items-center gap-1 pl-2 border-l border-gray-100">
                      <button
                        onClick={() => setDashboardUserFilter('all')}
                        className={`h-8 px-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${dashboardUserFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                      >
                        Todos
                      </button>
                      {allUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setDashboardUserFilter(dashboardUserFilter === u.name ? 'all' : u.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all relative group overflow-hidden ${dashboardUserFilter === u.name ? 'border-blue-500 ring-2 ring-blue-200 scale-110' : 'border-white hover:scale-110'}`}
                          title={u.name}
                        >
                          <img
                            src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                            alt={u.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    {/* Client Filter (Search) */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                      <input
                        type="text"
                        placeholder="Buscar Cliente..."
                        className="w-40 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all uppercase placeholder:normal-case"
                        value={dashboardClientFilter === 'all' ? '' : dashboardClientFilter}
                        onChange={(e) => setDashboardClientFilter(e.target.value)}
                      />
                      {dashboardClientFilter && dashboardClientFilter !== 'all' && (
                        <button onClick={() => setDashboardClientFilter('all')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {activeProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                      onEdit={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                    />
                  ))}

                  <div
                    onClick={handleCreateProject}
                    className="border-4 border-dashed border-gray-50 rounded-[2rem] flex items-center justify-center p-8 bg-gray-50/30 cursor-pointer hover:bg-white hover:border-blue-200 transition-all group min-h-[220px]"
                  >
                    <div className="flex flex-col items-center text-gray-300 group-hover:text-blue-400 transition-colors">
                      <Plus size={40} className="mb-4 transition-transform group-hover:rotate-90 duration-500" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-center">Novo Projeto</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty/Archived Projects */}
              {emptyProjects.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Archive size={16} /> Projetos Vazios / Arquivados ({emptyProjects.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {emptyProjects.map(project => (
                      <SmallProjectCard
                        key={project.id}
                        project={project}
                        onClick={() => handleProjectClick(project)}
                        onEdit={(e) => { e.stopPropagation(); handleEditProject(project); }}
                        onDelete={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Global Deliverables Timeline */}
              {dashboardUserFilter !== 'all' && (
                <div className="pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Calendar size={16} /> Linha do Tempo: {dashboardUserFilter}
                  </h3>
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden h-[400px]">
                    <TimelineView
                      project={{ id: 'global', title: 'Global', description: '', progress: 0, totalTasks: 0, completedTasks: 0, columns: [] } as any}
                      tasks={filteredGlobalTasks.filter(t => t.startDate || t.endDate)} // Only show tasks with dates
                      allUsers={allUsers}
                      onTaskUpdate={(taskId, updates) => handleUpdateTaskField(taskId, Object.keys(updates)[0], Object.values(updates)[0])}
                    />
                  </div>
                </div>
              )}

              {/* Incomplete Tasks List */}
              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6 text-orange-400">
                  <AlertCircle size={16} /> Pendências de Cadastro ({incompleteTasks.length})
                </h3>
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Tarefa</th>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Projeto</th>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">O que falta?</th>
                        <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {incompleteTasks.slice(0, 8).map(task => {
                        const missing = [];
                        if (!task.responsible) missing.push('Responsável');
                        if (!task.clientName || task.clientName === 'Cliente') missing.push('Cliente');
                        if (!task.endDate) missing.push('Prazo');

                        const projName = projects.find(p => p.id === task.projectId)?.title || '...';

                        return (
                          <tr key={task.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-8 py-4">
                              <div className="font-bold text-xs text-gray-700 group-hover:text-blue-600 transition-colors">{task.title}</div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-bold text-gray-500 w-fit uppercase">{projName}</div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex gap-1">
                                {missing.map(m => (
                                  <span key={m} className="px-2 py-1 bg-orange-50 text-orange-500 rounded-md text-[9px] font-black uppercase tracking-tight border border-orange-100">{m}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <button
                                onClick={() => performNavigation(task.id, task.projectId)}
                                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-400 text-[9px] font-black text-gray-400 hover:text-blue-600 rounded-lg uppercase tracking-wide transition-all shadow-sm"
                              >
                                Corrigir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {incompleteTasks.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center opacity-30">
                              <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nenhuma pendência encontrada</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {incompleteTasks.length > 8 && (
                    <div className="px-8 py-4 bg-gray-50 text-center border-t border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Exibindo 8 de {incompleteTasks.length} pendências</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="py-6 px-8">Título</th>
                    <th className="py-6 px-8">Descrição</th>
                    <th className="py-6 px-8">Progresso</th>
                    <th className="py-6 px-8 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-blue-50/30 transition-all group cursor-pointer" onClick={() => handleProjectClick(project)}>
                      <td className="py-6 px-8">
                        <div className="font-black text-gray-800 text-sm uppercase tracking-tight">{project.title}</div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-tight max-w-xs truncate">{project.description || 'undefined'}</div>
                      </td>
                      <td className="py-6 px-8 w-80">
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] font-black text-blue-500 whitespace-nowrap min-w-[70px] flex items-center gap-1.5 uppercase">
                            <ClipboardList size={14} /> {project.totalTasks} tarefas
                          </div>
                          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full" style={{ width: `${project.progress}%` }} />
                          </div>
                          <div className="text-[10px] font-black text-emerald-500 whitespace-nowrap flex items-center gap-1.5 uppercase">
                            <CheckCircle2 size={14} /> {project.completedTasks} concluída(s)
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProjectClick(project); }}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                          >
                            <ChevronRight size={14} /> Visualizar
                          </button>
                          <button className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
                            <Edit2 size={14} /> Editar
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
  }

  return (
    <>
      {content}
      <style>{`
         .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Universal Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="bg-blue-600 p-8 text-white relative">
              <button
                onClick={() => setModalMode(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                {modalMode === 'project' && <LayoutGrid size={24} />}
                {modalMode === 'column' && <Settings size={24} />}
                {modalMode === 'task' && <ClipboardList size={24} />}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                {modalMode === 'project' && 'Novo Projeto'}
                {modalMode === 'column' && 'Nova Coluna'}
                {modalMode === 'task' && (editingTask ? 'Editar Tarefa' : 'Nova Tarefa')}
              </h2>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">
                {modalMode === 'project' && 'Crie um novo ambiente de trabalho'}
                {modalMode === 'column' && 'Adicione uma nova etapa ao seu fluxo'}
                {modalMode === 'task' && (editingTask ? 'Atualize os detalhes da tarefa' : `Adicionar em: ${modalForm.targetColumn}`)}
              </p>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {modalMode === 'column' ? 'Nome da Coluna' : 'Título'}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Digite aqui..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  />
                </div>

                {modalMode === 'task' && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Projeto</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        value={modalForm.projectId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const proj = projects.find(p => p.id === pid);
                          const firstCol = proj?.columns?.[0];
                          const colName = typeof firstCol === 'string' ? firstCol : (firstCol?.name || '');
                          setModalForm({ ...modalForm, projectId: pid, targetColumn: colName });
                        }}
                      >
                        <option value="">Selecionar Projeto...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Etapa / Coluna</label>
                      <select
                        disabled={!modalForm.projectId}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer disabled:opacity-50"
                        value={modalForm.targetColumn}
                        onChange={(e) => setModalForm({ ...modalForm, targetColumn: e.target.value })}
                      >
                        <option value="">Selecionar Etapa...</option>
                        {projects.find(p => p.id === modalForm.projectId)?.columns?.map(col => {
                          const name = typeof col === 'string' ? col : col.name;
                          return <option key={name} value={name}>{name}</option>;
                        })}
                      </select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subtítulo</label>
                      <input
                        type="text"
                        placeholder="Ex: Urgente - Matrícula Pendente"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={modalForm.subtitle}
                        onChange={(e) => setModalForm({ ...modalForm, subtitle: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pesquisar Cliente / Grupo</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Digite o nome para buscar..."
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                        />
                      </div>
                      {contactSearch && (
                        <div className="max-h-40 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-xl mt-1 custom-scrollbar">
                          {allContacts
                            .filter(c =>
                              c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                              c.phone?.includes(contactSearch) ||
                              c.id?.includes(contactSearch)
                            )
                            .map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setModalForm({
                                    ...modalForm,
                                    clientName: c.name,
                                    attendanceId: c.id // Store the full ID (JID)
                                  });
                                  setContactSearch('');
                                  fetchRecentMessages(c.id);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all text-left border-b border-gray-50 last:border-0"
                              >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 overflow-hidden shrink-0">
                                  {c.avatarUrl ? <img src={c.avatarUrl} className="w-full h-full object-cover" /> : c.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-gray-800 truncate">{c.name}</div>
                                  <div className="text-[9px] font-bold text-gray-400 truncate">{c.phone || c.id}</div>
                                </div>
                                {c.id.includes('@g.us') && (
                                  <div className="ml-auto bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Grupo</div>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {recentMessages.length > 0 && (
                      <div className="space-y-4 col-span-2 bg-blue-50/30 p-4 rounded-[2rem] border border-blue-50">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Marcar mensagens da conversa</label>
                        <div className="space-y-2">
                          {recentMessages.map(msg => (
                            <button
                              key={msg.id}
                              onClick={() => {
                                setSelectedMessageIds(prev =>
                                  prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                                );
                              }}
                              className={`w-full text-left p-3 rounded-2xl border transition-all text-[11px] font-bold ${selectedMessageIds.includes(msg.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200'}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-[8px] uppercase font-black ${selectedMessageIds.includes(msg.id) ? 'text-blue-200' : 'text-blue-600'}`}>
                                  {msg.fromMe ? 'Eu' : 'Cliente'}
                                </span>
                                <span className={`text-[8px] font-black opacity-60`}>
                                  {msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="line-clamp-2 leading-snug">{msg.text}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Cliente</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={modalForm.clientName}
                        onChange={(e) => setModalForm({ ...modalForm, clientName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Atendimento</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono"
                        value={modalForm.attendanceId}
                        onChange={(e) => setModalForm({ ...modalForm, attendanceId: e.target.value })}
                      />
                    </div>

                    <div className="col-span-2 space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Atribuído para (Multi-seleção)</label>
                      <div className="flex flex-wrap gap-3 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 shadow-inner">
                        {allUsers.map(u => {
                          const isSelected = modalForm.assignees.includes(u.name) || modalForm.responsible === u.name;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                const current = modalForm.assignees.length > 0 ? modalForm.assignees : (modalForm.responsible ? [modalForm.responsible] : []);
                                let next;
                                if (current.includes(u.name)) {
                                  next = current.filter(n => n !== u.name);
                                } else {
                                  next = [...current, u.name];
                                }
                                setModalForm({
                                  ...modalForm,
                                  assignees: next,
                                  responsible: next[0] || ''
                                });
                              }}
                              className={`w-12 h-12 rounded-full relative transition-all group ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 scale-110' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                              title={u.name}
                            >
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                                alt={u.name}
                                className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm"
                              />
                              {isSelected && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                  <CheckCircle2 size={12} className="text-white" />
                                </div>
                              )}
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-black uppercase">
                                {u.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Início</label>
                      <input
                        type="date"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={modalForm.startDate}
                        onChange={(e) => setModalForm({ ...modalForm, startDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Entrega</label>
                      <input
                        type="date"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={modalForm.endDate}
                        onChange={(e) => setModalForm({ ...modalForm, endDate: e.target.value })}
                      />
                    </div>

                    {/* Recurrence Section */}
                    <div className="col-span-2 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-50 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Repeat size={16} className="text-blue-500" />
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recorrência (Modelo)</label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frequência</label>
                          <select
                            className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-400 cursor-pointer"
                            value={modalForm.recurrenceType}
                            onChange={(e) => setModalForm({ ...modalForm, recurrenceType: e.target.value as any })}
                          >
                            <option value="none">Não repetir</option>
                            <option value="daily">Diariamente</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                            <option value="custom">Personalizado (Dias)</option>
                          </select>
                        </div>

                        {modalForm.recurrenceType !== 'none' && (
                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{modalForm.recurrenceType === 'custom' ? 'Intervalo (Dias)' : 'Acionar Próxima'}</label>
                            {modalForm.recurrenceType === 'custom' ? (
                              <input
                                type="number"
                                min="1"
                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-400"
                                value={modalForm.recurrenceInterval}
                                onChange={(e) => setModalForm({ ...modalForm, recurrenceInterval: parseInt(e.target.value) || 1 })}
                              />
                            ) : (
                              <select
                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-400 cursor-pointer"
                                value={modalForm.recurrenceTrigger}
                                onChange={(e) => setModalForm({ ...modalForm, recurrenceTrigger: e.target.value as any })}
                              >
                                <option value="completion">Ao Concluir</option>
                                <option value="scheduled">Na Data (Acumular)</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>

                      {modalForm.recurrenceType === 'weekly' && (
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Dias da Semana</label>
                          <div className="flex gap-2">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  const current = modalForm.recurrenceWeekDays || [];
                                  const newDays = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
                                  setModalForm({ ...modalForm, recurrenceWeekDays: newDays });
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${modalForm.recurrenceWeekDays?.includes(i) ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalForm.recurrenceType !== 'none' && (
                        <p className="text-[9px] text-blue-400 font-bold leading-relaxed">
                          * Esta tarefa servirá como modelo.
                          {modalForm.recurrenceTrigger === 'completion'
                            ? " A próxima será criada apenas quando esta for concluída."
                            : " A próxima será criada automaticamente na data prevista, independente da conclusão desta."}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>



              {modalMode === 'task' && (
                <div className="col-span-2 space-y-2 mb-6 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip size={16} className="text-blue-500" />
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Anexos</label>
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={handleModalFileUpload} disabled={isUploading} />
                      <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase hover:underline">
                        {isUploading ? <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /> : <Upload size={14} />}
                        Adicionar
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {modalForm.attachments?.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-xl relative group shadow-sm">
                        <div className="text-[10px] font-bold text-gray-700 truncate max-w-[150px]">{att.name}</div>
                        <button
                          onClick={() => setModalForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                          className="text-gray-300 hover:text-red-500 p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {(!modalForm.attachments || modalForm.attachments.length === 0) && (
                      <div className="text-[10px] text-gray-400 font-bold italic w-full text-center py-2 opacity-50">Nenhum anexo adicionado.</div>
                    )}
                  </div>
                </div>
              )}

              {modalMode !== 'column' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea
                    rows={3}
                    placeholder="Detalhes adicionais..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={!modalForm.title || isSaving}
                  onClick={() => {
                    if (modalMode === 'project') handleSaveProject();
                    if (modalMode === 'column') handleSaveColumn();
                    if (modalMode === 'task') handleSaveTask();
                  }}
                  className="flex-[2] bg-blue-600 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <CheckCircle2 size={16} />}
                  {isSaving ? 'Salvando...' : (editingTask && modalMode === 'task' ? 'Salvar Alterações' : 'Salvar Agora')}
                </button>
              </div>
            </div>
          </div>
        </div >
      )}
    </>
  );
};

export default TasksView;