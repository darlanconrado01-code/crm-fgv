
import React, { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Panel,
    Node,
    Handle,
    Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Zap,
    Bot,
    Settings2,
    Save,
    Trash2,
    Plus,
    PhoneForwarded,
    Clock,
    X,
    Target,
    ArrowLeft,
    ChevronRight,
    MessageSquare,
    MoreVertical,
    Play,
    FileText,
    User2,
    Tag,
    Activity,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Mapeamento de Ícones para evitar salvar JSX no Firestore (causa erro de serialização)
const iconMap: any = {
    zap: <Zap size={20} />,
    bot: <Bot size={20} />,
    transfer: <PhoneForwarded size={20} />,
    wait: <Clock size={20} />,
    message: <MessageSquare size={20} />,
    target: <Target size={20} />,
    user: <User2 size={20} />,
    tag: <Tag size={20} />,
    status: <Activity size={20} />,
    field: <FileText size={20} />,
};

// Componentes Customizados de Nós
const CustomNode = ({ data, selected }: any) => {
    // Busca o ícone baseado no ID salvo no Firestore
    const Icon = iconMap[data.iconId] || iconMap.target;

    return (
        <div className={`px-4 py-3 rounded-2xl border-2 shadow-xl min-w-[200px] bg-white transition-all ${selected ? 'border-blue-500 scale-105 shadow-blue-100' : 'border-gray-100'}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-400" />

            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.iconBg || 'bg-blue-50'} ${data.iconColor || 'text-blue-600'}`}>
                    {Icon}
                </div>
                <div className="overflow-hidden">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">{data.typeLabel || 'Nó'}</p>
                    <p className="text-xs font-black text-gray-800 uppercase truncate">{data.label}</p>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-400" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const initialNodes: Node[] = [
    {
        id: 'start',
        type: 'input',
        data: {
            label: 'Webhook / Início',
            iconId: 'zap',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            typeLabel: 'Gatilho de Entrada'
        },
        position: { x: 250, y: 50 },
        className: 'bg-white border-2 border-emerald-500 text-emerald-600 font-black uppercase text-xs p-4 rounded-2xl shadow-lg'
    },
];

const FlowsView: React.FC = () => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [flows, setFlows] = useState<any[]>([]);
    const [defaultFlowId, setDefaultFlowId] = useState<string>('');
    const [welcomeFlowId, setWelcomeFlowId] = useState<string>('');
    const [currentFlow, setCurrentFlow] = useState<any>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [availableBots, setAvailableBots] = useState<any[]>([]);
    const [availableSectors, setAvailableSectors] = useState<any[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [availableFields, setAvailableFields] = useState<any[]>([]);

    // Carregar lista de fluxos
    const loadFlows = async () => {
        const flowsSnap = await getDocs(collection(db, "flows"));
        setFlows(flowsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const settingsSnap = await getDoc(doc(db, "settings", "flows"));
        if (settingsSnap.exists()) {
            setDefaultFlowId(settingsSnap.data().defaultFlowId || '');
            setWelcomeFlowId(settingsSnap.data().welcomeFlowId || '');
        }
    };

    useEffect(() => {
        loadFlows();
        const fetchData = async () => {
            const botsSnap = await getDocs(collection(db, "ai_agents"));
            setAvailableBots(botsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const sectorsSnap = await getDocs(collection(db, "sectors"));
            setAvailableSectors(sectorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const usersSnap = await getDocs(collection(db, "users"));
            setAvailableUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const tagsSnap = await getDocs(collection(db, "tags"));
            setAvailableTags(tagsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const fieldsSnap = await getDocs(collection(db, "custom_fields"));
            setAvailableFields(fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchData();
    }, []);

    const openEditor = (flow: any) => {
        setCurrentFlow(flow);
        setNodes(flow.nodes || initialNodes);
        setEdges(flow.edges || []);
        setView('editor');
    };

    const createNewFlow = async () => {
        const name = prompt("Nome do novo fluxo:");
        if (!name) return;

        const id = `flow_${Date.now()}`;
        const newFlow = {
            id,
            name,
            nodes: initialNodes,
            edges: [],
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "flows", id), newFlow);
            loadFlows();
        } catch (error) {
            console.error("Erro ao criar fluxo no Firestore:", error);
            alert("Erro ao criar fluxo. Verifique o console.");
        }
    };

    const deleteFlow = async (id: string) => {
        if (!confirm("Excluir este fluxo permanentemente?")) return;
        await deleteDoc(doc(db, "flows", id));
        loadFlows();
    };

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onNodeClick = (_: any, node: Node) => {
        setSelectedNode(node);
    };

    const updateNodeData = (data: any) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            })
        );
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
    };

    const saveFlow = async () => {
        if (!currentFlow) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "flows", currentFlow.id), {
                ...currentFlow,
                nodes,
                edges,
                updatedAt: new Date().toISOString()
            });
            alert("Fluxo salvo com sucesso!");
        } catch (error) {
            console.error("Error saving flow:", error);
            alert("Erro ao salvar fluxo.");
        } finally {
            setIsSaving(false);
        }
    };

    const addNode = (type: string) => {
        const id = `${type}_${Date.now()}`;
        let nodeData: any = { label: `Novo ${type}` };

        if (type === 'bot') {
            nodeData = {
                label: 'Ativar Robô',
                typeLabel: 'Inteligência Artificial',
                iconId: 'bot',
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                botId: ''
            };
        } else if (type === 'text') {
            nodeData = {
                label: 'Enviar Texto',
                typeLabel: 'Mensagem Direta',
                iconId: 'message',
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                message: ''
            };
        } else if (type === 'transfer') {
            nodeData = {
                label: 'Transbordar',
                typeLabel: 'Atendimento Humano',
                iconId: 'transfer',
                iconBg: 'bg-indigo-50',
                iconColor: 'text-indigo-600',
                sectorId: ''
            };
        } else if (type === 'wait') {
            nodeData = {
                label: 'Aguardar',
                typeLabel: 'Tempo / Delay',
                iconId: 'wait',
                iconBg: 'bg-gray-100',
                iconColor: 'text-gray-600',
                delay: 5
            };
        } else if (type === 'assign_agent') {
            nodeData = {
                label: 'Atribuir Agente',
                typeLabel: 'Ação de Atendimento',
                iconId: 'user',
                iconBg: 'bg-orange-50',
                iconColor: 'text-orange-600',
                agentId: ''
            };
        } else if (type === 'status') {
            nodeData = {
                label: 'Alterar Status',
                typeLabel: 'Ação de Atendimento',
                iconId: 'status',
                iconBg: 'bg-rose-50',
                iconColor: 'text-rose-600',
                status: 'atendimento'
            };
        } else if (type === 'add_tag') {
            nodeData = {
                label: 'Adicionar Tag',
                typeLabel: 'Organização',
                iconId: 'tag',
                iconBg: 'bg-pink-50',
                iconColor: 'text-pink-600',
                tag: ''
            };
        } else if (type === 'remove_tag') {
            nodeData = {
                label: 'Remover Tag',
                typeLabel: 'Organização',
                iconId: 'tag',
                iconBg: 'bg-red-50',
                iconColor: 'text-red-600',
                tag: ''
            };
        } else if (type === 'set_field') {
            nodeData = {
                label: 'Definir Campo',
                typeLabel: 'Dados do Lead',
                iconId: 'field',
                iconBg: 'bg-cyan-50',
                iconColor: 'text-cyan-600',
                fieldId: '',
                fieldValue: ''
            };
        }

        const newNode = {
            id,
            type: 'custom',
            data: nodeData,
            position: { x: 400, y: 100 },
        };
        setNodes((nds) => nds.concat(newNode as any));
    };

    const setFlowAsDefault = async (flowId: string) => {
        // Fluxo Padrão (Reativação)
        await setDoc(doc(db, "settings", "flows"), { defaultFlowId: flowId }, { merge: true });
        setDefaultFlowId(flowId);
    };

    const setFlowAsWelcome = async (flowId: string) => {
        // Fluxo de Boas Vindas (Primeiro Contato)
        await setDoc(doc(db, "settings", "flows"), { welcomeFlowId: flowId }, { merge: true });
        setWelcomeFlowId(flowId);
    };

    if (view === 'list') {
        return (
            <div className="h-full w-full bg-[#f8fafc] flex flex-col">
                <div className="bg-white border-b border-gray-100 flex flex-col px-10 py-6 gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Fluxos de Atendimento</h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gerencie múltiplos fluxos de automação</p>
                        </div>
                        <button
                            onClick={createNewFlow}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                        >
                            <Plus size={18} /> Criar Novo Fluxo
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-8 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <div className="flex-1 min-w-[300px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fluxo de Boas Vindas (Primeiro Contato)</label>
                            <select
                                value={welcomeFlowId}
                                onChange={(e) => setFlowAsWelcome(e.target.value)}
                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                <option value="">Nenhum fluxo selecionado</option>
                                {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[300px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fluxo Padrão (Ao Reativar Conversa)</label>
                            <select
                                value={defaultFlowId}
                                onChange={(e) => setFlowAsDefault(e.target.value)}
                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                <option value="">Nenhum fluxo selecionado</option>
                                {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                    {flows.map(flow => (
                        <div key={flow.id} className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                    <Zap size={28} />
                                </div>
                                <div className="flex gap-2 items-center">
                                    {defaultFlowId === flow.id && (
                                        <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Padrão</span>
                                    )}
                                    {welcomeFlowId === flow.id && (
                                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Boas-Vindas</span>
                                    )}
                                    <button onClick={() => deleteFlow(flow.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-1">{flow.name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {flow.nodes?.length || 0} Nós • Atualizado {new Date(flow.updatedAt || flow.createdAt).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => openEditor(flow)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all"
                                >
                                    <Settings2 size={14} /> Editar
                                </button>
                                {defaultFlowId !== flow.id && (
                                    <button
                                        onClick={() => setFlowAsDefault(flow.id)}
                                        className="px-4 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Ativar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white flex flex-col">
            {/* Editor Top Bar */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest">{currentFlow?.name}</h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Editando Fluxo Visual</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={saveFlow}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                        {isSaving ? <Zap className="animate-spin" size={16} /> : <Save size={16} />}
                        Salvar Fluxo
                    </button>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                {/* Sidebar de Ferramentas */}
                <div className="w-72 border-r border-gray-100 bg-gray-50/50 p-6 overflow-y-auto shrink-0 space-y-6">
                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Automação</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <NodeButton onClick={() => addNode('bot')} icon={Bot} label="Ativar Robô" color="blue" description="IA Inteligente" />
                            <NodeButton onClick={() => addNode('text')} icon={MessageSquare} label="Enviar Texto" color="emerald" description="Mensagem Fixa" />
                            <NodeButton onClick={() => addNode('transfer')} icon={PhoneForwarded} label="Transbordar" color="indigo" description="Mandar p/ Setor" />
                            <NodeButton onClick={() => addNode('wait')} icon={Clock} label="Aguardar" color="gray" description="Delay de Tempo" />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ações do Chat</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <NodeButton onClick={() => addNode('assign_agent')} icon={User2} label="Atribuir Agente" color="orange" description="Definir Responsável" />
                            <NodeButton onClick={() => addNode('status')} icon={Activity} label="Alterar Status" color="rose" description="Abrir / Fechar" />
                            <NodeButton onClick={() => addNode('add_tag')} icon={Tag} label="Adicionar Tag" color="pink" description="Taguear Lead" />
                            <NodeButton onClick={() => addNode('remove_tag')} icon={Tag} label="Remover Tag" color="red" description="Limpar Etiqueta" />
                            <NodeButton onClick={() => addNode('set_field')} icon={FileText} label="Definir Campo" color="cyan" description="Campos Personalizados" />
                        </div>
                    </section>
                </div>

                {/* Canvas do Fluxo */}
                <div className="flex-1 bg-gray-50 overflow-hidden relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes as any}
                        fitView
                    >
                        <Background color="#cbd5e1" variant={'dots' as any} gap={20} />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>

                {/* Painel de Configuração do Nó Selecionado */}
                {selectedNode && (
                    <div className="w-96 border-l border-gray-100 bg-white p-8 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl z-50">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                <Settings2 size={18} className="text-blue-500" />
                                Configurar Nó
                            </h3>
                            <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Título do Nó</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={selectedNode.data.label as string}
                                    onChange={(e) => updateNodeData({ label: e.target.value })}
                                />
                            </div>

                            {selectedNode.data.typeLabel?.includes('Inteligência') && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Selecionar Robô</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.botId as string}
                                        onChange={(e) => updateNodeData({ botId: e.target.value })}
                                    >
                                        <option value="">Escolha um robô...</option>
                                        {availableBots.map(bot => (
                                            <option key={bot.id} value={bot.id}>{bot.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.typeLabel?.includes('Mensagem') && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Conteúdo da Mensagem</label>
                                    <textarea
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                                        value={selectedNode.data.message as string}
                                        onChange={(e) => updateNodeData({ message: e.target.value })}
                                        placeholder="Olá, estamos processando sua solicitação..."
                                    />
                                </div>
                            )}

                            {selectedNode.data.typeLabel?.includes('Atendimento Humano') && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Direcionar para Setor</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.sectorId as string}
                                        onChange={(e) => updateNodeData({ sectorId: e.target.value })}
                                    >
                                        <option value="">Escolha um setor...</option>
                                        {availableSectors.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.typeLabel?.includes('Tempo') && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Delay (Segundos)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.delay as number}
                                        onChange={(e) => updateNodeData({ delay: parseInt(e.target.value) })}
                                    />
                                </div>
                            )}

                            {selectedNode.data.iconId === 'user' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Selecionar Agente</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.agentId as string}
                                        onChange={(e) => updateNodeData({ agentId: e.target.value })}
                                    >
                                        <option value="">Escolha um agente...</option>
                                        {availableUsers.map(user => (
                                            <option key={user.id} value={user.id}>{user.name || user.email}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.iconId === 'status' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mudar Status Para</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.status as string}
                                        onChange={(e) => updateNodeData({ status: e.target.value })}
                                    >
                                        <option value="atendimento">Em Atendimento</option>
                                        <option value="aguardando">Aguardando</option>
                                        <option value="bot">Bot (IA)</option>
                                        <option value="resolvido">Resolvido / Fechado</option>
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.iconId === 'tag' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Selecionar Tag</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={selectedNode.data.tag as string}
                                        onChange={(e) => updateNodeData({ tag: e.target.value })}
                                    >
                                        <option value="">Escolha uma tag...</option>
                                        {availableTags.map(tag => (
                                            <option key={tag.id} value={tag.name}>{tag.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.iconId === 'field' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Campo Personalizado</label>
                                        <select
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={selectedNode.data.fieldId as string}
                                            onChange={(e) => updateNodeData({ fieldId: e.target.value })}
                                        >
                                            <option value="">Escolha um campo...</option>
                                            {availableFields.map(f => (
                                                <option key={f.id} value={f.id}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Valor do Campo</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={selectedNode.data.fieldValue as string}
                                            onChange={(e) => updateNodeData({ fieldValue: e.target.value })}
                                            placeholder="Novo valor..."
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                    setSelectedNode(null);
                                }}
                                className="w-full mt-10 flex items-center justify-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest py-3 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={14} /> Excluir Nó
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const NodeButton = ({ icon: Icon, label, color, description, onClick }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600',
        gray: 'bg-gray-100 text-gray-600 hover:bg-gray-600',
        orange: 'bg-orange-50 text-orange-600 hover:bg-orange-600',
        rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600',
        pink: 'bg-pink-50 text-pink-600 hover:bg-pink-600',
        red: 'bg-red-50 text-red-600 hover:bg-red-600',
        cyan: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-600',
    };

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all group"
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${colors[color]} group-hover:text-white`}>
                <Icon size={20} />
            </div>
            <div className="text-left">
                <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{label}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{description}</p>
            </div>
        </button>
    );
};

export default FlowsView;
