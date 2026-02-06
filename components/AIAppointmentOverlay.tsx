
import React from 'react';
import { X, Calendar, Clock, Check, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';

interface AIAppointmentOverlayProps {
    suggestion: {
        id: string;
        title: string;
        date?: string;
        time?: string;
        reason: string;
        summary: string;
    };
    onClose: () => void;
    onAccept: (suggestion: any) => void;
    onAdjust: (suggestion: any) => void;
    onDecline: (suggestionId: string) => void;
}

const AIAppointmentOverlay: React.FC<AIAppointmentOverlayProps> = ({
    suggestion,
    onClose,
    onAccept,
    onAdjust,
    onDecline
}) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500 relative overflow-hidden">
                {/* Adorno de fundo */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50" />

                <div className="relative">
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-emerald-500 text-white rounded-[1.5rem] shadow-xl shadow-blue-100 animate-pulse">
                            <Sparkles size={32} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-2 mb-8">
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight leading-tight">
                            Inteligência Artificial Detectou um Compromisso!
                        </h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                            Sugestão de agendamento automático
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-[2rem] p-8 space-y-6 border border-gray-100 mb-10">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 text-blue-500">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Título</h4>
                                <p className="text-lg font-bold text-gray-800">{suggestion.title}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 text-emerald-500">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Data</h4>
                                    <p className="text-sm font-bold text-gray-800">{suggestion.date || 'Não definida'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 text-amber-500">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Hora</h4>
                                    <p className="text-sm font-bold text-gray-800">{suggestion.time || 'Não definida'}</p>
                                </div>
                            </div>
                        </div>

                        {suggestion.summary && (
                            <div className="pt-4 border-t border-gray-200/50">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Resumo</h4>
                                <p className="text-xs text-gray-800 leading-relaxed">{suggestion.summary}</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-200/50">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Motivo da Detecção</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed italic">"{suggestion.reason}"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => onAccept(suggestion)}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Check size={18} /> AGENDAR REUNIÃO + TAREFA
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onAdjust(suggestion)}
                                className="bg-gray-100 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                Ajustar Dados
                            </button>
                            <button
                                onClick={() => onDecline(suggestion.id)}
                                className="bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                Recusar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAppointmentOverlay;
