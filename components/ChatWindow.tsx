import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Search, Phone, Video, CheckCheck, Trash2, X, AlertTriangle, User2, Languages, Loader2, RefreshCw, Users, CheckCircle2, Star, MessageSquare, Calendar, Building, Brain, Sparkles, PlusCircle, ClipboardList, ChevronDown, ChevronRight, Reply, Copy, Forward, Pin, Landmark, Flag, Heart, Bot, Clock, Edit2, Check, Mic, Square, Play, Pause, Archive, BellOff, Trash, MapPin, FileText, Image as ImageIcon, UserPlus, Plus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, writeBatch, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, where, limit, increment, arrayUnion } from 'firebase/firestore';
import { CustomField } from '../types';
import AIAppointmentOverlay from './AIAppointmentOverlay';
import { useNotification } from './Notification';

interface Message {
    id: string;
    text: string;
    sender: string;
    fromMe: boolean;
    timestamp: any;
    type: string;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
    messageType?: string;
    participant?: string;
    pushName?: string;
    avatarUrl?: string;
}

interface ChatWindowProps {
    chatId: string;
    contactName: string;
    currentUser?: any;
    initialDraft?: string;
    onDraftChange?: (draft: string) => void;
    isTask?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, contactName, currentUser, initialDraft = '', onDraftChange, isTask = false }) => {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState(initialDraft);
    const [isSending, setIsSending] = useState(false);
    const { notify, confirm: customConfirm } = useNotification();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showTagInput, setShowTagInput] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [contactData, setContactData] = useState<any>({});
    const [savingField, setSavingField] = useState(false);
    const [contactInfo, setContactInfo] = useState<any>(null);
    const [agentName, setAgentName] = useState<string>('Buscando...');
    const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
    const messageInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on typing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if modifier keys are pressed or if focus is already on an input/textarea
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;

            // Check if key is a single alphanumeric char or special char
            if (e.key.length === 1) {
                messageInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
    const [isSyncingProfile, setIsSyncingProfile] = useState(false);
    const [showEvaluateModal, setShowEvaluateModal] = useState(false);
    const [contactTasks, setContactTasks] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [evaluationDays, setEvaluationDays] = useState(2);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<{ summary: string, qualification: string, events?: any[] } | null>(null);
    const [evaluationMode, setEvaluationMode] = useState<'summary' | 'events' | 'custom'>('summary');
    const [customPrompt, setCustomPrompt] = useState('');
    const [suggestedEventToEdit, setSuggestedEventToEdit] = useState<any>(null);
    const [suggestedEventIndex, setSuggestedEventIndex] = useState<number | null>(null);
    const [activeAiSuggestion, setActiveAiSuggestion] = useState<any>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [messageMenu, setMessageMenu] = useState<{ id: string, x: number, y: number, top: number } | null>(null);
    const [isCreatingSmartTask, setIsCreatingSmartTask] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskProjects, setTaskProjects] = useState<any[]>([]);
    const [selectedProjectForTask, setSelectedProjectForTask] = useState<any>(null);
    const [taskModalData, setTaskModalData] = useState<any>({
        title: '',
        description: '',
        projectId: '',
        column: '',
        responsible: ''
    });
    const [attendants, setAttendants] = useState<any[]>([]);
    const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [pendingMedia, setPendingMedia] = useState<{ file: File, preview: string }[]>([]);
    const [mediaCaption, setMediaCaption] = useState('');
    const REUNIOES_PROJECT_ID = "wrDHyYVc6sU2HlEnFJoP";
    const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState<string | null>(null);
    const [audioPlaybackRate, setAudioPlaybackRate] = useState<Record<string, number>>({}); // Track speed per message or global? Global is better for UX, but let's do per msg or global. Global for simplicity.
    const [globalPlaybackRate, setGlobalPlaybackRate] = useState(1);
    const [audioRefState, setAudioRefState] = useState<HTMLAudioElement | null>(null); // To control speed
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [showingReactionsId, setShowingReactionsId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isEditingDisplayPhone, setIsEditingDisplayPhone] = useState(false);
    const [editedDisplayPhone, setEditedDisplayPhone] = useState('');

    // New Menu States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<any>(null);

    // Audio Playback States
    const [mentionState, setMentionState] = useState<any>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playProgress, setPlayProgress] = useState<{ [key: string]: number }>({});
    const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [isSearchingChat, setIsSearchingChat] = useState(false);
    const [chatSearchTerm, setChatSearchTerm] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const [allTasks, setAllTasks] = useState<any[]>([]);

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = () => {
            setMessageMenu(null);
            setMentionState(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

    useEffect(() => {
        if (!chatId) return;

        const clearUnread = async () => {
            try {
                const batch = writeBatch(db);
                batch.update(doc(db, "chats", chatId), { unreadCount: 0 });
                await batch.commit();
            } catch (e) {
                console.error("Erro ao zerar unreadCount:", e);
            }
        };
        clearUnread();

        let unsubscribe;

        if (isTask) {
            const taskRef = doc(db, "tasks", chatId);
            unsubscribe = onSnapshot(taskRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const comments = data.comments || [];
                    setMessages(comments.map(c => ({
                        id: c.id,
                        text: c.content,
                        sender: c.userName,
                        fromMe: c.userId === currentUser?.uid,
                        timestamp: c.createdAt,
                        type: 'chat',
                        avatarUrl: c.userAvatar
                    } as Message)));
                } else { setMessages([]); }
            });
        } else {
            const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            });
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [chatId, isTask, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // --- RESTORED HANDLERS ---
    const handleUpdateDisplayPhone = async (editedPhone?: string) => {
        const phoneToUpdate = editedPhone || editedDisplayPhone;
        if (!chatId || !phoneToUpdate?.trim()) return;
        try {
            const updates = { name: phoneToUpdate, updatedAt: serverTimestamp() };
            await updateDoc(doc(db, "chats", chatId), updates);
            await updateDoc(doc(db, "contacts", chatId), updates);
            setContactData(prev => ({ ...prev, ...updates }));
            setContactInfo(prev => ({ ...prev, ...updates }));
            setIsEditingDisplayPhone(false);
            if (typeof notify !== 'undefined') notify("Nome atualizado!", "success");
        } catch (e) { console.error(e); if (typeof notify !== 'undefined') notify("Erro ao atualizar nome", "error"); }
    };

    const handleUpdateAgent = async (newAgent: string) => {
        if (!chatId || isUpdatingAgent) return;
        setIsUpdatingAgent(true);
        try {
            const updates = { agent: newAgent, updatedAt: serverTimestamp() };
            await updateDoc(doc(db, "chats", chatId), updates);
            await updateDoc(doc(db, "contacts", chatId), updates);
            setAgentName(newAgent);
            if (typeof notify !== 'undefined') notify("Agente atualizado!", "success");
        } catch (e) { console.error(e); } finally { setIsUpdatingAgent(false); }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!chatId || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const updates: any = { status: newStatus, updatedAt: serverTimestamp() };
            if (newStatus === 'concluido') updates.agent = null;
            await updateDoc(doc(db, "chats", chatId), updates);
            await updateDoc(doc(db, "contacts", chatId), updates);
            setContactInfo(prev => ({ ...prev, status: newStatus, ...(newStatus === 'concluido' ? { agent: null } : {}) }));
            if (newStatus === 'concluido') setAgentName('Sem Responsável');
            if (typeof notify !== 'undefined') notify(newStatus === 'concluido' ? "Conversa Finalizada!" : "Status atualizado!", "success");
        } catch (e) { console.error(e); } finally { setIsUpdatingStatus(false); }
    };

    const handleFinishConversation = async () => {
        if (typeof customConfirm !== 'undefined' && await customConfirm({
            title: 'Finalizar Conversa',
            message: 'Deseja marcar esta conversa como concluída e remover o responsável?',
            type: 'success',
            confirmText: 'Finalizar'
        })) {
            await handleUpdateStatus('concluido');
        }
    };

    const handleToggleChatProperty = async (prop: string, value: any) => {
        if (!chatId) return;
        try {
            await updateDoc(doc(db, "chats", chatId), { [prop]: value });
            if (typeof notify !== 'undefined') notify("Atualizado!", "success");
        } catch (e) { console.error(e); }
    };

    const handleMarkUnread = async () => {
        if (!chatId) return;
        try {
            await updateDoc(doc(db, "chats", chatId), { unreadCount: 1 });
            if (typeof notify !== 'undefined') notify("Marcado como não lido", "success");
        } catch (e) { console.error(e); }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!chatId) return;
        try {
            const newTags = (contactInfo?.tags || []).filter((t: string) => t !== tagToRemove);
            const updates = { tags: newTags };
            await updateDoc(doc(db, "chats", chatId), updates);
            await updateDoc(doc(db, "contacts", chatId), updates);
            setContactInfo(prev => ({ ...prev, tags: newTags }));
        } catch (e) { console.error(e); }
    };

    const handleAddTag = async (newTag: string) => {
        if (!chatId || !newTag.trim()) return;
        const tag = newTag.trim().toUpperCase();
        if (contactInfo?.tags?.includes(tag)) return;
        try {
            const newTags = [...(contactInfo?.tags || []), tag];
            const updates = { tags: newTags };
            await updateDoc(doc(db, "chats", chatId), updates);
            await updateDoc(doc(db, "contacts", chatId), updates);
            setContactInfo(prev => ({ ...prev, tags: newTags }));
            setShowTagInput(false);
        } catch (e) { console.error(e); }
    };

    const getTagColor = (tag: string) => {
        const colors = ['bg-emerald-50 text-emerald-600', 'bg-blue-50 text-blue-600', 'bg-amber-50 text-amber-600', 'bg-purple-50 text-purple-600', 'bg-rose-50 text-rose-600'];
        let hash = 0;
        for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const handleUpdateCustomField = async (fieldId: string, value: any) => {
        if (!chatId) return;
        try {
            const updates = { [`customFields.${fieldId}`]: value };
            await updateDoc(doc(db, "contacts", chatId), updates);
            setContactData((prev: any) => ({
                ...prev,
                customFields: { ...(prev?.customFields || {}), [fieldId]: value }
            }));
        } catch (e) { console.error(e); }
    };

    const handleSelectMention = (item: any, prefix: string = '@') => {
        const mentionText = item.title || item.name || item.id;
        const regex = prefix === '@' ? /@\w*$/ : /#\w*$/;
        setNewMessage((prev: string) => prev.replace(regex, `${prefix}${mentionText} `));
        setMentionState(null);
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        if (onDraftChange) onDraftChange(value);

        // Detect @mentions
        const lastWord = value.split(' ').pop() || '';
        if (lastWord.startsWith('@') && lastWord.length > 1) {
            setMentionState({ query: lastWord.substring(1), position: { top: 0, left: 0 } });
        } else {
            setMentionState(null);
        }
    };

    const handleDeleteConversation = async () => {
        if (typeof customConfirm !== 'undefined' && await customConfirm({
            title: 'Apagar Conversa',
            message: 'Tem certeza? Isso apagará a conversa.',
            type: 'danger',
            confirmText: 'Apagar'
        })) {
            try {
                await deleteDoc(doc(db, "chats", chatId));
                if (typeof notify !== 'undefined') notify("Conversa apagada.", "success");
            } catch (e) { console.error(e); }
        }
    };

    const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: string, extra?: any) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !mediaUrl) return;

        if (isSending) return;

        const text = newMessage;
        const type = mediaType || 'chat';
        const quotedMsg = replyingMessage;

        setNewMessage('');
        if (onDraftChange) onDraftChange('');
        setReplyingMessage(null);
        setIsSending(true);

        try {
            if (isTask) {
                const comment = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId: currentUser?.uid || currentUser?.id || 'unknown',
                    userName: currentUser?.displayName || currentUser?.name || 'Agente',
                    userAvatar: currentUser?.photoURL || currentUser?.avatar || '',
                    content: mediaUrl || text,
                    createdAt: Timestamp.now()
                };

                await updateDoc(doc(db, "tasks", chatId), {
                    comments: arrayUnion(comment)
                });
                return;
            }

            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer cv_vpdmp2uusecjze6w0vs6'
                },
                body: JSON.stringify({
                    chatId: chatId,
                    text: mediaUrl || text,
                    caption: (extra && extra.caption) || null,
                    contactName: contactName,
                    type: type,
                    isMedia: !!mediaUrl,
                    quoted: quotedMsg ? {
                        id: quotedMsg.id,
                        text: quotedMsg.text,
                        fromMe: quotedMsg.fromMe,
                        remoteJid: chatId
                    } : undefined,
                    ...(extra || {})
                })
            });

            if (!response.ok) {
                const responseText = await response.text();
                let errorData = { message: responseText };
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) { }
                throw new Error(errorData.message || 'Erro ao enviar mensagem');
            }

            // OPTIMISTIC UPDATE
            try {
                await addDoc(collection(db, "chats", chatId, "messages"), {
                    text: mediaUrl || text,
                    sender: 'me',
                    fromMe: true,
                    timestamp: serverTimestamp(),
                    type: 'chat',
                    mediaUrl: mediaUrl || null,
                    caption: (extra && extra.caption) || null
                });

                await updateDoc(doc(db, "chats", chatId), {
                    lastMessage: mediaUrl ? (type === 'image' ? '📸 Imagem' : '📁 Mídia') : text,
                    updatedAt: serverTimestamp()
                });
            } catch (saveError) {
                console.error("Erro ao salvar mensagem localmente:", saveError);
            }

            // AUTO-ASSIGN & STATUS UPDATE
            if (chatId && currentUser) {
                try {
                    const chatRef = doc(db, "chats", chatId);
                    const chatSnap = await getDoc(chatRef);
                    if (chatSnap.exists()) {
                        const chatData = chatSnap.data();
                        if (!chatData.agent) {
                            await updateDoc(chatRef, { agent: currentUser.displayName || currentUser.name || 'Agente' });
                        }
                        if (chatData.status === 'aguardando') {
                            await updateDoc(chatRef, { status: 'atendimento' });
                        }
                    }
                } catch (e) { console.error("Auto-assign error", e); }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            if (typeof notify !== 'undefined') notify("Erro ao enviar mensagem.", "error");
        } finally {
            setIsSending(false);
        }
    };



    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            if (mediaRecorderRef.current) {
                // references handled in component
            }
            // We need to access the refs. Assuming they are in scope.
            // If they are not, this will still error, but we need to restore structure first.
            (window as any).mediaRecorder = mediaRecorder; // Fallback or strict ref usage

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current?.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (!audioChunksRef.current) return;
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg;codecs=opus' });
                if (audioChunksRef.current.length > 0) {
                    await sendAudioMessage(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Erro ao acessar microfone:", error);
            alert("Erro ao acessar microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                const stream = mediaRecorderRef.current?.stream;
                stream?.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            audioChunksRef.current = [];
            // notify("Gravação cancelada.", "info");
        }
    };

    const sendAudioMessage = async (blob: Blob) => {
        setIsSending(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];

                const response = await fetch('/api/core?resource=send-audio-n8n', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6`
                    },
                    body: JSON.stringify({
                        base64: base64data,
                        phone: chatId,
                        fromMe: true
                    })
                });

                if (!response.ok) throw new Error("Erro ao enviar áudio via n8n.");
            };
        } catch (error) {
            console.error("Erro ao enviar áudio:", error);
            alert("Erro ao enviar áudio.");
        } finally {
            setIsSending(false);
        }
    };

    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayAudio = (id: string, url: string) => {
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null; // Limpar referencia anterior
            }

            // Tratamento robusto para URLs
            const audio = new Audio(url);

            // Se for URL do R2, forçar crossOrigin para evitar problemas de CORS se configurado
            if (url.includes('r2.cloudflarestorage') || url.includes('r2.dev')) {
                audio.crossOrigin = "anonymous";
            }

            audioRef.current = audio;
            setPlayingId(id);

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Erro ao reproduzir áudio:", error);
                    notify("Erro ao reproduzir. Formato não suportado pelo navegador.", "error");
                    setPlayingId(null);
                });
            }

            audio.ontimeupdate = () => {
                setPlayProgress(prev => ({ ...prev, [id]: (audio.currentTime / audio.duration) * 100 }));
            };
            audio.onended = () => {
                setPlayingId(null);
                setPlayProgress(prev => ({ ...prev, [id]: 0 }));
            };
            audio.onloadedmetadata = () => {
                setAudioDurations(prev => ({ ...prev, [id]: audio.duration }));
            };
            audio.onerror = (e) => {
                console.error("Audio Error Event:", e);
                setPlayingId(null);
            }
        }
    };

    const handleSendLocation = async () => {
        setShowAttachmentMenu(false);
        if (!navigator.geolocation) {
            alert("Geolocalização não é suportada pelo seu navegador.");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            // Enviar como type: 'location'
            await handleSendMessage(null as any, undefined, 'location', {
                lat: latitude,
                log: longitude, // UZAPI usa 'log'
                title: 'Minha Localização',
                description: 'Localização Atual'
            });
        }, (error) => {
            console.error("Erro ao obter localização:", error);
            alert("Erro ao obter localização. Verifique as permissões.");
        });
    };

    const handleContactSelect = async (contact: any) => {
        setShowContactModal(false);
        const contactId = contact.id.includes('@') ? contact.id.split('@')[0] : contact.id;
        // Enviar como type: 'contact'
        // text: número do contato envido
        // caption: nome do contato
        await handleSendMessage(null as any, contactId, 'contact', {
            caption: contact.name || contactId
        });
    };

    const handleAction = async (msg: Message, action: string, extra?: any) => {
        setMessageMenu(null);

        switch (action) {
            case 'reply':
                setReplyingMessage(msg);
                break;
            case 'copy':
                navigator.clipboard.writeText(msg.text);
                notify("Mensagem copiada!", "success");
                break;
            case 'delete':
                if (await customConfirm({
                    title: 'Apagar Mensagem',
                    message: 'Deseja apagar esta mensagem para todos os participantes?',
                    type: 'danger',
                    confirmText: 'Apagar Agora'
                })) {
                    try {
                        const res = await fetch('/api/core', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6` },
                            body: JSON.stringify({ action: 'delete-message', chatId, messageId: msg.id, fromMe: msg.fromMe })
                        });
                        if (res.ok) {
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                            notify("Mensagem apagada com sucesso.", "success");
                        }
                    } catch (e) { notify("Erro ao apagar mensagem.", "error"); }
                }
                break;
            case 'react':
                try {
                    await fetch('/api/core', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6` },
                        body: JSON.stringify({ action: 'reaction', chatId, messageId: msg.id, fromMe: msg.fromMe, reaction: extra })
                    });
                    setShowingReactionsId(null);
                } catch (e) { notify("Erro ao reagir.", "error"); }
                break;
            case 'forward':
                setForwardingMessage(msg);
                setShowForwardModal(true);
                break;
            case 'pin':
                try {
                    const chatRef = doc(db, "chats", chatId);
                    const chatSnap = await getDoc(chatRef);
                    const currentPins = chatSnap.data()?.pinnedMessages || [];
                    if (currentPins.some((p: any) => p.id === msg.id)) {
                        await updateDoc(chatRef, { pinnedMessages: currentPins.filter((p: any) => p.id !== msg.id) });
                        notify("Mensagem desfixada.", "info");
                    } else if (currentPins.length >= 3) {
                        notify("Máximo de 3 mensagens fixadas.", "warning");
                    } else {
                        await updateDoc(chatRef, { pinnedMessages: [...currentPins, { id: msg.id, text: msg.text }] });
                        notify("Mensagem fixada com sucesso.", "success");
                    }
                } catch (e) { notify("Erro ao fixar mensagem.", "error"); }
                break;
            case 'favorite':
                try {
                    const msgRef = doc(db, "chats", chatId, "messages", msg.id);
                    await updateDoc(msgRef, { isStarred: !(msg as any).isStarred });
                    notify((msg as any).isStarred ? "Removida dos favoritos" : "Adicionada aos favoritos", "success");
                } catch (e) { notify("Erro ao favoritar.", "error"); }
                break;
            case 'copy-id':
                navigator.clipboard.writeText(msg.id);
                notify("ID da mensagem copiado!", "success");
                break;
            case 'report':
                notify("Denúncia enviada para análise.", "info");
                break;
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        processFiles(Array.from(files));
    };

    const processFiles = (files: File[]) => {
        const validFiles = files.filter(f => f.size <= 50 * 1024 * 1024); // Aumentado para 50MB
        if (validFiles.length < files.length) {
            alert("Alguns arquivos são muito grandes e foram ignorados (Máx 50MB).");
        }

        const newPending = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setPendingMedia(prev => [...prev, ...newPending]);
    };

    const handleSendMedia = async () => {
        if (pendingMedia.length === 0 || isSending) return;

        setIsSending(true);
        const caption = mediaCaption;
        setPendingMedia([]);
        setMediaCaption('');

        try {
            for (let i = 0; i < pendingMedia.length; i++) {
                const { file } = pendingMedia[i];

                // Upload cada arquivo
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                });

                const base64Data = await base64Promise;

                const res = await fetch('/api/upload-r2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type,
                        fileData: base64Data
                    })
                });

                const data = await res.json();
                if (data.status === 'success') {
                    const type = file.type.startsWith('image/') ? 'image' :
                        file.type.startsWith('video/') ? 'video' :
                            file.type.startsWith('audio/') ? 'audio' : 'document';

                    // Só envia legenda na primeira mídia (padrão WhatsApp) ou se o usuário quiser diferente
                    const currentCaption = i === 0 ? caption : "";

                    await handleSendMessage(null as any, data.url, type, { caption: currentCaption });
                } else {
                    console.error("Erro no upload do arquivo:", file.name);
                }
            }
        } catch (error) {
            console.error("Erro ao enviar mídias:", error);
            alert("Erro ao enviar um ou mais arquivos.");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteHistory = async () => {
        if (deleteConfirmText.toLowerCase() !== 'delete') return;

        setIsDeleting(true);
        try {
            // Helper function for batch deletion
            const deleteCollectionBatch = async (collectionPath: string, subCollection: string) => {
                const ref = collection(db, collectionPath, chatId, subCollection);

                while (true) {
                    const q = query(ref, limit(500));
                    const snapshot = await getDocs(q);

                    if (snapshot.empty) break;

                    const batch = writeBatch(db);
                    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
                    await batch.commit();

                    // Small delay to prevent rate limiting issues if massive
                    await new Promise(r => setTimeout(r, 50));
                }
            };

            // 1. Delete all messages (sub-collection)
            await deleteCollectionBatch("chats", "messages");

            // 2. Delete appointment suggestions (sub-collection)
            await deleteCollectionBatch("chats", "appointment_suggestions");

            // 3. Delete main documents
            const batch = writeBatch(db);
            batch.delete(doc(db, "contacts", chatId));
            batch.delete(doc(db, "chats", chatId));
            await batch.commit();

            setShowDeleteModal(false);
            setDeleteConfirmText('');
            alert('Contato e todo o histórico de conversas foram excluídos com sucesso!');

            // Recarregar a página ou forçar o fechamento da conversa
            window.location.reload();
        } catch (error) {
            console.error("Error deleting history:", error);
            alert("Erro ao realizar a limpeza completa dos dados.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSyncProfile = async () => {
        if (isSyncingProfile || !chatId) return;
        setIsSyncingProfile(true);
        try {
            const response = await fetch('/api/sync-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: chatId })
            });
            const responseText = await response.text();
            let data = { status: 'error' };
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Erro ao processar JSON de sync-profile:", e);
            }

            if (data.status === 'success') {
                // O onSnapshot cuidará de atualizar a UI
            } else {
                alert("Não foi possível encontrar uma foto pública para este número.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncingProfile(false);
        }
    };



    const handleTranscribe = async (messageId: string, audioUrl: string) => {
        if (transcribingIds.has(messageId)) return;

        setTranscribingIds(prev => new Set(prev).add(messageId));

        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl })
            });

            const data = await response.json();
            if (data.status === 'success') {
                setTranscriptions(prev => ({ ...prev, [messageId]: data.text }));
            } else {
                alert("Erro ao transcrever: " + (data.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error("Erro na transcrição:", error);
            alert("Erro ao conectar com o servidor de transcrição.");
        } finally {
            setTranscribingIds(prev => {
                const next = new Set(prev);
                next.delete(messageId);
                return next;
            });
        }
    };

    const handleEvaluateChat = async () => {
        setIsEvaluating(true);
        setEvaluationResult(null);
        try {
            const response = await fetch('/api/deep-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    days: evaluationDays,
                    mode: evaluationMode,
                    customPrompt: evaluationMode === 'custom' ? customPrompt : undefined
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                setEvaluationResult({
                    summary: data.summary,
                    qualification: data.qualification,
                    events: data.events || []
                });
            } else {
                alert("Erro ao analisar conversa: " + (data.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error("Erro na análise:", error);
            alert("Erro ao conectar com o serviço de análise.");
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleAcceptSuggestedEvent = async (event: any, index: number) => {
        try {
            const participantsText = event.participants && event.participants.length > 0
                ? `\n\nParticipantes: ${event.participants.join(', ')}`
                : '';

            let taskId = "";

            // 1. Criar Tarefa no Projeto REUNIÕES (Sempre cria em REUNIÕES se for meeting ou task sugerida)
            const taskRef = await addDoc(collection(db, "tasks"), {
                projectId: REUNIOES_PROJECT_ID,
                title: event.type === 'meeting' ? `REUNIÃO: ${event.title}` : event.title,
                description: `${event.description}${participantsText}`,
                status: 'pending',
                column: 'PROGRAMADA',
                responsible: contactInfo?.agent || 'Sem Responsável',
                participants: event.participants || [], // Salva os participantes identificados
                chatId: chatId,
                attendanceId: chatId?.split('@')[0] || 'N/A',
                clientName: contactInfo?.name || 'Cliente',
                date: event.date || new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });
            taskId = taskRef.id;

            if (event.type === 'meeting') {
                // 2. Criar Evento na Agenda com LINK para a Tarefa
                await addDoc(collection(db, "agenda_events"), {
                    title: event.title,
                    startDate: event.date || new Date().toISOString().split('T')[0],
                    startTime: event.time || '09:00',
                    type: 'meeting',
                    responsible: contactInfo?.agent || 'Sem Responsável',
                    contactId: chatId,
                    contactName: contactInfo?.name || 'Cliente', // Salva o nome do solicitante
                    contactPhone: chatId?.split('@')[0] || '', // Salva o número do solicitante
                    status: 'pending',
                    description: `Análise de IA: ${event.description}${participantsText}`,
                    participants: event.participants || [], // Também na agenda
                    taskId: taskId, // LINK IMPORTANTE
                    createdAt: serverTimestamp()
                });
            }

            // Remover da lista local para dar feedback visual
            setEvaluationResult(prev => {
                if (!prev || !prev.events) return prev;
                const newEvents = [...prev.events];
                newEvents.splice(index, 1);
                return { ...prev, events: newEvents };
            });

            alert(`${event.type === 'meeting' ? 'Compromisso e Tarefa' : 'Tarefa'} criado com sucesso e vinculado ao projeto REUNIÕES!`);
        } catch (e) {
            console.error("Erro ao aceitar evento:", e);
            alert("Erro ao criar item.");
        }
    };

    const handleSaveEditedEvent = () => {
        if (!suggestedEventToEdit || suggestedEventIndex === null) return;

        setEvaluationResult(prev => {
            if (!prev || !prev.events) return prev;
            const newEvents = [...prev.events];
            newEvents[suggestedEventIndex] = suggestedEventToEdit;
            return { ...prev, events: newEvents };
        });
        setSuggestedEventToEdit(null);
        setSuggestedEventIndex(null);
    };

    const handleAcceptAiSuggestion = async (suggestion: any) => {
        try {
            const suggestionRef = doc(db, "chats", chatId, "appointment_suggestions", suggestion.id);
            await updateDoc(suggestionRef, { status: 'accepted' });

            const participantsText = suggestion.participants && suggestion.participants.length > 0
                ? `\n\nParticipantes: ${suggestion.participants.join(', ')}`
                : '';

            // 1. Criar Tarefa no Projeto REUNIÕES (Para termos o ID)
            const taskRef = await addDoc(collection(db, "tasks"), {
                projectId: REUNIOES_PROJECT_ID,
                title: `REUNIÃO: ${suggestion.title}`,
                description: `${suggestion.summary}${participantsText}`,
                status: 'pending',
                column: 'PROGRAMADA',
                responsible: contactInfo?.agent || 'Sem Responsável',
                participants: suggestion.participants || [],
                chatId: chatId,
                attendanceId: chatId?.split('@')[0] || 'N/A',
                clientName: contactInfo?.name || 'Cliente',
                date: suggestion.date || new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });

            // 2. Criar Evento na Agenda vinculando à Tarefa
            await addDoc(collection(db, "agenda_events"), {
                title: suggestion.title,
                startDate: suggestion.date || new Date().toISOString().split('T')[0],
                startTime: suggestion.time || '09:00',
                type: 'meeting',
                responsible: contactInfo?.agent || 'Sem Responsável',
                contactId: chatId,
                contactName: contactInfo?.name || 'Cliente', // Nome do solicitante
                contactPhone: chatId?.split('@')[0] || '', // Número do solicitante
                status: 'pending',
                description: `Gerado automaticamente via IA: ${suggestion.summary}${participantsText}`,
                participants: suggestion.participants || [],
                taskId: taskRef.id, // LINK
                createdAt: serverTimestamp()
            });

            alert("Compromisso agendado e tarefa criada com sucesso!");
            setActiveAiSuggestion(null);
        } catch (e) {
            console.error("Erro ao aceitar sugestão:", e);
            alert("Erro ao salvar compromisso.");
        }
    };
    const handleDeclineAiSuggestion = async (suggestionId: string) => {
        try {
            const suggestionRef = doc(db, "chats", chatId, "appointment_suggestions", suggestionId);
            await updateDoc(suggestionRef, { status: 'declined' });
            setActiveAiSuggestion(null);
        } catch (e) {
            console.error("Erro ao recusar sugestão:", e);
        }
    };

    const toggleMessageSelection = (messageId: string) => {
        setSelectedMessageIds(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
                if (next.size === 0) setIsSelectionMode(false);
            } else {
                next.add(messageId);
            }
            return next;
        });
    };

    const handleCreateSmartTask = async () => {
        if (selectedMessageIds.size === 0) return;
        setIsCreatingSmartTask(true);

        try {
            const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.id));
            const messagesContent = selectedMsgs.map(m => ({
                text: m.text,
                sender: m.fromMe ? 'Agente' : (m.pushName || contactName),
                type: m.type,
                timestamp: m.timestamp?.toDate ? m.timestamp.toDate().toISOString() : null
            }));

            // Chamada para API de análise inteligente para criação de tarefa
            const response = await fetch('/api/deep-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    messages: messagesContent,
                    taskContext: true,
                    projects: taskProjects.map(p => ({ id: p.id, title: p.title })) // Passar projetos para a IA escolher
                })
            });

            const data = await response.json();

            let suggestedTitle = `Tarefa: ${contactName}`;
            let fullDescription = `Baseada em mensagens selecionadas:\n\n${messagesContent.map(m => `[${m.sender}]: ${m.text}`).join('\n')}`;
            let suggestedResponsible = contactInfo?.agent || 'Sem Responsável';
            let suggestedProjectId = taskProjects[0]?.id || '';
            let suggestedColumn = '';

            if (data.status === 'success' && data.events && data.events.length > 0) {
                const taskSuggestion = data.events[0];
                suggestedTitle = taskSuggestion.title || suggestedTitle;
                // Usar a descrição da IA, mas garantir que os detalhes originais estejam lá se necessário
                fullDescription = taskSuggestion.description || fullDescription;
                suggestedResponsible = taskSuggestion.responsible || suggestedResponsible;

                // Se a IA sugeriu um projeto válido
                if (taskSuggestion.projectId && taskProjects.some(p => p.id === taskSuggestion.projectId)) {
                    suggestedProjectId = taskSuggestion.projectId;
                }

                suggestedColumn = taskSuggestion.column || '';
            }

            // Selecionar o projeto sugerido ou o primeiro
            const targetProj = taskProjects.find(p => p.id === suggestedProjectId) || taskProjects[0];
            setSelectedProjectForTask(targetProj);

            // Se a coluna sugerida não existir no projeto, pegar a primeira coluna de lá
            const finalColumn = targetProj?.columns?.find((c: any) => {
                const name = typeof c === 'string' ? c : c.name;
                return name.toLowerCase() === suggestedColumn.toLowerCase();
            }) || targetProj?.columns?.[0];

            const columnName = typeof finalColumn === 'string' ? finalColumn : (finalColumn?.name || '');

            setTaskModalData({
                title: suggestedTitle,
                description: fullDescription,
                responsible: suggestedResponsible,
                projectId: targetProj?.id || '',
                column: columnName
            });

            setShowTaskModal(true);
            setIsSelectionMode(false);
            setSelectedMessageIds(new Set());

        } catch (e) {
            console.error("Erro ao criar tarefa inteligente:", e);
            alert("Erro ao processar análise. Abrindo modal manual.");

            const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.id));
            const manualDescription = `Mensagens selecionadas:\n\n${selectedMsgs.map(m => `[${m.fromMe ? 'Agente' : contactName}]: ${m.text}`).join('\n')}`;

            setTaskModalData({
                title: `Nova Tarefa: ${contactName}`,
                description: manualDescription,
                responsible: contactInfo?.agent || 'Sem Responsável',
                projectId: taskProjects[0]?.id || '',
                column: ''
            });
            setShowTaskModal(true);
        } finally {
            setIsCreatingSmartTask(false);
        }
    };

    const handleConfirmCreateTask = async () => {
        if (!taskModalData.title || !taskModalData.projectId || !taskModalData.column) {
            alert("Título, Projeto e Coluna são obrigatórios.");
            return;
        }

        setIsCreatingSmartTask(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const taskData: any = {
                projectId: taskModalData.projectId,
                title: taskModalData.title,
                description: taskModalData.description,
                status: 'pending',
                column: taskModalData.column,
                responsible: taskModalData.responsible,
                chatId: chatId,
                clientName: contactName,
                startDate: todayStr,
                date: todayStr,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "tasks"), taskData);

            // Atualizar contadores do projeto
            const projectRef = doc(db, "task_projects", taskModalData.projectId);
            await updateDoc(projectRef, {
                totalTasks: increment(1)
            });

            alert("Tarefa criada com sucesso!");
            setShowTaskModal(false);
        } catch (e) {
            console.error("Erro ao salvar tarefa:", e);
            alert("Erro ao salvar tarefa no banco de dados.");
        } finally {
            setIsCreatingSmartTask(false);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const [isOver, setIsOver] = useState(false);

    return (
        <div
            className={`flex flex-col h-full bg-[#efeae2] relative overflow-hidden transition-all ${isOver ? 'ring-4 ring-inset ring-emerald-500/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsOver(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    processFiles(Array.from(files));
                }
            }}
        >
            {isSending && (
                <div className="absolute inset-x-0 top-16 h-1 bg-gray-100 z-[100] overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-progress origin-left w-full" />
                </div>
            )}

            {isOver && (
                <div className="absolute inset-0 z-[80] bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-dashed border-emerald-500 flex flex-col items-center animate-in zoom-in-95">
                        <Paperclip size={48} className="text-emerald-500 mb-4 animate-bounce" />
                        <p className="text-xl font-black text-gray-800 uppercase tracking-tighter">Solte para enviar arquivo</p>
                    </div>
                </div>
            )}
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                    backgroundSize: '400px'
                }}
            />

            {/* Header */}
            <header className="h-16 bg-[#f0f2f5] border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm relative">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-200/50 py-1 px-2 rounded-xl transition-all"
                    onClick={() => setShowSidebar(!showSidebar)}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white ${contactInfo?.isGroup ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                        <img
                            src={contactInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${contactName}&background=${contactInfo?.isGroup ? '10b981' : '3b82f6'}&color=fff`}
                            alt={contactName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 text-sm leading-tight">{contactName}</h3>
                            {contactInfo?.displayPhone && (
                                <span className="text-gray-400 text-[10px] font-medium italic">({contactInfo.name || chatId.split('@')[0]})</span>
                            )}
                            {!contactInfo?.displayPhone && <span className="text-gray-400 text-xs font-medium">({chatId.split('@')[0]})</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-none">Online</p>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 tracking-tighter">
                                <User2 size={10} />
                                {agentName}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 transition-all">
                            {contactInfo?.tags && contactInfo.tags.length > 0 && contactInfo.tags.map((tag: string, idx: number) => (
                                <span key={idx} className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1 border ${getTagColor(tag)} animate-in zoom-in duration-300`}>
                                    {tag}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveTag(tag);
                                        }}
                                        className="hover:scale-125 transition-transform"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </span>
                            ))}


                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                    {isSearchingChat ? (
                        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl animate-in slide-in-from-right-4">
                            <Search size={14} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar na conversa..."
                                className="bg-transparent border-none outline-none text-xs w-40 font-medium"
                                value={chatSearchTerm}
                                onChange={(e) => setChatSearchTerm(e.target.value)}
                                autoFocus
                            />
                            <button onClick={() => { setIsSearchingChat(false); setChatSearchTerm(''); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchingChat(true)}
                            className="p-2.5 hover:bg-gray-200/50 rounded-xl transition-all text-gray-500"
                            title="Pesquisar"
                        >
                            <Search size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowEvaluateModal(true)}
                        className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 group"
                        title="Análise com IA"
                    >
                        <Brain size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">Análise IA</span>
                    </button>
                    <button
                        onClick={handleFinishConversation}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2 group"
                        title="Finalizar Conversa"
                    >
                        <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">Finalizar</span>
                    </button>
                    <div className="relative">
                        <MoreVertical
                            size={20}
                            className="hover:text-gray-600 cursor-pointer"
                            onClick={() => setShowOptions(!showOptions)}
                        />
                        {showOptions && (
                            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => {
                                        handleToggleChatProperty('isArchived', !contactInfo?.isArchived);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Archive size={16} /> {contactInfo?.isArchived ? 'Desarquivar' : 'Arquivar'}
                                </button>
                                <button
                                    onClick={() => {
                                        handleToggleChatProperty('isPinned', !contactInfo?.isPinned);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Pin size={16} /> {contactInfo?.isPinned ? 'Desafixar' : 'Fixar'}
                                </button>
                                <button
                                    onClick={() => {
                                        handleMarkUnread();
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <MessageSquare size={16} /> Marcar como não lida
                                </button>
                                <button
                                    onClick={() => {
                                        handleToggleChatProperty('isMuted', !contactInfo?.isMuted);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <BellOff size={16} /> {contactInfo?.isMuted ? 'Ativar Notificações' : 'Silenciar'}
                                </button>
                                <button
                                    onClick={() => {
                                        handleToggleChatProperty('isStarred', !contactInfo?.isStarred);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Star size={16} className={contactInfo?.isStarred ? "fill-amber-400 text-amber-400" : ""} /> {contactInfo?.isStarred ? 'Remover Favorito' : 'Favoritar'}
                                </button>
                                <div className="h-px bg-gray-100 my-1" />
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(true);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Trash2 size={16} /> Limpar Mensagens
                                </button>
                                <button
                                    onClick={() => {
                                        handleDeleteConversation();
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Trash size={16} /> Apagar Conversa
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header >

            {/* Pinned Messages Bar */}
            {
                contactInfo?.pinnedMessages && contactInfo.pinnedMessages.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-2 flex items-center justify-between z-20 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Pin size={14} className="text-emerald-500 fill-emerald-500" />
                            <div
                                className="text-xs font-bold text-gray-600 truncate cursor-pointer hover:text-emerald-600 transition-colors"
                                onClick={() => {
                                    const lastPin = contactInfo.pinnedMessages[contactInfo.pinnedMessages.length - 1];
                                    const el = document.getElementById(`msg-${lastPin.id}`);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                            >
                                {contactInfo.pinnedMessages[contactInfo.pinnedMessages.length - 1].text}
                            </div>
                        </div>
                        {contactInfo.pinnedMessages.length > 1 && (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">+{contactInfo.pinnedMessages.length - 1} fixadas</span>
                        )}
                    </div>
                )
            }

            {/* Selection Mode Action Bar */}
            {
                isSelectionMode && (
                    <div className="absolute top-16 inset-x-0 bg-emerald-600 px-6 py-4 flex items-center justify-between z-[60] shadow-xl animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-4 text-white">
                            <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds(new Set()); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                            <span className="font-black uppercase tracking-widest text-xs">{selectedMessageIds.size} selecionadas</span>
                        </div>
                        <button
                            onClick={handleCreateSmartTask}
                            disabled={isCreatingSmartTask}
                            className="bg-white text-emerald-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isCreatingSmartTask ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
                            CRIAR TAREFA IA
                        </button>
                    </div>
                )
            }

            {/* Messages Area */}
            <div
                ref={listRef}
                onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                    setShowScrollBottom(!isAtBottom);
                }}
                className={`flex-1 overflow-y-auto p-6 space-y-3 z-10 custom-scrollbar pr-4 pt-10 ${isSelectionMode ? 'bg-gray-100/50' : ''}`}
            >
                {messages.length > 0 ? (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300 group/msg relative`}
                            onClick={() => isSelectionMode && toggleMessageSelection(msg.id)}
                        >
                            {/* Selection Checkbox */}
                            {isSelectionMode && (
                                <div className={`shrink-0 self-center w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMessageIds.has(msg.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                                    {selectedMessageIds.has(msg.id) && <CheckCircle2 size={14} />}
                                </div>
                            )}

                            {!msg.fromMe && contactInfo?.isGroup && (
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto mb-1 border border-gray-100 shadow-sm">
                                    <img
                                        src={msg.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.pushName || msg.participant || 'U')}&background=random&color=fff`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative cursor-pointer transition-all ${selectedMessageIds.has(msg.id) ? 'ring-2 ring-emerald-500 shadow-lg scale-[1.02] z-30' : ''} ${highlightedMessageId === msg.id ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.05] z-50 animate-pulse' : ''} ${msg.fromMe ? 'bg-[#e7fed8] text-gray-800 rounded-tr-none border border-[#d1f4ba]' : 'bg-white text-gray-800 rounded-tl-none border border-white'}`}>
                                {/* Quoted Message Rendering */}
                                {(msg as any).quoted && (
                                    <div
                                        className="mb-2 bg-black/5 border-l-4 border-emerald-500 rounded-lg p-2 text-[11px] cursor-pointer hover:bg-black/10 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const el = document.getElementById(`msg-${(msg as any).quoted.id}`);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                    >
                                        <p className="font-bold text-emerald-700 truncate">
                                            {(msg as any).quoted.participant || 'Mensagem'}
                                        </p>
                                        <p className="text-gray-500 truncate italic">
                                            {(msg as any).quoted.text}
                                        </p>
                                    </div>
                                )}

                                {/* Per-message Dropdown Menu */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity z-40">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMessageMenu({ id: msg.id, x: rect.left, y: rect.bottom, top: rect.top });
                                        }}
                                        className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-400"
                                    >
                                        <ChevronDown size={18} />
                                    </button>
                                </div>

                                {/* Message context menu UI */}
                                {messageMenu?.id === msg.id && (
                                    <div
                                        className={`fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 w-56 animate-in duration-200 ${messageMenu.y + 400 > window.innerHeight ? 'slide-in-from-bottom-2 zoom-in-95' : 'slide-in-from-top-2 zoom-in-95'}`}
                                        style={{
                                            top: messageMenu.y + 400 > window.innerHeight ? 'auto' : messageMenu.y + 10,
                                            bottom: messageMenu.y + 400 > window.innerHeight ? (window.innerHeight - messageMenu.top) + 10 : 'auto',
                                            left: Math.min(messageMenu.x, window.innerWidth - 240)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => handleAction(msg, 'reply')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Reply size={16} className="text-gray-400" /> Responder
                                        </button>
                                        <button onClick={() => handleAction(msg, 'copy')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Copy size={16} className="text-gray-400" /> Copiar
                                        </button>
                                        <button
                                            onClick={() => setShowingReactionsId(showingReactionsId === msg.id ? null : msg.id)}
                                            className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors text-gray-700 font-bold"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Smile size={16} className="text-gray-400" /> Reagir
                                            </div>
                                            <ChevronDown size={14} className="text-gray-300" />
                                        </button>

                                        {showingReactionsId === msg.id && (
                                            <div className="px-4 py-2 flex gap-2 justify-center bg-gray-50/50">
                                                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                    <button key={emoji} onClick={() => handleAction(msg, 'react', emoji)} className="text-xl hover:scale-125 transition-transform">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button onClick={() => handleAction(msg, 'forward')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Forward size={16} className="text-gray-400" /> Encaminhar
                                        </button>
                                        <button onClick={() => handleAction(msg, 'copy-id')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Copy size={16} className="text-gray-400" /> Copiar ID
                                        </button>

                                        <div className="my-1 border-t border-gray-50" />

                                        <button onClick={() => handleAction(msg, 'pin')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Pin size={16} className="text-gray-400" /> Fixar
                                        </button>
                                        <button onClick={() => handleAction(msg, 'favorite')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                                            <Star size={16} className="text-gray-400" /> Favoritar
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(true);
                                                setSelectedMessageIds(new Set([msg.id]));
                                                setMessageMenu(null);
                                            }}
                                            className="w-full px-5 py-2.5 text-left text-sm hover:bg-emerald-50 text-emerald-600 flex items-center gap-3 transition-colors font-black"
                                        >
                                            <ClipboardList size={16} /> Criar Tarefa IA
                                        </button>

                                        <div className="my-1 border-t border-gray-50" />

                                        <button onClick={() => handleAction(msg, 'report')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-50 text-amber-600 flex items-center gap-3 transition-colors font-bold">
                                            <Flag size={16} /> Denunciar
                                        </button>
                                        <button onClick={() => handleAction(msg, 'delete')} className="w-full px-5 py-2.5 text-left text-sm hover:bg-red-50 text-red-500 flex items-center gap-3 transition-colors font-bold">
                                            <Trash2 size={16} /> Apagar
                                        </button>
                                    </div>
                                )}
                                {/* Participant Name for Groups */}
                                {!msg.fromMe && contactInfo?.isGroup && (
                                    <div className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                                        <User2 size={10} />
                                        {msg.pushName || (msg.participant ? msg.participant.split('@')[0] : 'Desconhecido')}
                                    </div>
                                )}

                                {/* Mídia Rendering */}
                                {msg.type === 'image' && msg.mediaUrl && (
                                    <div className="mb-2 mt-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center max-w-[330px] max-h-[400px]">
                                        <img
                                            src={msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('http')
                                                ? msg.mediaUrl
                                                : `data:${msg.mimeType || 'image/jpeg'};base64,${msg.mediaUrl}`}
                                            alt="Photo"
                                            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                            onClick={() => setLightboxMedia(msg.mediaUrl)}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                const parent = (e.target as HTMLElement).parentElement;
                                                if (parent) parent.innerHTML = '<div class="p-4 text-[10px] text-gray-400 font-bold uppercase text-center">Erro ao carregar imagem</div>';
                                            }}
                                        />
                                    </div>
                                )}

                                {msg.type === 'video' && msg.mediaUrl && (
                                    <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 bg-black min-h-[100px] flex items-center justify-center text-white">
                                        <video controls className="max-w-full h-auto">
                                            <source src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `data:${msg.mimeType || 'video/mp4'};base64,${msg.mediaUrl}`} type={msg.mimeType || 'video/mp4'} />
                                            Seu navegador não suporta vídeos.
                                        </video>
                                    </div>
                                )}

                                {msg.type === 'audio' && msg.mediaUrl && (
                                    <div className="mb-1 mt-1 flex items-center gap-3 min-w-[280px] py-1">
                                        {/* Avatar with Mic Badge */}
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                                <img
                                                    src={msg.fromMe ? (localStorage.getItem('userAvatar') || 'https://github.com/shadcn.png') : (msg.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.pushName || 'U')}&background=random&color=fff`)}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                                <Mic size={14} className={msg.fromMe ? "text-emerald-500" : "text-gray-400"} />
                                            </div>
                                        </div>

                                        {/* Custom Player UI */}
                                        <div className="flex-1 space-y-2 min-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePlayAudio(msg.id, msg.mediaUrl!)}
                                                    className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                                                >
                                                    {playingId === msg.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                                </button>

                                                {/* Timeline Slider */}
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={playingId === msg.id ? (playProgress[msg.id] || 0) : 0}
                                                        onChange={(e) => {
                                                            const newTime = (parseFloat(e.target.value) / 100) * (audioDurations[msg.id] || 1);
                                                            if (audioRef.current && playingId === msg.id) {
                                                                audioRef.current.currentTime = newTime;
                                                            }
                                                            setPlayProgress(prev => ({ ...prev, [msg.id]: parseFloat(e.target.value) }));
                                                        }}
                                                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                {/* Speed Control */}
                                                {playingId === msg.id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const speeds = [1, 1.5, 2];
                                                            const nextIdx = (speeds.indexOf(globalPlaybackRate) + 1) % speeds.length;
                                                            const newRate = speeds[nextIdx];
                                                            setGlobalPlaybackRate(newRate);
                                                            if (audioRef.current) audioRef.current.playbackRate = newRate;
                                                        }}
                                                        className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-black text-gray-500 hover:bg-gray-200 min-w-[30px]"
                                                    >
                                                        {globalPlaybackRate}x
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center pl-1">
                                                <span className="text-[9px] font-bold text-gray-400">
                                                    {playingId === msg.id
                                                        ? formatDuration(audioRef.current?.currentTime || 0)
                                                        : formatDuration(audioDurations[msg.id] || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {transcriptions[msg.id] ? (
                                            <div className="mt-2 p-3 bg-white/50 rounded-xl border border-dashed border-gray-200 animate-in fade-in duration-500 w-full clear-both">
                                                <p className="text-[11px] text-gray-500 italic leading-relaxed">
                                                    "{transcriptions[msg.id]}"
                                                </p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleTranscribe(msg.id, msg.mediaUrl!)}
                                                disabled={transcribingIds.has(msg.id)}
                                                className="absolute -bottom-6 left-12 flex items-center gap-1.5 text-[9px] font-black text-blue-500/60 uppercase tracking-wider hover:text-blue-600 transition-colors disabled:opacity-50"
                                            >
                                                <Languages size={10} /> TRANSCREVER
                                            </button>
                                        )}
                                    </div>
                                )}

                                {msg.type === 'document' && msg.mediaUrl && (
                                    <div className="mb-2 mt-1 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-[10px] uppercase">
                                            {msg.fileName?.split('.').pop() || 'DOC'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{msg.fileName || 'Arquivo'}</p>
                                            <a
                                                href={msg.mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-500 font-bold hover:underline"
                                            >
                                                DOWNLOAD
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {msg.type === 'sticker' && msg.mediaUrl && (
                                    <div className="mb-2 mt-1 w-32 h-32">
                                        <img src={msg.mediaUrl} alt="Sticker" className="w-full h-full object-contain" />
                                    </div>
                                )}

                                {msg.text && msg.text !== 'Mídia' && !msg.text.includes('r2.dev') && (
                                    <div className="pb-3 pr-10">
                                        <p className="text-[14px] whitespace-pre-wrap leading-relaxed">
                                            {expandedMessages[msg.id] || msg.text.length <= 3000
                                                ? (chatSearchTerm && msg.text.toLowerCase().includes(chatSearchTerm.toLowerCase()) ? (
                                                    msg.text.split(new RegExp(`(${chatSearchTerm})`, 'gi')).map((part, i) =>
                                                        part.toLowerCase() === chatSearchTerm.toLowerCase()
                                                            ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
                                                            : part
                                                    )
                                                ) : msg.text)
                                                : `${msg.text.slice(0, 3000)}...`
                                            }
                                        </p>
                                        {msg.text.length > 3000 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedMessages(prev => ({ ...prev, [msg.id]: !prev[msg.id] }));
                                                }}
                                                className="text-blue-500 font-bold text-[10px] mt-2 hover:underline uppercase tracking-wide"
                                            >
                                                {expandedMessages[msg.id] ? 'Ler menos' : `Ler mais (${msg.text.length - 3000} caracteres)`}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Reactions Rendering */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className="absolute -bottom-3 left-2 flex -space-x-1 animate-in zoom-in-50 duration-300">
                                        {Object.entries(msg.reactions).map(([reactor, emoji]: any, idx) => (
                                            <div key={idx} className="bg-white border border-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-sm ring-2 ring-white" title={reactor}>
                                                {emoji}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                                    <span className="text-[9px] text-gray-400 font-bold">{formatTime(msg.timestamp)}</span>
                                    {(msg as any).isStarred && <Star size={10} className="text-amber-400 fill-amber-400" />}
                                    {msg.fromMe && <CheckCheck size={14} className="text-blue-500" />}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mt-2">Sem histórico de mensagens</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollBottom && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-8 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:scale-110 transition-all z-[30] animate-in fade-in zoom-in slide-in-from-bottom-4"
                >
                    <ChevronDown size={20} />
                </button>
            )}

            {/* Contact Info Sidebar */}
            {
                showSidebar && (
                    <div className="absolute top-16 bottom-0 right-0 w-[400px] bg-white border-l border-gray-100 z-[40] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 flex flex-col items-center border-b border-gray-50 bg-gradient-to-b from-blue-50/30 to-white">
                            <div className={`w-28 h-28 rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden mb-6 group relative ${contactInfo?.isGroup ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                <img
                                    src={contactInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${contactName}&background=${contactInfo?.isGroup ? '10b981' : '3b82f6'}&color=fff`}
                                    alt={contactName}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <button
                                    onClick={handleSyncProfile}
                                    disabled={isSyncingProfile}
                                    className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isSyncingProfile ? 'opacity-100' : ''}`}
                                >
                                    <RefreshCw size={32} className={`text-white ${isSyncingProfile ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{contactInfo?.displayPhone || contactName}</h2>
                            {contactInfo?.displayPhone && (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nome Original: {contactInfo.name || 'Desconhecido'}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                {isEditingDisplayPhone ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            className="text-[10px] font-black uppercase bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={editedDisplayPhone}
                                            onChange={(e) => setEditedDisplayPhone(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateDisplayPhone()}
                                        />
                                        <button onClick={handleUpdateDisplayPhone} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => setIsEditingDisplayPhone(false)} className="p-1 text-red-400 hover:bg-red-50 rounded-md transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-[10px] font-black text-gray-400 mb-1">ID/NÚMERO</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{contactInfo?.displayPhone || (chatId.includes('@g.us') ? 'WhatsApp Group' : chatId.split('@')[0])}</p>
                                            <button
                                                onClick={() => {
                                                    setEditedDisplayPhone(contactInfo?.displayPhone || (chatId.includes('@g.us') ? '' : chatId.split('@')[0]));
                                                    setIsEditingDisplayPhone(true);
                                                }}
                                                className="p-1 text-gray-300 hover:text-blue-500 transition-all hover:scale-110"
                                                title="Editar nome de exibição manual"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4 w-full">
                                <div className={`flex-1 px-3 py-2 rounded-xl flex items-center gap-2 border shadow-sm relative overflow-hidden ${contactInfo?.status === 'concluido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : contactInfo?.status === 'bot' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 ${contactInfo?.status === 'concluido' ? 'bg-emerald-500' : contactInfo?.status === 'bot' ? 'bg-purple-500' : 'bg-amber-500'}`}>
                                        {contactInfo?.status === 'concluido' ? <CheckCircle2 size={12} /> : contactInfo?.status === 'bot' ? <Bot size={12} /> : <Clock size={12} />}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Status</span>
                                        <select
                                            className="text-[10px] font-black uppercase bg-transparent border-none outline-none cursor-pointer p-0 m-0 w-full"
                                            value={contactInfo?.status || 'atendimento'}
                                            onChange={(e) => handleUpdateStatus(e.target.value)}
                                            disabled={isUpdatingStatus}
                                        >
                                            <option value="atendimento">Atendimento</option>
                                            <option value="aguardando">Aguardando</option>
                                            <option value="bot">Bot / IA</option>
                                            <option value="concluido">Concluído</option>
                                        </select>
                                    </div>
                                    {isUpdatingStatus && (
                                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                            <Loader2 size={12} className="animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2 border border-blue-100 bg-blue-50 text-blue-600 shadow-sm overflow-hidden relative">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                                        <User2 size={12} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Responsável</span>
                                        <select
                                            className="text-[10px] font-black uppercase bg-transparent border-none outline-none cursor-pointer p-0 m-0 w-full"
                                            value={agentName === 'Sem Responsável' ? '' : agentName}
                                            onChange={(e) => handleUpdateAgent(e.target.value)}
                                            disabled={isUpdatingAgent}
                                        >
                                            <option value="">Sem Responsável</option>
                                            {attendants.map(a => (
                                                <option key={a.id} value={a.name || a.displayName || a.email}>
                                                    {a.name || a.displayName || a.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {isUpdatingAgent && (
                                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                            <Loader2 size={12} className="animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-4" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {contactInfo?.isGroup && contactInfo?.participants && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Participantes ({Object.keys(contactInfo.participants).length})</span>
                                    </div>
                                    <div className="space-y-3 px-1">
                                        {Object.entries(contactInfo.participants).map(([id, p]: any) => (
                                            <div key={id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors group">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors shrink-0">
                                                    <img
                                                        src={p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || id)}&background=random&color=fff`}
                                                        alt="P"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{p.name || id}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{id.includes('@') ? id.split('@')[0] : id}</p>
                                                </div>
                                                {p.isAdmin && (
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase shrink-0">Admin</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tasks Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tarefas ({contactTasks.length})</span>
                                    {isLoadingTasks && <Loader2 size={12} className="animate-spin text-blue-500" />}
                                </div>
                                <div className="space-y-3">
                                    {contactTasks.length === 0 ? (
                                        <p className="text-xs text-center text-gray-400 py-4 italic">Nenhuma tarefa vinculada.</p>
                                    ) : (
                                        contactTasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
                                                onClick={() => {
                                                    // Dispatch event for App.tsx to handle navigation
                                                    window.dispatchEvent(new CustomEvent('navigateToTask', {
                                                        detail: {
                                                            taskId: task.id,
                                                            projectId: task.projectId
                                                        }
                                                    }));
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h5 className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{task.title}</h5>
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {task.status === 'completed' ? 'Concluída' : 'Pendente'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium line-clamp-2 mb-2">{task.description || 'Sem descrição'}</p>
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                                                    <Calendar size={10} /> {task.endDate || 'S/D'}
                                                    <span className="ml-auto flex items-center gap-1 text-blue-400">
                                                        Ver <ChevronRight size={10} />
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Informações do Lead</span>
                                    {savingField && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                                </div>

                                <div className="space-y-6">
                                    {customFields.length === 0 ? (
                                        <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                                Nenhum campo personalizado cadastrado. Vá em Admin para configurar.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {['contact', 'company'].map(scope => {
                                                const filtered = customFields.filter(f =>
                                                    (f.scope || 'contact') === scope &&
                                                    (f.chatType === 'both' || !f.chatType || (contactInfo?.isGroup ? f.chatType === 'group' : f.chatType === 'private'))
                                                );
                                                if (filtered.length === 0) return null;

                                                return (
                                                    <div key={scope} className="space-y-4">
                                                        <div className="flex items-center gap-2 px-1">
                                                            {scope === 'contact' ? <User2 size={12} className="text-blue-500" /> : <Building size={12} className="text-emerald-500" />}
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                                                {scope === 'contact' ? 'Dados do Usuário' : 'Dados da Empresa'}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-6">
                                                            {filtered.map(field => (
                                                                <div key={field.id} className="space-y-2 group">
                                                                    <div className="flex items-center justify-between px-1">
                                                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-focus-within:text-blue-600 transition-colors">
                                                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                                                        </label>
                                                                    </div>

                                                                    {field.type === 'select' ? (
                                                                        <select
                                                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 transition-all appearance-none cursor-pointer"
                                                                            value={contactData[field.id] || ''}
                                                                            onChange={(e) => handleUpdateCustomField(field.id, e.target.value)}
                                                                        >
                                                                            <option value="">Selecione...</option>
                                                                            {field.options?.map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : field.type === 'boolean' ? (
                                                                        <div className="flex items-center gap-3 px-1">
                                                                            <button
                                                                                onClick={() => handleUpdateCustomField(field.id, contactData[field.id] === 'Sim' ? 'Não' : 'Sim')}
                                                                                className={`w-14 h-7 rounded-full relative transition-all duration-300 ${contactData[field.id] === 'Sim' ? 'bg-emerald-500 shadow-inner' : 'bg-gray-200'}`}
                                                                            >
                                                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${contactData[field.id] === 'Sim' ? 'left-8' : 'left-1'}`} />
                                                                            </button>
                                                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                                                {contactData[field.id] === 'Sim' ? 'Sim' : 'Não'}
                                                                            </span>
                                                                        </div>
                                                                    ) : field.type === 'text' ? (
                                                                        <textarea
                                                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 transition-all min-h-[100px] resize-none"
                                                                            placeholder={field.placeholder || `Digite o ${field.label.toLowerCase()}`}
                                                                            value={contactData[field.id] || ''}
                                                                            onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                                                                            onChange={(e) => setContactData({ ...contactData, [field.id]: e.target.value })}
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type={field.type === 'number' ? 'number' : 'text'}
                                                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 transition-all"
                                                                            placeholder={field.placeholder || `Digite o ${field.label.toLowerCase()}`}
                                                                            value={contactData[field.id] || ''}
                                                                            onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                                                                            onChange={(e) => setContactData({ ...contactData, [field.id]: e.target.value })}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reply Preview */}
            {
                replyingMessage && (
                    <div className="px-4 py-3 bg-[#f0f2f5] border-t border-gray-200 animate-in slide-in-from-bottom duration-300 shrink-0">
                        <div className="bg-white/60 border-l-4 border-emerald-500 rounded-lg p-3 flex items-center justify-between shadow-sm">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                                    Respondendo a {replyingMessage.fromMe ? 'você' : (replyingMessage.pushName || contactName)}
                                </p>
                                <p className="text-xs text-gray-500 truncate italic">
                                    {replyingMessage.text || (replyingMessage.type === 'image' ? '📷 Foto' : replyingMessage.type === 'audio' ? '🎵 Áudio' : 'Arquivo')}
                                </p>
                            </div>
                            <button onClick={() => setReplyingMessage(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Pending Media Preview */}
            {pendingMedia.length > 0 && (
                <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col p-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-black uppercase tracking-tight">Enviar Arquivo{pendingMedia.length > 1 ? 's' : ''}</h3>
                        <button
                            onClick={() => {
                                pendingMedia.forEach(m => URL.revokeObjectURL(m.preview));
                                setPendingMedia([]);
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center min-h-0">
                        <div className="flex gap-4 overflow-x-auto p-4 custom-scrollbar max-w-full">
                            {pendingMedia.map((media, idx) => (
                                <div key={idx} className="relative group shrink-0">
                                    <div className="w-64 h-64 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-white/5 flex items-center justify-center">
                                        {media.file.type.startsWith('image/') ? (
                                            <img src={media.preview} className="w-full h-full object-contain" alt="Preview" />
                                        ) : media.file.type.startsWith('video/') ? (
                                            <video src={media.preview} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <FileText size={64} className="text-white/40" />
                                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest text-center px-4 truncate w-full">
                                                    {media.file.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            URL.revokeObjectURL(media.preview);
                                            setPendingMedia(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
                        <input
                            type="text"
                            placeholder="Adicionar legenda..."
                            className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white outline-none focus:bg-white/15 transition-all text-sm"
                            value={mediaCaption}
                            onChange={(e) => setMediaCaption(e.target.value)}
                        />
                        <button
                            onClick={handleSendMedia}
                            disabled={isSending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            {isSending ? 'ENVIANDO...' : `ENVIAR ${pendingMedia.length} ARQUIVO${pendingMedia.length > 1 ? 'S' : ''}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Mention Suggestions Menu */}
            {mentionState && (
                <div className="absolute bottom-20 left-4 z-50 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                        {mentionState.type === '@' ? <Users size={14} className="text-blue-500" /> : <ClipboardList size={14} className="text-emerald-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {mentionState.type === '@' ? 'Mencionar Pessoa' : 'Mencionar Tarefa'}
                        </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {mentionState.type === '@' ? (
                            attendants
                                .filter(u => (u.name || u.displayName || u.email || '').toLowerCase().includes(mentionState.query.toLowerCase()))
                                .map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleSelectMention(u, '@')}
                                        className="w-full text-left flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg group transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-700 group-hover:text-blue-700 truncate">{u.name || u.displayName || u.email}</p>
                                        </div>
                                    </button>
                                ))
                        ) : (
                            allTasks
                                .filter(t => t.title.toLowerCase().includes(mentionState.query.toLowerCase()))
                                .map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectMention(t, '#')}
                                        className="w-full text-left flex items-center gap-3 p-2 hover:bg-emerald-50 rounded-lg group transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <ClipboardList size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-700 group-hover:text-emerald-700 truncate">{t.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{t.status === 'completed' ? 'Concluída' : 'Pendente'}</p>
                                        </div>
                                    </button>
                                ))
                        )}
                        {/* Empty States */}
                        {mentionState.type === '@' && attendants.filter(u => (u.name || u.displayName || u.email || '').toLowerCase().includes(mentionState.query.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-xs italic">Ninguém encontrado.</div>
                        )}
                        {mentionState.type === '#' && allTasks.filter(t => t.title.toLowerCase().includes(mentionState.query.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-xs italic">Nenhuma tarefa encontrada.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <footer className="bg-[#f0f2f5] p-3 flex items-center gap-2 z-20 border-t border-gray-200/50 relative">
                {isRecording ? (
                    <div className="flex-1 flex items-center justify-between bg-white rounded-full px-6 py-2 shadow-lg animate-in slide-in-from-bottom-4 duration-300 border border-gray-200 mx-4">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={cancelRecording}
                                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                title="Cancelar"
                            >
                                <Trash2 size={24} />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                <span className="text-xl font-medium text-gray-700 min-w-[50px] font-mono">{formatDuration(recordingTime)}</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 h-8">
                                {Array.from({ length: 30 }).map((_, i) => (
                                    <div key={i} className="w-[2px] bg-gray-300 rounded-full animate-pulse" style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.05}s` }} />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={stopRecording} className="w-12 h-12 bg-[#00a884] text-white rounded-full flex items-center justify-center hover:bg-[#008f6f] transition-all shadow-md active:scale-90" title="Enviar Áudio">
                                <Send size={24} fill="white" className="ml-1" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 text-gray-400 px-4">
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="hover:text-gray-600 transition-colors">
                                <Smile size={24} />
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="hover:text-gray-600 transition-colors">
                                <Paperclip size={24} />
                            </button>
                            <button onClick={startRecording} disabled={isSending} className="hover:text-emerald-500 transition-colors disabled:opacity-50" title="Gravar Áudio">
                                <Mic size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSendMessage} className="flex-1">
                            <input
                                ref={messageInputRef}
                                type="text"
                                placeholder="Digite uma mensagem"
                                className="w-full bg-white rounded-2xl px-5 py-3.5 text-sm outline-none shadow-sm focus:shadow-md border-none"
                                value={newMessage}
                                onChange={handleMessageChange}
                                disabled={isSending}
                                onPaste={(e) => {
                                    const items = e.clipboardData.items;
                                    const files: File[] = [];
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image') !== -1) {
                                            const file = items[i].getAsFile();
                                            if (file) files.push(file);
                                        }
                                    }
                                    if (files.length > 0) {
                                        processFiles(files);
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </form>
                        <button onClick={handleSendMessage} disabled={isSending} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${newMessage.trim() ? 'text-emerald-500 hover:scale-110' : 'text-gray-400'}`}>
                            <Send size={26} fill={newMessage.trim() ? "currentColor" : "none"} strokeWidth={2} />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    </>
                )}
            </footer>

            {/* AI Appointment Suggestion Overlay */}
            {
                activeAiSuggestion && (
                    <AIAppointmentOverlay
                        suggestion={activeAiSuggestion}
                        onClose={() => setActiveAiSuggestion(null)}
                        onAccept={handleAcceptAiSuggestion}
                        onAdjust={(s) => {
                            // Por enquanto, apenas fecha e abre a Agenda ou algo similar
                            // No futuro podemos abrir um modal de edição
                            alert("Funcionalidade de ajuste em desenvolvimento. Por enquanto, você pode aceitar e editar na Agenda.");
                        }}
                        onDecline={handleDeclineAiSuggestion}
                    />
                )
            }


            {/* Contact Selector Modal for Sharing */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Selecionar Contato</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Enviar cartão de contato</p>
                            </div>
                            <button onClick={() => setShowContactModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar contato..."
                                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all font-medium"
                                    onChange={(e) => {
                                        // Simple local filter or trigger search
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {/* For now, we list some recent chats as contacts to share */}
                            <div className="space-y-1">
                                {messages.filter((m, i, self) => !m.fromMe && self.findIndex(t => t.sender === m.sender) === i).slice(0, 10).map((c, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleContactSelect({ id: c.sender, name: c.pushName || c.sender })}
                                        className="flex items-center gap-4 p-4 rounded-[1.5rem] cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {(c.pushName || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{c.pushName || c.sender}</h4>
                                            <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase truncate">{c.sender}</p>
                                        </div>
                                        <PlusCircle size={18} className="text-gray-300 group-hover:text-emerald-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluate Chat Modal */}
            {
                showEvaluateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-start mb-6 shrink-0">
                                <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
                                    <Star size={32} />
                                </div>
                                <button onClick={() => setShowEvaluateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Avaliar Conversa com IA</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                A Inteligência Artificial analisará as mensagens dos últimos dias para criar um resumo e qualificar o lead.
                            </p>

                            {!evaluationResult ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            O que você deseja buscar?
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setEvaluationMode('summary')}
                                                className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex flex-col items-center gap-1 ${evaluationMode === 'summary' ? 'bg-blue-500 text-white border-blue-500 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                            >
                                                <ClipboardList size={16} /> Resumo Geral
                                            </button>
                                            <button
                                                onClick={() => setEvaluationMode('events')}
                                                className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex flex-col items-center gap-1 ${evaluationMode === 'events' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                            >
                                                <Calendar size={16} /> Tarefas/Agenda
                                            </button>
                                            <button
                                                onClick={() => setEvaluationMode('custom')}
                                                className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex flex-col items-center gap-1 ${evaluationMode === 'custom' ? 'bg-purple-500 text-white border-purple-500 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                            >
                                                <MessageSquare size={16} /> Consulta Livre
                                            </button>
                                        </div>
                                    </div>

                                    {evaluationMode === 'custom' && (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Especifique o que a IA deve procurar</label>
                                            <textarea
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all min-h-[80px] resize-none"
                                                placeholder="Ex: Procure se o cliente mencionou algum endereço ou se ele confirmou o pagamento."
                                                value={customPrompt}
                                                onChange={(e) => setCustomPrompt(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleEvaluateChat}
                                        disabled={isEvaluating || (evaluationMode === 'custom' && !customPrompt.trim())}
                                        className={`w-full ${evaluationMode === 'events' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : evaluationMode === 'custom' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'} disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95`}
                                    >
                                        {isEvaluating ? (
                                            <><Loader2 size={18} className="animate-spin" /> REALIZANDO ANÁLISE PROFUNDA...</>
                                        ) : (
                                            <><Brain size={18} /> INICIAR ANÁLISE INTELIGENTE</>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> RESULTADO DA ANÁLISE
                                        </label>
                                        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {evaluationResult.summary}
                                            </p>
                                        </div>
                                    </div>

                                    {evaluationResult.qualification && (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> QUALIFICAÇÃO E INSIGHTS
                                            </label>
                                            <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {evaluationResult.qualification}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {evaluationResult.events && evaluationResult.events.length > 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                <Sparkles size={14} /> EVENTOS E TAREFAS IDENTIFICADOS
                                            </label>
                                            <div className="grid gap-3">
                                                {evaluationResult.events.map((event, idx) => (
                                                    <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group hover:border-blue-200 transition-all">
                                                        {suggestedEventToEdit && suggestedEventIndex === idx ? (
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] font-black text-blue-600 uppercase">Editando Sugestão</span>
                                                                    <button onClick={() => setSuggestedEventToEdit(null)}><X size={14} className="text-gray-400" /></button>
                                                                </div>
                                                                <input
                                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-400"
                                                                    value={suggestedEventToEdit.title}
                                                                    onChange={e => setSuggestedEventToEdit({ ...suggestedEventToEdit, title: e.target.value })}
                                                                    placeholder="Título"
                                                                />
                                                                <textarea
                                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-blue-400 min-h-[60px]"
                                                                    value={suggestedEventToEdit.description}
                                                                    onChange={e => setSuggestedEventToEdit({ ...suggestedEventToEdit, description: e.target.value })}
                                                                    placeholder="Descrição"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="date"
                                                                        className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                                                        value={suggestedEventToEdit.date || ''}
                                                                        onChange={e => setSuggestedEventToEdit({ ...suggestedEventToEdit, date: e.target.value })}
                                                                    />
                                                                    <input
                                                                        type="time"
                                                                        className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                                                        value={suggestedEventToEdit.time || ''}
                                                                        onChange={e => setSuggestedEventToEdit({ ...suggestedEventToEdit, time: e.target.value })}
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={handleSaveEditedEvent}
                                                                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-100"
                                                                >
                                                                    SALVAR ALTERAÇÕES
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${event.type === 'meeting' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                                                                        {event.type === 'meeting' ? <Calendar size={18} /> : <ClipboardList size={18} />}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-sm font-bold text-gray-800">{event.title}</h5>
                                                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                                                                            {event.type === 'meeting' ? 'Reunião + Tarefa' : 'Tarefa Pendente'}
                                                                            {event.date && ` • ${event.date}`}
                                                                            {event.time && ` • ${event.time}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => { setSuggestedEventToEdit(event); setSuggestedEventIndex(idx); }}
                                                                        className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors"
                                                                    >
                                                                        <RefreshCw size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAcceptSuggestedEvent(event, idx)}
                                                                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                                    >
                                                                        <PlusCircle size={18} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4 shrink-0">
                                        <button
                                            onClick={() => setEvaluationResult(null)}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-2xl font-bold text-sm transition-all"
                                        >
                                            REAVALIAR
                                        </button>
                                        <button
                                            onClick={() => setShowEvaluateModal(false)}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-100 active:scale-95"
                                        >
                                            CONCLUÍDO
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
                                    <AlertTriangle size={32} />
                                </div>
                                <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Limpar Histórico?</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                Isso apagará permanentemente todas as mensagens desta conversa. Para confirmar, digite <b>delete</b> abaixo:
                            </p>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Digite delete"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all text-center font-bold"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-2xl font-bold text-sm transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={handleDeleteHistory}
                                        disabled={deleteConfirmText.toLowerCase() !== 'delete' || isDeleting}
                                        className="flex-[2] bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-100 active:scale-95"
                                    >
                                        {isDeleting ? 'LIMPANDO...' : 'CONFIRMAR EXCLUSÃO'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Prévia de Mídia */}
            {
                pendingMedia.length > 0 && (
                    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
                        <header className="p-6 flex justify-between items-center bg-white/5 border-b border-white/10">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setPendingMedia([])} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                                    <X size={24} />
                                </button>
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-tight">Enviar Mídia</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{pendingMedia.length} arquivo(s) selecionado(s)</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSendMedia}
                                disabled={isSending}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                            >
                                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {isSending ? 'Enviando...' : 'Enviar Agora'}
                            </button>
                        </header>

                        <main className="flex-1 overflow-y-auto p-12 flex flex-wrap justify-center gap-8 custom-scrollbar">
                            {pendingMedia.map((item, idx) => (
                                <div key={idx} className="relative group animate-in zoom-in-95 duration-300">
                                    <div className="w-[300px] h-[300px] rounded-3xl overflow-hidden border-2 border-white/10 bg-white/5 shadow-2xl relative">
                                        {item.file.type.startsWith('image/') ? (
                                            <img src={item.preview} className="w-full h-full object-cover" />
                                        ) : item.file.type.startsWith('video/') ? (
                                            <video src={item.preview} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/40">
                                                <Paperclip size={48} />
                                                <span className="text-[10px] font-black uppercase tracking-widest px-4 text-center">{item.file.name}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setPendingMedia(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </main>

                        <footer className="p-8 bg-black/40 border-t border-white/10 backdrop-blur-3xl">
                            <div className="max-w-4xl mx-auto flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Adicione uma legenda..."
                                    className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    value={mediaCaption}
                                    onChange={(e) => setMediaCaption(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMedia()}
                                />
                                <button
                                    onClick={() => document.getElementById('media-add-more')?.click()}
                                    className="p-4 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                                >
                                    <PlusCircle size={24} />
                                    <input id="media-add-more" type="file" multiple className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []))} />
                                </button>
                            </div>
                        </footer>
                    </div>
                )
            }

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                @keyframes progress {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(0.7); }
                    100% { transform: scaleX(1); }
                }
                .animate-progress {
                    animation: progress 2s infinite ease-in-out;
                }
            `}</style>

            {/* Modal de Criação de Tarefa */}
            {
                showTaskModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                    <ClipboardList size={32} />
                                </div>
                                <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Configure sua Tarefa</h3>
                            <p className="text-sm text-gray-500 mb-6">Escolha o projeto e a etapa para organizar essa demanda.</p>

                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Título da Tarefa</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={taskModalData.title}
                                        onChange={e => setTaskModalData({ ...taskModalData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Projeto</label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                            value={taskModalData.projectId}
                                            onChange={e => {
                                                const proj = taskProjects.find(p => p.id === e.target.value);
                                                setSelectedProjectForTask(proj);
                                                setTaskModalData({
                                                    ...taskModalData,
                                                    projectId: e.target.value,
                                                    column: proj?.columns?.[0]?.name || proj?.columns?.[0] || ''
                                                });
                                            }}
                                        >
                                            {taskProjects.map(p => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Etapa / Status</label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                            value={taskModalData.column}
                                            onChange={e => setTaskModalData({ ...taskModalData, column: e.target.value })}
                                        >
                                            {!selectedProjectForTask?.columns?.length && <option value="">Estágio Inicial</option>}
                                            {selectedProjectForTask?.columns?.map((col: any) => {
                                                const name = typeof col === 'string' ? col : col.name;
                                                return <option key={name} value={name}>{name}</option>
                                            })}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Descrição</label>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px] resize-none"
                                        value={taskModalData.description}
                                        onChange={e => setTaskModalData({ ...taskModalData, description: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={handleConfirmCreateTask}
                                    disabled={isCreatingSmartTask}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50"
                                >
                                    {isCreatingSmartTask ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />}
                                    SALVAR TAREFA NO PROJETO
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Forward Modal */}
            {
                showForwardModal && forwardingMessage && (
                    <ForwardModal
                        message={forwardingMessage}
                        onClose={() => {
                            setShowForwardModal(false);
                            setForwardingMessage(null);
                        }}
                        onForward={async (selectedChats) => {
                            setIsSending(true);
                            try {
                                for (const chat of selectedChats) {
                                    await fetch('/api/send-message', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6` },
                                        body: JSON.stringify({
                                            chatId: chat.id,
                                            text: forwardingMessage.text,
                                            type: forwardingMessage.type || 'chat',
                                            isMedia: !!forwardingMessage.mediaUrl,
                                            mediaUrl: forwardingMessage.mediaUrl
                                        })
                                    });
                                }
                                alert("Mensagem encaminhada com sucesso!");
                            } catch (e) {
                                alert("Erro ao encaminhar mensagem.");
                            } finally {
                                setIsSending(false);
                                setShowForwardModal(false);
                                setForwardingMessage(null);
                            }
                        }}
                    />
                )
            }
            {/* Lightbox Modal */}
            {lightboxMedia && (
                <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setLightboxMedia(null)}>
                    <button className="absolute top-4 right-4 p-4 text-white hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                    <div className="relative max-w-5xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl">
                        <img src={lightboxMedia} alt="Full view" className="max-w-full max-h-[90vh] object-contain" />
                    </div>
                </div>
            )}
        </div >
    );
};

function ForwardModal({ message, onClose, onForward }: { message: any, onClose: () => void, onForward: (chats: any[]) => void }) {
    const { notify } = useNotification();
    const [chats, setChats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"), limit(20));
        const unsub = onSnapshot(q, (snap) => {
            setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredChats = chats.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.includes(searchTerm)
    );

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Encaminhar Mensagem</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Selecione os contatos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar contato ou grupo..."
                            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="text-emerald-500 animate-spin" size={32} />
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Carregando contatos...</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredChats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        const next = new Set(selectedChats);
                                        if (next.has(chat.id)) next.delete(chat.id);
                                        else if (next.size < 5) next.add(chat.id);
                                        else notify("Máximo de 5 contatos por vez.", "warning");
                                        setSelectedChats(next);
                                    }}
                                    className={`flex items-center gap-4 p-4 rounded-[1.5rem] cursor-pointer transition-all ${selectedChats.has(chat.id) ? 'bg-emerald-50 border-2 border-emerald-500/20' : 'hover:bg-gray-50 border-2 border-transparent'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${chat.isGroup ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                        {chat.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{chat.name || chat.id}</h4>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter truncate">{chat.isGroup ? 'Grupo' : 'Privado'}</p>
                                    </div>
                                    {selectedChats.has(chat.id) && (
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in-50">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-gray-100 rounded-b-[2.5rem]">
                    <button
                        disabled={selectedChats.size === 0}
                        onClick={() => onForward(chats.filter(c => selectedChats.has(c.id)))}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Forward size={18} />
                        Enviar para {selectedChats.size} contato{selectedChats.size !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

console.log("ChatWindow module loaded");
export default ChatWindow;
