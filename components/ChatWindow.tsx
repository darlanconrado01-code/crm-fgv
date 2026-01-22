import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Search, Phone, Video, CheckCheck, Trash2, X, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, writeBatch, getDocs, doc } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    sender: string;
    fromMe: boolean;
    timestamp: any;
    type: string;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!chatId) return;

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
                    text: text
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao enviar mensagem');
            }

            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type: 'chat'
            });

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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white">
                        <img src={`https://ui-avatars.com/api/?name=${contactName}&background=random`} alt={contactName} />
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
