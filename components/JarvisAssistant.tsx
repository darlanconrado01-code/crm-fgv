
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Send, Mic, Brain, Sparkles, Loader2,
    MessageSquare, LayoutDashboard, Users,
    ClipboardList, Calendar, User2, Bot,
    MessageCircle, BarChart2, Zap
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

interface JarvisAssistantProps {
    user: any;
    onClose: () => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    id: string;
}

const JarvisAssistant: React.FC<JarvisAssistantProps> = ({ user, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        // Welcome message
        const welcomeMsg: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: `Olá ${user?.displayName || user?.name || 'Agente'}. Eu sou o Jarvis, seu assistente inteligente. Como posso ajudar com a plataforma hoje?`,
            timestamp: new Date()
        };
        setMessages([welcomeMsg]);
    }, [user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (content: string) => {
        if (!content.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/jarvis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    user: {
                        id: user?.uid,
                        name: user?.displayName || user?.name,
                        role: user?.role
                    }
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                const assistantMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                throw new Error(data.message || 'Erro ao processar');
            }
        } catch (error) {
            console.error('Jarvis Error:', error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, tive um erro ao processar sua solicitação. Pode tentar novamente?',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await processVoiceInput(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processVoiceInput = async (blob: Blob) => {
        setIsTyping(true);
        try {
            // 1. Transcribe
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const res = await fetch('/api/ai?action=transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioUrl: `data:audio/webm;base64,${base64Data}` })
                });
                const data = await res.json();
                if (data.status === 'success' && data.text) {
                    handleSend(data.text);
                }
            };
        } catch (err) {
            console.error('Voice processing error:', err);
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-[#050b18] border-l border-white/10 z-[100] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-blue-600/20 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-purple-600/20 blur-[100px] pointer-events-none rounded-full" />

            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 relative group">
                        <Brain className="text-white group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#050b18] animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-white font-black uppercase tracking-widest text-lg leading-none">Jarvis</h2>
                        <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <Sparkles size={10} /> Sistema Online
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar z-10 relative">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10'
                                : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-none backdrop-blur-md'
                            }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[9px] font-bold uppercase mt-2 opacity-40 ${msg.role === 'user' ? 'text-white' : 'text-blue-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className="p-6 border-t border-white/5 bg-white/[0.01] backdrop-blur-2xl z-20">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    className="bg-white/5 border border-white/10 rounded-3xl flex flex-col p-2 gap-2 focus-within:border-blue-500/50 transition-all shadow-xl"
                >
                    <div className="flex items-center gap-2 p-1">
                        <input
                            type="text"
                            placeholder="Pergunte qualquer coisa ao Jarvis..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-2 placeholder:text-gray-600"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button
                            type="button"
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-red-500 text-white' : 'text-blue-400 hover:bg-blue-500/10'}`}
                        >
                            <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
                        </button>
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all disabled:opacity-30 disabled:grayscale"
                        >
                            <Send size={20} />
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 p-1 overflow-x-auto custom-scrollbar-hidden">
                        <QuickAction icon={BarChart2} label="Meus Atendimentos" onClick={() => handleSend("Quantos atendimentos eu tenho hoje?")} />
                        <QuickAction icon={ClipboardList} label="Minhas Tarefas" onClick={() => handleSend("Quais são minhas tarefas pendentes?")} />
                        <QuickAction icon={Calendar} label="Próxima Reunião" onClick={() => handleSend("Quando é minha próxima reunião?")} />
                    </div>
                </form>
            </footer>
        </div>
    );
};

const QuickAction: React.FC<{ icon: any, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="whitespace-nowrap flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[10px] font-black uppercase text-blue-400 tracking-wider transition-all"
    >
        <Icon size={12} />
        {label}
    </button>
);

export default JarvisAssistant;
