
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Filter,
    Clock,
    User as UserIcon,
    Video,
    MapPin,
    CheckCircle2,
    Calendar,
    Eye,
    Settings,
    X,
    ClipboardList,
    Users,
    Info,
    AlertCircle,
    Trash2,
    Phone,
    Edit2
} from 'lucide-react';
import { db } from '../firebase';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    serverTimestamp,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    increment
} from 'firebase/firestore';

interface AgendaEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    startTime: string;
    endDate?: string;
    endTime?: string;
    type: 'meeting' | 'call' | 'reminder' | 'task_delivery';
    responsible: string;
    location?: string;
    meetingLink?: string;
    status: 'pending' | 'completed' | 'cancelled';
    participants?: string[];
    taskId?: string;
    contactName?: string;
    contactPhone?: string;
    createdAt: any;
}

interface Task {
    id: string;
    projectId: string;
    title: string;
    endDate?: string;
    date?: string;
    responsible: string;
    status: string;
}

const AgendaView: React.FC<{ user?: any }> = ({ user }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<{ id: string, name: string, photoURL?: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>(() => {
        // Recover from local storage or default to 'all'
        return localStorage.getItem('agenda_selected_user') || 'all';
    });
    const [activeFilters, setActiveFilters] = useState<string[]>(() => {
        const saved = localStorage.getItem('agenda_active_filters');
        return saved ? JSON.parse(saved) : ['meetings', 'tasks'];
    });

    // Save preferences whenever they change
    useEffect(() => {
        localStorage.setItem('agenda_selected_user', selectedUser);
    }, [selectedUser]);

    useEffect(() => {
        localStorage.setItem('agenda_active_filters', JSON.stringify(activeFilters));
    }, [activeFilters]);
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<AgendaEvent>>({
        type: 'meeting',
        status: 'pending',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00'
    });

    useEffect(() => {
        // Escutar Eventos
        const qE = query(collection(db, "agenda_events"), orderBy("startDate", "asc"));
        const unsubE = onSnapshot(qE, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaEvent)));
        });

        // Escutar Tarefas para entregas
        const qT = query(collection(db, "tasks"));
        const unsubT = onSnapshot(qT, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
        });

        // Escutar Usuários para filtro
        const qU = query(collection(db, "users"), orderBy("name", "asc"));
        const unsubU = onSnapshot(qU, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                photoURL: doc.data().photoURL
            })));
        });

        return () => { unsubE(); unsubT(); unsubU(); };
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        let dayEvents = events.filter(e => e.startDate === dateStr);
        let dayTasks = tasks.filter(t => t.endDate === dateStr);

        // Deduplicação: Se uma tarefa está vinculada a um evento da agenda, não mostre a tarefa separada
        const linkedTaskIds = new Set(events.map(e => e.taskId).filter(id => !!id));
        dayTasks = dayTasks.filter(t => !linkedTaskIds.has(t.id));

        // Filter by user
        if (selectedUser !== 'all') {
            dayEvents = dayEvents.filter(e => e.responsible === selectedUser);
            dayTasks = dayTasks.filter(t => t.responsible === selectedUser);
        }

        // Filter by Type
        if (!activeFilters.includes('meetings')) {
            dayEvents = dayEvents.filter(e => e.type !== 'meeting' && e.type !== 'call');
        }
        if (!activeFilters.includes('tasks')) {
            dayTasks = [];
        }
        if (!activeFilters.includes('completed')) {
            dayEvents = dayEvents.filter(e => e.status !== 'completed');
            dayTasks = dayTasks.filter(t => t.status !== 'completed');
        }

        return { events: dayEvents, tasks: dayTasks };
    };

    const handleSaveEvent = async () => {
        if (!newEvent.title || !newEvent.startDate) return alert("Título e data são obrigatórios");
        const AGENDA_PROJECT_ID = "wrDHyYVc6sU2HlEnFJoP";

        try {
            let taskId = newEvent.taskId;

            // Criar ou atualizar a TAREFA primeiro
            const taskData = {
                title: newEvent.title,
                description: newEvent.description || '',
                startDate: newEvent.startDate,
                endDate: newEvent.startDate,
                date: newEvent.startDate,
                responsible: newEvent.responsible || 'Sem responsável',
                status: newEvent.status === 'completed' ? 'completed' : 'pending',
                projectId: AGENDA_PROJECT_ID,
                column: 'Programada', // Coluna padrão para agenda
                updatedAt: serverTimestamp()
            };

            if (isEditing && taskId) {
                await updateDoc(doc(db, "tasks", taskId), taskData);
            } else {
                const taskRef = await addDoc(collection(db, "tasks"), {
                    ...taskData,
                    createdAt: serverTimestamp()
                });
                taskId = taskRef.id;

                // Incrementar contador do projeto
                await updateDoc(doc(db, "task_projects", AGENDA_PROJECT_ID), {
                    totalTasks: increment(1)
                });
            }

            // Agora salva o EVENTO
            if (isEditing && newEvent.id) {
                const eventRef = doc(db, "agenda_events", newEvent.id);
                const { id, ...dataToUpdate } = newEvent;
                await updateDoc(eventRef, {
                    ...dataToUpdate,
                    taskId,
                    updatedAt: serverTimestamp()
                });
                alert("Compromisso e tarefa atualizados!");
            } else {
                await addDoc(collection(db, "agenda_events"), {
                    ...newEvent,
                    taskId,
                    createdAt: serverTimestamp()
                });
                alert("Compromisso criado e enviado para o Kanban!");
            }
            setIsEventModalOpen(false);
            setIsEditing(false);
            setNewEvent({
                type: 'meeting',
                status: 'pending',
                startDate: new Date().toISOString().split('T')[0],
                startTime: '09:00'
            });
        } catch (e) {
            console.error("Erro ao sincronizar agenda e tarefas:", e);
            alert("Erro ao salvar compromisso");
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const handleEventClick = (event: AgendaEvent) => {
        setSelectedEvent(event);
        setShowDetailsModal(true);
    };

    const handleNavigateToTask = (event: AgendaEvent) => {
        if (event.taskId) {
            const task = tasks.find(t => t.id === event.taskId);
            window.dispatchEvent(new CustomEvent('navigateToTask', {
                detail: {
                    taskId: event.taskId,
                    projectId: task?.projectId || "wrDHyYVc6sU2HlEnFJoP"
                }
            }));
            setShowDetailsModal(false);
        }
    };

    const handleTaskClick = (task: Task) => {
        window.dispatchEvent(new CustomEvent('navigateToTask', {
            detail: {
                taskId: task.id,
                projectId: task.projectId
            }
        }));
    };

    const handleDeleteEvent = async (event: AgendaEvent) => {
        if (!confirm("Tem certeza que deseja excluir este compromisso?")) return;

        try {
            await deleteDoc(doc(db, "agenda_events", event.id));

            // Check if there's a linked task
            if (event.taskId) {
                if (confirm("Deseja excluir também a tarefa vinculada no Kanban?")) {
                    await deleteDoc(doc(db, "tasks", event.taskId));
                }
            }

            setShowDetailsModal(false);
            setSelectedEvent(null);
            alert("Compromisso excluído com sucesso!");
        } catch (e) {
            console.error("Erro ao excluir:", e);
            alert("Erro ao excluir evento");
        }
    };

    const handleEditEvent = (event: AgendaEvent) => {
        setNewEvent({ ...event });
        setIsEditing(true);
        setIsEventModalOpen(true);
        setShowDetailsModal(false);
    };

    const handleDragStart = (e: React.DragEvent, item: any, type: 'event' | 'task') => {
        e.dataTransfer.setData('itemId', item.id);
        e.dataTransfer.setData('type', type);
    };

    const handleDrop = async (e: React.DragEvent, day: number) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('itemId');
        const type = e.dataTransfer.getData('type');
        const newDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        try {
            if (type === 'event') {
                const eventSnap = await getDoc(doc(db, "agenda_events", itemId));
                if (eventSnap.exists()) {
                    const eventData = eventSnap.data();
                    await updateDoc(doc(db, "agenda_events", itemId), { startDate: newDate });

                    // Sincronizar data na tarefa vinculada
                    if (eventData.taskId) {
                        await updateDoc(doc(db, "tasks", eventData.taskId), {
                            startDate: newDate,
                            endDate: newDate,
                            date: newDate
                        });
                    }
                }
            } else {
                await updateDoc(doc(db, "tasks", itemId), { endDate: newDate, date: newDate });

                // Se for uma tarefa vinculada a um evento, atualizar o evento também
                const agendaQuery = query(collection(db, "agenda_events"), where("taskId", "==", itemId));
                const agendaSnap = await getDocs(agendaQuery);
                if (!agendaSnap.empty) {
                    await updateDoc(doc(db, "agenda_events", agendaSnap.docs[0].id), { startDate: newDate });
                }
            }
        } catch (error) {
            console.error("Erro ao mover item:", error);
            alert("Erro ao reagendar atividade.");
        }
    };

    return (
        <div className="h-full w-full bg-[#f8fafc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Agenda Corporativa</h1>
                        <p className="text-xs text-gray-500 font-medium">Controle suas reuniões, lembretes e prazos de entrega.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* User Filter */}
                    {/* User Filter with Avatars */}
                    <div className="flex items-center gap-1 bg-gray-50/50 p-1 rounded-full border border-gray-100">
                        <button
                            onClick={() => setSelectedUser('all')}
                            className={`h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedUser === 'all'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                            title="Todos os Usuários"
                        >
                            Todos
                        </button>

                        <div className="h-4 w-[1px] bg-gray-200 mx-1" />

                        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] custom-scrollbar pb-1 sm:pb-0">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUser(u.name)}
                                    className={`relative group transition-all p-0.5 rounded-full ${selectedUser === u.name
                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                            : 'hover:ring-2 hover:ring-gray-200 hover:ring-offset-1 opacity-60 hover:opacity-100'
                                        }`}
                                    title={u.name}
                                >
                                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-white">
                                        <img
                                            src={u.photoURL || `https://ui-avatars.com/api/?name=${u.name}&background=random`}
                                            alt={u.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Tooltip on hover */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {u.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setNewEvent({
                                type: 'meeting',
                                status: 'pending',
                                startDate: new Date().toISOString().split('T')[0],
                                startTime: '09:00'
                            });
                            setIsEventModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                    >
                        <Plus size={18} /> Novo Compromisso
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Info */}
                <div className="w-80 bg-white border-r border-gray-100 flex flex-col p-8 overflow-y-auto custom-scrollbar">
                    <div className="mb-10">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hoje</h2>
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all" />
                            <h3 className="text-3xl font-black mb-1">{new Date().getDate()}</h3>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4">
                                {monthNames[new Date().getMonth()]} {new Date().getFullYear()}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-black bg-white/20 w-fit px-3 py-1.5 rounded-full uppercase tracking-tighter">
                                <Clock size={12} /> {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo do Dia</h2>
                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {getEventsForDay(new Date().getDate()).events.length + getEventsForDay(new Date().getDate()).tasks.length}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {getEventsForDay(new Date().getDate()).events.length === 0 && getEventsForDay(new Date().getDate()).tasks.length === 0 ? (
                                <div className="py-8 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-300 uppercase italic">Nada agendado para hoje</p>
                                </div>
                            ) : (
                                <>
                                    {getEventsForDay(new Date().getDate()).events.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className={`p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 transition-all cursor-pointer group ${event.taskId ? 'hover:bg-blue-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-1.5 rounded-lg ${event.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                                                    event.type === 'call' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {event.type === 'meeting' ? (event.taskId ? <ClipboardList size={14} /> : <Video size={14} />) : <Clock size={14} />}
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{event.startTime}</span>
                                                {event.taskId && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full ml-auto">VINCULADO</span>}
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{event.title}</h4>
                                            <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-1 lowercase">
                                                <UserIcon size={10} /> {event.responsible}
                                            </p>
                                        </div>
                                    ))}
                                    {getEventsForDay(new Date().getDate()).tasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="p-4 bg-orange-50 border border-orange-100 rounded-2xl hover:border-orange-400 hover:bg-orange-100 transition-all cursor-pointer group shadow-sm active:scale-95"
                                            onClick={() => handleTaskClick(task)}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-all">
                                                    <ClipboardList size={14} />
                                                </div>
                                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Entrega</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-orange-800 truncate group-hover:text-orange-950">{task.title}</h4>
                                            <p className="text-[10px] text-orange-500 font-medium flex items-center gap-1 mt-1 lowercase">
                                                <UserIcon size={10} /> {task.responsible}
                                            </p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 p-8 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-6">
                            <h2 className="text-4xl font-black text-gray-800 lowercase tracking-tighter">
                                {monthNames[month]} <span className="text-blue-600 opacity-20">{year}</span>
                            </h2>
                            <div className="flex items-center gap-2 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <button
                                    onClick={handlePrevMonth}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentDate(new Date())}
                                    className="px-4 py-2 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-all uppercase tracking-widest"
                                >
                                    Hoje
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setActiveFilters(prev => prev.includes('meetings') ? prev.filter(f => f !== 'meetings') : [...prev, 'meetings'])
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeFilters.includes('meetings') ? 'bg-purple-50 border-purple-100 opacity-100' : 'bg-gray-50 border-gray-100 opacity-40 hover:opacity-100'}`}
                            >
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('meetings') ? 'text-purple-600' : 'text-gray-400'}`}>Reuniões</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveFilters(prev => prev.includes('tasks') ? prev.filter(f => f !== 'tasks') : [...prev, 'tasks'])
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeFilters.includes('tasks') ? 'bg-orange-50 border-orange-100 opacity-100' : 'bg-gray-50 border-gray-100 opacity-40 hover:opacity-100'}`}
                            >
                                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('tasks') ? 'text-orange-600' : 'text-gray-400'}`}>Tarefas</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveFilters(prev => prev.includes('completed') ? prev.filter(f => f !== 'completed') : [...prev, 'completed'])
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeFilters.includes('completed') ? 'bg-emerald-50 border-emerald-100 opacity-100' : 'bg-gray-50 border-gray-100 opacity-40 hover:opacity-100'}`}
                            >
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('completed') ? 'text-emerald-600' : 'text-gray-400'}`}>Concluídos</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-blue-50 border border-gray-100 overflow-hidden flex flex-col">
                        <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50/30">
                            {weekDays.map(day => (
                                <div key={day} className="py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 flex-1">
                            {/* Previous month padding */}
                            {Array.from({ length: startDay }).map((_, i) => (
                                <div key={`pad-${i}`} className="border-r border-b border-gray-50 bg-gray-50/5" />
                            ))}

                            {/* Current month days */}
                            {Array.from({ length: totalDays }).map((_, i) => {
                                const day = i + 1;
                                const { events: dayEvents, tasks: dayTasks } = getEventsForDay(day);
                                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                                return (
                                    <div
                                        key={day}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, day)}
                                        className={`border-r border-b border-gray-50 p-4 transition-all hover:bg-blue-50/10 relative group cursor-pointer ${isToday ? 'bg-blue-50/20' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`text-sm font-black ${isToday ? 'text-blue-600' : 'text-gray-400'} group-hover:text-blue-500 transition-colors`}>
                                                {day < 10 ? `0${day}` : day}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setNewEvent({
                                                        type: 'meeting',
                                                        status: 'pending',
                                                        startDate: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                                                        startTime: '09:00'
                                                    });
                                                    setIsEditing(false);
                                                    setIsEventModalOpen(true);
                                                }}
                                                className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all">
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                            {dayEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, event, 'event')}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEventClick(event);
                                                    }}
                                                    className={`group/item px-2 py-1 ${event.type === 'meeting' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                                                        event.type === 'call' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        } text-[9px] font-bold rounded-lg border border-white/50 truncate flex items-center gap-1 shadow-sm transition-colors relative`}
                                                >
                                                    <div className={`w-1 h-1 rounded-full ${event.type === 'meeting' ? 'bg-purple-500' :
                                                        event.type === 'call' ? 'bg-blue-500' :
                                                            'bg-amber-500'
                                                        }`} />
                                                    <span className="flex-1 truncate">{event.startTime} {event.title}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }}
                                                        className="hidden group-hover/item:block text-red-500 hover:text-red-700 ml-1"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {dayTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task, 'task')}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTaskClick(task);
                                                    }}
                                                    className="group/item px-2 py-1 bg-orange-100 text-orange-700 text-[9px] font-bold rounded-lg border border-white/50 truncate flex items-center gap-1 shadow-sm relative hover:bg-orange-200 transition-colors cursor-pointer active:scale-95"
                                                >
                                                    <div className="w-1 h-1 bg-orange-500 rounded-full" />
                                                    <ClipboardList size={8} />
                                                    <span className="flex-1 truncate">{task.title}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Deseja excluir esta tarefa?")) deleteDoc(doc(db, "tasks", task.id));
                                                        }}
                                                        className="hidden group-hover/item:block text-red-500 hover:text-red-700 ml-1"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Next month padding */}
                            {Array.from({ length: 42 - (totalDays + startDay) }).map((_, i) => (
                                <div key={`post-${i}`} className="border-r border-b border-gray-50 bg-gray-50/5" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col">
                        <div className="bg-blue-600 p-8 text-white relative">
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                <CalendarIcon size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">
                                {isEditing ? 'Editar Compromisso' : 'Novo Compromisso'}
                            </h2>
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">
                                {isEditing ? 'Atualize as informações do seu evento' : 'Agende uma reunião ou lembrete'}
                            </p>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Evento</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Reunião de Alinhamento"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                        value={newEvent.title || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                            value={newEvent.startDate || ''}
                                            onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário</label>
                                        <input
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                            value={newEvent.startTime || ''}
                                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer"
                                            value={newEvent.type || 'meeting'}
                                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                                        >
                                            <option value="meeting">Reunião</option>
                                            <option value="call">Chamada</option>
                                            <option value="reminder">Lembrete</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável</label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer"
                                            value={newEvent.responsible || ''}
                                            onChange={(e) => setNewEvent({ ...newEvent, responsible: e.target.value })}
                                        >
                                            <option value="">Selecionar...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.name}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Detalhes adicionais..."
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
                                        value={newEvent.description || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsEventModalOpen(false)}
                                    className="flex-1 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    className="flex-[2] bg-blue-600 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> {isEditing ? 'Salvar Alterações' : 'Salvar Agora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            {showDetailsModal && selectedEvent && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col">
                        <div className={`p-8 text-white relative ${selectedEvent.type === 'meeting' ? 'bg-purple-600' : selectedEvent.type === 'call' ? 'bg-blue-600' : 'bg-amber-600'}`}>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    {selectedEvent.type === 'meeting' ? <Video size={24} /> : <Clock size={24} />}
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{selectedEvent.type === 'meeting' ? 'Reunião + Tarefa' : 'Compromisso'}</span>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">{selectedEvent.title}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={12} /> Data</span>
                                    <p className="text-sm font-bold text-gray-800">{new Date(selectedEvent.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Horário</span>
                                    <p className="text-sm font-bold text-gray-800">{selectedEvent.startTime}h</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserIcon size={12} /> Responsável</span>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black">{selectedEvent.responsible.charAt(0)}</div>
                                    <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">{selectedEvent.responsible}</p>
                                </div>
                            </div>

                            {selectedEvent.contactName && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserIcon size={12} /> Solicitante</span>
                                    <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">{selectedEvent.contactName.charAt(0)}</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 uppercase tracking-tight leading-none">{selectedEvent.contactName}</p>
                                                {selectedEvent.contactPhone && <p className="text-[10px] font-bold text-blue-600 mt-1">{selectedEvent.contactPhone}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} /> Participantes</span>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {selectedEvent.participants.map((p, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tight border border-blue-100">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Info size={12} /> Detalhes</span>
                                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <p className="text-xs text-gray-600 font-medium leading-relaxed italic">{selectedEvent.description}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {selectedEvent.taskId && (
                                    <button
                                        onClick={() => handleNavigateToTask(selectedEvent)}
                                        className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <ClipboardList size={16} /> Ver no Kanban
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEditEvent(selectedEvent)}
                                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all shadow-sm flex items-center justify-center"
                                    title="Editar"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDeleteEvent(selectedEvent)}
                                    className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-100 transition-all shadow-sm flex items-center justify-center"
                                    title="Excluir"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default AgendaView;
