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
    Check,
    User as UserIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
            setTimeout(scrollToBottom, 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage;
        setNewMessage('');

        try {
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type: 'chat'
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            {/* WhatsApp Desktop Background Pattern */}
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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${contactName}&background=random`} alt={contactName} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight">{contactName}</h3>
                        <p className="text-[11px] text-gray-500">visto por último hoje às 12:00</p>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-gray-500">
                    <Video size={20} className="cursor-pointer hover:text-gray-800" />
                    <Phone size={18} className="cursor-pointer hover:text-gray-800" />
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <Search size={20} className="cursor-pointer hover:text-gray-800" />
                    <MoreVertical size={20} className="cursor-pointer hover:text-gray-800" />
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 z-10 custom-scrollbar scroll-smooth">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    >
                        <div
                            className={`max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative ${msg.fromMe
                                    ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed pb-3 pr-8">{msg.text}</p>
                            <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                <span className="text-[9px] text-gray-400 font-medium">
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
            <footer className="bg-[#f0f2f5] p-3 flex items-center gap-3 z-20">
                <div className="flex items-center gap-3 text-gray-500 px-2">
                    <Smile size={24} className="cursor-pointer hover:text-gray-800" />
                    <Paperclip size={24} className="cursor-pointer hover:text-gray-800" />
                </div>
                <form onSubmit={handleSendMessage} className="flex-1">
                    <input
                        type="text"
                        placeholder="Digite uma mensagem"
                        className="w-full bg-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm transition-all"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                </form>
                <button
                    onClick={handleSendMessage}
                    className="w-11 h-11 bg-transparent flex items-center justify-center text-gray-500 hover:text-emerald-600 transition-colors"
                >
                    <Send size={24} />
                </button>
            </footer>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default ChatWindow;
