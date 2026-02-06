
import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Loader2, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Send, User } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface VoiceCommandOverlayProps {
    onClose: () => void;
    mode?: 'default' | 'agent';
}

const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({ onClose, mode = 'default' }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [improvedTranscription, setImprovedTranscription] = useState<string | null>(null);
    const [isImproving, setIsImproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [visualizerData, setVisualizerData] = useState<number[]>(new Array(60).fill(10));

    // Action State
    const [isAnalyzingIntent, setIsAnalyzingIntent] = useState(false);
    const [actionResult, setActionResult] = useState<any>(null);
    const [isExecutingAction, setIsExecutingAction] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                processAudio(new Blob(chunks, { type: 'audio/webm' }));
            };

            // Audio Visualizer setup
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            analyserRef.current = analyser;

            const updateVisualizer = () => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                // Map frequency data to visualizer lines
                const simplifiedData = Array.from(dataArray.slice(0, 60)).map(v => Math.max(5, v / 3));
                setVisualizerData(simplifiedData);

                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };

            updateVisualizer();
            mediaRecorder.start();
            setIsRecording(true);
            setTranscription(null);
            setActionResult(null); // Clear previous action result
            setError(null);

        } catch (err) {
            setError("Erro ao acessar microfone. Verifique as permissões.");
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            // 1. Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];

                // 2. Send to n8n Webhook
                const response = await fetch('https://n8n.canvazap.com.br/webhook/ASSISTENTE-VOZ', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mimeType: 'audio/webm',
                        data: base64Data
                    })
                });

                if (!response.ok) throw new Error("Erro ao conectar com assistente de voz.");

                const result = await response.json();
                // Expecting { text: "transcription", ... } or { output: ... }
                // Adjust based on n8n return. Assuming 'text' or 'transcription' property.
                const resultText = result.text || result.transcription || result.output || JSON.stringify(result);

                if (resultText) {
                    setTranscription(resultText);
                    if (mode === 'agent') {
                        analyzeIntent(resultText);
                    }
                } else {
                    setTranscription("Áudio recebido, mas sem resposta de texto.");
                }
            };
        } catch (err: any) {
            setError("Erro ao processar comando de voz: " + err.message);
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const analyzeIntent = async (text: string) => {
        setIsAnalyzingIntent(true);
        try {
            const response = await fetch('/api/ai?action=parse-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await response.json();

            if (data.status === 'success' && data.intent === 'send_message') {
                setActionResult(data); // Save intent to show user
                executeSendMessage(data.data.contactName, data.data.messageContent);
            } else {
                // If unknown or other intent, just stay on transcription view
                console.log("Intent not actionable or unknown:", data);
            }
        } catch (e) {
            console.error("Error analyzing intent:", e);
        } finally {
            setIsAnalyzingIntent(false);
        }
    };

    const executeSendMessage = async (contactName: string, message: string) => {
        setIsExecutingAction(true);
        try {
            if (!contactName) throw new Error("Nome do contato não identificado.");
            if (!message) throw new Error("Mensagem vazia.");

            // 1. Search Contact
            // Fetch more contacts to ensure we find the person (limit 1000)
            const contactsSnap = await getDocs(query(collection(db, "contacts"), orderBy("name"), limit(1000)));
            const normalizedTarget = contactName.toLowerCase().trim();

            // 1. Exact match attempt
            let foundContact = contactsSnap.docs.find(doc => {
                const d = doc.data();
                const name = (d.name || d.pushName || '').toLowerCase();
                return name === normalizedTarget;
            });

            // 2. Contains match attempt (if exact fail)
            if (!foundContact) {
                foundContact = contactsSnap.docs.find(doc => {
                    const d = doc.data();
                    const name = (d.name || d.pushName || '').toLowerCase();
                    return name.includes(normalizedTarget) || normalizedTarget.includes(name);
                });
            }

            if (!foundContact) {
                setError(`Contato "${contactName}" não encontrado na agenda.`);
                setIsExecutingAction(false);
                return;
            }

            const contactData = foundContact.data();
            const chatId = foundContact.id;

            // 2. Send Message
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer cv_vpdmp2uusecjze6w0vs6` // Using same token as ChatWindow
                },
                body: JSON.stringify({
                    chatId: chatId,
                    text: message,
                    contactName: contactData.name || contactName,
                    type: 'chat'
                })
            });

            if (!response.ok) throw new Error("Falha ao enviar mensagem via API.");

            setActionResult(prev => ({ ...prev, status: 'completed', feedback: `Mensagem enviada para ${contactData.name}!` }));

        } catch (err: any) {
            console.error("Action execution failed:", err);
            setError("Erro ao executar ação: " + err.message);
        } finally {
            setIsExecutingAction(false);
        }
    };

    const handleImproveText = async () => {
        const textToImprove = transcription;
        if (!textToImprove || isImproving) return;

        setIsImproving(true);
        try {
            const response = await fetch('/api/ai?action=improve-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToImprove })
            });
            const data = await response.json();
            if (data.status === 'success' && data.improvedText) {
                setImprovedTranscription(data.improvedText);
            } else {
                throw new Error("Não foi possível melhorar o texto.");
            }
        } catch (err: any) {
            setError("Erro ao melhorar texto: " + err.message);
        } finally {
            setIsImproving(false);
        }
    };

    useEffect(() => {
        const textToCopy = improvedTranscription || transcription;
        if (textToCopy) {
            const copyToClipboard = async () => {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                } catch (err) {
                    // Fallback legacy method if modern API is blocked
                    const textArea = document.createElement("textarea");
                    textArea.value = transcription;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    textArea.style.top = "0";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                        document.execCommand('copy');
                    } catch (copyErr) {
                        console.error('Fallback copy failed', copyErr);
                    }
                    document.body.removeChild(textArea);
                }
            };
            copyToClipboard();
        }
    }, [transcription, improvedTranscription]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            if (e.key.toLowerCase() === 'g') {
                if (isRecording) {
                    stopRecording();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRecording, stopRecording]);

    useEffect(() => {
        startRecording();
        return () => stopRecording();
    }, []);

    if (isRecording) {
        return (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 animate-in slide-in-from-bottom-10">
                <div className="relative group">
                    {/* Glowing Aura behind the hologram */}
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />

                    <div className="relative flex flex-col items-center gap-4">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            {/* Holographic Visualizer */}
                            {visualizerData.map((v, i) => {
                                const angle = (i * (360 / visualizerData.length)) * (Math.PI / 180);
                                const radius = 45;
                                const x1 = Math.cos(angle) * radius;
                                const y1 = Math.sin(angle) * radius;
                                const x2 = Math.cos(angle) * (radius + (v * 0.7));
                                const y2 = Math.sin(angle) * (radius + (v * 0.7));

                                return (
                                    <div
                                        key={i}
                                        className="absolute w-[1.5px] rounded-full bg-gradient-to-t from-blue-400 to-indigo-400 opacity-60"
                                        style={{
                                            height: `${v * 0.7}px`,
                                            left: '50%',
                                            top: '50%',
                                            transform: `rotate(${(i * (360 / visualizerData.length)) + 90}deg)`,
                                            transformOrigin: '0 0',
                                            marginTop: `${y1}px`,
                                            marginLeft: `${x1}px`,
                                            transition: 'height 50ms ease-out'
                                        }}
                                    />
                                );
                            })}

                            {/* Center Icon */}
                            <div className="relative z-10 w-20 h-20 bg-blue-600/10 backdrop-blur-xl rounded-full border border-blue-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                <Mic size={28} className="text-blue-400 animate-pulse" />

                                {/* Scanning line effect */}
                                <div className="absolute inset-0 w-full h-[1px] bg-blue-400/40 top-1/2 -translate-y-1/2 animate-scan" />
                            </div>
                        </div>

                        {/* Status Label & Stop Button */}
                        <div className="flex items-center gap-2">
                            <div className="px-6 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">ComVerSa IA Escutando...</p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    stopRecording();
                                }}
                                className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg shadow-red-500/20 transition-all hover:scale-110 active:scale-95 group/stop"
                                title="Parar Gravação"
                            >
                                <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes scan {
                        0% { top: 10%; opacity: 0; }
                        50% { opacity: 1; }
                        100% { top: 90%; opacity: 0; }
                    }
                    .animate-scan {
                        position: absolute;
                        animation: scan 1.5s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Content Container (Full Screen Result) */}
            <div className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {mode === 'agent' ? (
                                <>
                                    <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                                        <Sparkles size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-emerald-800 uppercase tracking-tight leading-none">Agente IA Ativo</h3>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1.5">Escutando comando de ação...</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                                        <Sparkles size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight leading-none">Transcrição IA</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">Áudio para Texto</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Result Content */}
                    <div className="space-y-6">
                        {isProcessing ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-blue-100 rounded-full" />
                                    <div className="absolute inset-0 w-20 h-20 border-4 border-t-blue-600 rounded-full animate-spin" />
                                </div>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">A IA está processando...</p>
                            </div>
                        ) : actionResult && actionResult.status === 'completed' ? (
                            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={40} className="text-emerald-500" />
                                </div>
                                <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">Ação Realizada!</h4>
                                <p className="text-emerald-700 font-medium">"{actionResult.feedback}"</p>
                                <p className="text-xs text-gray-400 max-w-xs mx-auto">"{actionResult.data?.messageContent}"</p>
                            </div>
                        ) : (isAnalyzingIntent || isExecutingAction) ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-6 animate-in fade-in">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-purple-100 rounded-full" />
                                    <div className="absolute inset-0 w-20 h-20 border-4 border-t-purple-600 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {isAnalyzingIntent ? <Sparkles size={24} className="text-purple-500 animate-pulse" /> : <Send size={24} className="text-purple-500 animate-pulse" />}
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-purple-600 uppercase tracking-widest">
                                    {isAnalyzingIntent ? 'Analisando Intenção...' : 'Executando Ação...'}
                                </p>
                            </div>
                        ) : transcription ? (
                            <div className="space-y-4">
                                <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <MessageSquare size={100} />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <p className="text-lg text-gray-800 font-medium leading-relaxed italic">
                                            "{improvedTranscription || transcription}"
                                        </p>

                                        {!improvedTranscription && !isImproving && (
                                            <button
                                                onClick={handleImproveText}
                                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 group/btn"
                                            >
                                                <Sparkles size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                                Melhorar com IA
                                            </button>
                                        )}

                                        {isImproving && (
                                            <div className="flex items-center gap-2 text-purple-600 py-3">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Polindo o áudio...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 text-emerald-600">
                                    <CheckCircle2 size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {improvedTranscription ? 'Texto melhorado e copiado!' : 'Copiado para a área de transferência!'}
                                    </span>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 flex gap-4">
                                <AlertCircle size={24} className="text-red-500 shrink-0" />
                                <p className="text-sm text-red-600 font-bold leading-relaxed">{error}</p>
                            </div>
                        ) : null}
                    </div>

                    {/* Footer Action */}
                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-gray-200 active:scale-95 transition-all"
                    >
                        Fechar Comandante
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </div>
    );
};

export default VoiceCommandOverlay;
