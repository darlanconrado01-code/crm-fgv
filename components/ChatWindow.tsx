import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Search, Phone, Video, CheckCheck, Trash2, X, AlertTriangle, User2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, writeBatch, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { CustomField } from '../types';

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
}

interface ChatWindowProps {
    chatId: string;
    contactName: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, contactName }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [contactData, setContactData] = useState<any>({});
    const [savingField, setSavingField] = useState(false);
    const [contactInfo, setContactInfo] = useState<any>(null);
    const [agentName, setAgentName] = useState<string>('Buscando...');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!chatId) return;

        // Limpar unreadCount ao abrir a conversa
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

        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as any
            }));
            setMessages(msgs);
            setTimeout(scrollToBottom, 50);
        });

        return () => unsubscribe();
    }, [chatId]);

    // Carregar campos personalizados e dados do contato
    useEffect(() => {
        if (!chatId) return;

        // Escutar campos personalizados
        const qFields = query(collection(db, "custom_fields"), orderBy("updatedAt", "asc"));
        const unsubFields = onSnapshot(qFields, (snapshot) => {
            const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomField));
            setCustomFields(fields.filter(f => f.active));
        });

        // Escutar dados do contato
        const contactRef = doc(db, "contacts", chatId);
        const unsubContact = onSnapshot(contactRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setContactInfo(data);
                setContactData(data.customData || {});
            }
        });

        // Escutar dados do chat (para pegar o agente e status)
        const chatDocRef = doc(db, "chats", chatId);
        const unsubChat = onSnapshot(chatDocRef, (snapshot) => {
            if (snapshot.exists()) {
                setAgentName(snapshot.data().agent || 'Sem Responsável');
            }
        });

        return () => {
            unsubFields();
            unsubContact();
            unsubChat();
        };
    }, [chatId]);

    const handleUpdateCustomField = async (fieldId: string, value: any) => {
        setSavingField(true);
        try {
            const contactRef = doc(db, "contacts", chatId);
            const newData = { ...contactData, [fieldId]: value };
            await setDoc(contactRef, { customData: newData }, { merge: true });
            setContactData(newData);
        } catch (e) {
            console.error("Erro ao atualizar campo:", e);
        } finally {
            setSavingField(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        const text = newMessage;
        setNewMessage('');
        setIsSending(true);

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: chatId,
                    text: text,
                    contactName: contactName
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao enviar mensagem');
            }

            const batch = writeBatch(db);
            const msgRef = doc(collection(db, "chats", chatId, "messages"));
            const chatRef = doc(db, "chats", chatId);

            batch.set(msgRef, {
                text,
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type: 'chat'
            });

            batch.update(chatRef, {
                lastMessage: text,
                updatedAt: serverTimestamp(),
                unreadCount: 0
            });

            await batch.commit();

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Falha ao enviar: " + error.message);
            setNewMessage(text);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteHistory = async () => {
        if (deleteConfirmText.toLowerCase() !== 'delete') return;

        setIsDeleting(true);
        try {
            const messagesRef = collection(db, "chats", chatId, "messages");
            const snapshot = await getDocs(messagesRef);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            setShowDeleteModal(false);
            setDeleteConfirmText('');
            alert('Histórico limpo com sucesso!');
        } catch (error) {
            console.error("Error deleting history:", error);
            alert("Erro ao limpar histórico.");
        } finally {
            setIsDeleting(false);
        }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white">
                        <img
                            src={contactInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${contactName}&background=random`}
                            alt={contactName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 text-sm leading-tight">{contactName}</h3>
                            <span className="text-gray-400 text-xs font-medium">({chatId})</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-none mt-1">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-gray-400">
                    <Video size={20} className="hover:text-gray-600 cursor-pointer" />
                    <Phone size={18} className="hover:text-gray-600 cursor-pointer" />
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <Search size={20} className="hover:text-gray-600 cursor-pointer" />
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
                                        setShowDeleteModal(true);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 font-semibold transition-colors"
                                >
                                    <Trash2 size={16} /> Limpar Histórico
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 z-10 custom-scrollbar pr-4">
                {messages.length > 0 ? (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.fromMe ? 'bg-[#e7fed8] text-gray-800 rounded-tr-none border border-[#d1f4ba]' : 'bg-white text-gray-800 rounded-tl-none border border-white'}`}>

                                {/* Mídia Rendering */}
                                {msg.type === 'image' && msg.mediaUrl && (
                                    <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 min-h-[100px] flex items-center justify-center">
                                        <img
                                            src={msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('http')
                                                ? msg.mediaUrl
                                                : `data:${msg.mimeType || 'image/jpeg'};base64,${msg.mediaUrl}`}
                                            alt="Photo"
                                            className="max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                                            onClick={() => window.open(msg.mediaUrl, '_blank')}
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
                                    <div className="mb-2 mt-1">
                                        <audio controls className="w-full h-10">
                                            <source src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `data:${msg.mimeType || 'audio/ogg'};base64,${msg.mediaUrl}`} type={msg.mimeType || 'audio/ogg'} />
                                            Seu navegador não suporta áudio.
                                        </audio>
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

                                <p className="text-[14px] whitespace-pre-wrap leading-relaxed pb-3 pr-10">{msg.text}</p>
                                <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                                    <span className="text-[9px] text-gray-400 font-bold">{formatTime(msg.timestamp)}</span>
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

            {/* Contact Info Sidebar */}
            {showSidebar && (
                <div className="absolute top-16 bottom-0 right-0 w-[400px] bg-white border-l border-gray-100 z-[40] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-8 flex flex-col items-center border-b border-gray-50 bg-gradient-to-b from-blue-50/30 to-white">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-500 shadow-2xl border-4 border-white overflow-hidden mb-6 group relative">
                            <img
                                src={contactInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${contactName}&background=random`}
                                alt={contactName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{contactName}</h2>
                        <p className="text-sm font-bold text-gray-400 mt-1">{chatId}</p>

                        <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl flex items-center gap-2 border border-blue-100 shadow-sm">
                            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                                <User2 size={16} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Responsável</span>
                                <span className="text-xs font-black uppercase truncate">{agentName}</span>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-100 transition-all">
                                <Phone size={20} />
                            </button>
                            <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-100 transition-all">
                                <Video size={20} />
                            </button>
                            <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all">
                                <X size={20} onClick={() => setShowSidebar(false)} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                                    customFields.map(field => (
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
                                                <div className="flex items-center gap-3">
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
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <footer className="bg-[#f0f2f5] p-3 flex items-center gap-2 z-20 border-t border-gray-200/50">
                <div className="flex items-center gap-3 text-gray-400 px-4">
                    <Smile size={24} className="hover:text-gray-600 cursor-pointer" />
                    <Paperclip size={24} className="hover:text-gray-600 cursor-pointer" />
                </div>
                <form onSubmit={handleSendMessage} className="flex-1">
                    <input
                        type="text"
                        placeholder="Digite uma mensagem"
                        className="w-full bg-white rounded-2xl px-5 py-3.5 text-sm outline-none shadow-sm focus:shadow-md border-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending}
                    />
                </form>
                <button onClick={handleSendMessage} disabled={isSending} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${newMessage.trim() ? 'text-emerald-500 hover:scale-110' : 'text-gray-400'}`}>
                    <Send size={26} fill={newMessage.trim() ? "currentColor" : "none"} strokeWidth={2} />
                </button>
            </footer>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
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
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ChatWindow;
