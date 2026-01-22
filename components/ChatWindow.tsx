import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Smile,
    Paperclip,
    MoreVertical,
    Search,
    Phone,
    Video,
    CheckCheck,
    User as UserIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';

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
            // 1. Buscar configurações da Evolution
            const configDoc = await getDoc(doc(db, "settings", "evolution"));
            if (!configDoc.exists()) {
                alert("Configurações da Evolution não encontradas. Vá em Configurações -> Conexões.");
                setIsSending(false);
                return;
            }

            const config = configDoc.data();
            const evolutionUrl = `${config.url}/message/sendText/${config.instance}`;

            // 2. Enviar para o WhatsApp (Evolution API)
            const response = await fetch(evolutionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.apiKey
                },
                body: JSON.stringify({
                    number: chatId, // O chatId é o número sem @s.whatsapp.net
                    text: text,
                    delay: 1200,
                    linkPreview: true
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem via Evolution API');
            }

            // 3. Salvar no Firebase (Histórico local)
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type: 'chat'
            });

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Falha ao enviar mensagem. Verifique a conexão com a Evolution.");
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            {/* Background Pattern */}
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                    backgroundSize: '400px'
                }}
            />

            {/* Header */}
            <header className="h-16 bg-[#f0f2f5] border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white">
                        <img src={`https://ui-avatars.com/api/?name=${contactName}&background=random`} alt={contactName} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm leading-tight">{contactName}</h3>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-gray-400">
                    <Video size={20} className="hover:text-gray-600 cursor-pointer" />
                    <Phone size={18} className="hover:text-gray-600 cursor-pointer" />
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <Search size={20} className="hover:text-gray-600 cursor-pointer" />
                    <MoreVertical size={20} className="hover:text-gray-600 cursor-pointer" />
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 z-10 custom-scrollbar pr-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    >
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.fromMe
                                    ? 'bg-[#e7fed8] text-gray-800 rounded-tr-none border border-[#d1f4ba]'
                                    : 'bg-white text-gray-800 rounded-tl-none border border-white'
                                }`}
                        >
                            <p className="text-[14px] whitespace-pre-wrap leading-relaxed pb-3 pr-10">{msg.text}</p>
                            <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                                <span className="text-[9px] text-gray-400 font-bold">
                                    {formatTime(msg.timestamp)}
                                </span>
                                {msg.fromMe && (
                                    <CheckCheck size={14} className="text-blue-500" />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className="bg-[#f0f2f5] p-3 flex items-center gap-2 z-20 border-t border-gray-200/50">
                <div className="flex items-center gap-3 text-gray-400 px-4">
                    <Smile size={24} className="hover:text-gray-600 cursor-pointer transition-colors" />
                    <Paperclip size={24} className="hover:text-gray-600 cursor-pointer transition-colors" />
                </div>
                <form onSubmit={handleSendMessage} className="flex-1">
                    <input
                        type="text"
                        placeholder="Digite uma mensagem"
                        className="w-full bg-white rounded-2xl px-5 py-3.5 text-sm outline-none shadow-sm focus:shadow-md transition-all border-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending}
                    />
                </form>
                <button
                    onClick={handleSendMessage}
                    disabled={isSending}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${newMessage.trim() ? 'text-emerald-500 hover:scale-110' : 'text-gray-400'
                        }`}
                >
                    <Send size={26} fill={newMessage.trim() ? "currentColor" : "none"} strokeWidth={2} />
                </button>
            </footer>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default ChatWindow;
