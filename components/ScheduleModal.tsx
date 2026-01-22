
import React, { useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  Calendar as CalendarIcon, 
  Clock, 
  Info,
  Paperclip,
  Mic,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronDown,
  // Added missing icons for steps 3 and 4
  MessageSquare,
  Zap
} from 'lucide-react';

interface StepProps {
  active: boolean;
  completed: boolean;
  number: number;
  label: string;
}

const Step: React.FC<StepProps> = ({ active, completed, number, label }) => (
  <div className="flex flex-col items-center gap-2 flex-1 relative">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
      completed ? 'bg-[#0ea5e9] text-white' : 
      active ? 'bg-[#0ea5e9] text-white' : 
      'bg-gray-200 text-gray-500'
    }`}>
      {completed ? <Check size={16} strokeWidth={4} /> : number}
    </div>
    <span className={`text-[10px] font-bold text-center ${active || completed ? 'text-gray-700' : 'text-gray-400'}`}>
      {label}
    </span>
    {number < 6 && (
      <div className="absolute top-4 left-[60%] w-[80%] h-0.5 bg-gray-100 -z-0" />
    )}
  </div>
);

const ScheduleModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const steps = [
    "Data e Hora", "Conteúdo", "Destinatários", 
    "Recorrência", "Opções Avançadas", "Revisar e Confirmar"
  ];

  const nextStep = () => setStep(s => Math.min(6, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-[1100px] h-[750px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-blue-500 font-bold">
            <Plus size={20} strokeWidth={3} />
            <h2 className="text-xl">Agendar Mensagem Rápida</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="px-16 pt-8 pb-4 bg-gray-50/50 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 w-full h-1 bg-gray-100 -z-0" />
            <div className="absolute top-4 left-0 h-1 bg-[#0ea5e9] transition-all duration-300 -z-0" style={{ width: `${(step - 1) * 20}%` }} />
            {steps.map((label, idx) => (
              <Step key={idx} number={idx + 1} label={label} active={step === idx + 1} completed={step > idx + 1} />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10 overflow-y-auto">
          {step === 1 && (
            <div className="flex gap-16 h-full">
              {/* Mini Calendar */}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-blue-500 mb-8">
                  <CalendarIcon size={20} />
                  <span className="text-xl font-bold">20 Janeiro 2026</span>
                </div>
                <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <button className="text-gray-400"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-gray-700">Janeiro 2026</span>
                    <button className="text-gray-400"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-7 text-center mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[10px] font-bold text-gray-400">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => (
                      <div key={i} className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors cursor-pointer ${i+1 === 20 ? 'bg-[#0ea5e9] text-white' : 'text-gray-600 hover:bg-blue-50'}`}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-8 gap-2">
                    <button className="flex-1 py-1.5 border border-blue-500 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-tight">Hoje</button>
                    <button className="flex-1 py-1.5 border border-blue-500 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-tight">Amanhã</button>
                    <button className="flex-1 py-1.5 border border-blue-500 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-tight">Próxima Semana</button>
                  </div>
                </div>
              </div>

              {/* Clock Picker */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-12">
                   <div className="flex items-center justify-center gap-4 mb-2">
                      <span className="text-7xl font-bold text-gray-800">03</span>
                      <span className="text-7xl font-bold text-gray-800 animate-pulse">:</span>
                      <span className="text-7xl font-bold text-gray-800">16</span>
                   </div>
                   <div className="flex items-center justify-center gap-2 text-blue-500 font-bold uppercase tracking-wider text-xs">
                     <Clock size={16} /> AM - 3:16 AM
                   </div>
                </div>
                
                <div className="space-y-12 px-8">
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                       <span>Horas</span>
                    </div>
                    <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                       <span>Minutos</span>
                       <div className="flex gap-16 text-[10px]"><span>0</span><span>15</span><span>30</span><span>45</span><span>59</span></div>
                    </div>
                    <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {['Manhã', 'Meio-dia', 'Tarde', 'Noite'].map(t => (
                      <button key={t} className="py-2 border border-blue-500 text-blue-500 rounded-full text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                        <Clock size={12} /> {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info size={18} className="text-blue-500" />
                <span>Você pode usar a variável <strong>@nome</strong> no conteúdo da mensagem.</span>
              </div>
              <textarea 
                className="w-full h-64 p-6 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 resize-none"
                placeholder="Conteúdo"
              ></textarea>
              <div className="flex gap-4">
                <button className="flex-1 py-2.5 border border-blue-500 text-blue-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase">
                  <Plus size={16} /> Adicionar mensagens pré-definida
                </button>
                <button className="flex-1 py-2.5 border border-blue-500 text-blue-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase">
                  <Paperclip size={16} /> Escolher um arquivo
                </button>
                <button className="flex-1 py-2.5 border border-blue-500 text-blue-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase">
                  <Mic size={16} /> Gravar áudio
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                   <MessageSquare size={18} className="text-blue-500" /> Qual conexão deve enviar a mensagem <Info size={14} className="text-gray-400 cursor-help" />
                </div>
                <div className="relative">
                  <select className="w-full p-3 bg-white border border-gray-200 rounded-lg appearance-none text-sm text-gray-500">
                    <option>Conexões</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-gray-400" size={16} />
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                   <UsersIcon size={18} className="text-blue-500" /> Contatos <Info size={14} className="text-gray-400 cursor-help" />
                </div>
                <div className="relative">
                  <select className="w-full p-3 bg-white border border-gray-200 rounded-lg appearance-none text-sm text-gray-500">
                    <option>Contatos</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-gray-400" size={16} />
                </div>
                <div className="space-y-4 pt-4">
                   <div className="flex items-center gap-2 text-sm font-bold text-gray-700">Tags <Info size={14} className="text-gray-400 cursor-help" /></div>
                   <div className="border border-blue-500 rounded-lg p-1.5 relative">
                      <div className="absolute -top-2.5 left-3 px-1 bg-white text-[10px] text-blue-500 font-bold">Selecionar Tags</div>
                      <div className="flex items-center justify-between px-2 py-1.5">
                         <span className="text-sm text-gray-300">|</span>
                         <ChevronDown className="text-gray-400" size={16} />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
             <div className="space-y-10">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                   <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Zap size={20} /></div>
                   <div>
                      <h3 className="font-bold text-gray-800">Recorrência <Info size={14} className="inline text-gray-400 ml-1" /></h3>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-6 bg-blue-500 rounded-full relative p-1 cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                  <span className="font-bold text-gray-700">Habilitar agendamento recorrente</span>
                </div>

                <p className="text-sm text-gray-500">
                  Você pode escolher enviar a mensagem de forma recorrente e escolher o intervalo. Se for uma mensagem única, não altere nada nesta seção.
                </p>

                <div className="max-w-md space-y-8">
                   <div className="border border-blue-500 rounded-lg p-1.5 relative">
                      <div className="absolute -top-2.5 left-3 px-1 bg-white text-[10px] text-blue-500 font-bold">Tipo de Repetição</div>
                      <div className="flex items-center justify-between px-2 py-2">
                         <span className="text-sm text-gray-700">Mensal</span>
                         <ChevronDown className="text-gray-400" size={18} />
                      </div>
                   </div>

                   <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-500" />
                      <span className="text-sm font-bold text-gray-700">Somente dias úteis <Info size={14} className="inline text-gray-400 ml-1" /></span>
                   </div>

                   <div className="space-y-2">
                      <div className="p-3 border border-gray-200 rounded-lg text-sm text-gray-400">Enviar quantas vezes</div>
                      <p className="text-[10px] text-gray-400">Digite o número de vezes para enviar (0 para ilimitado, 1-9999)</p>
                   </div>

                   <p className="text-[11px] text-gray-400 italic">
                      Isso determina quantas vezes a mensagem será enviada. Por exemplo, se definido como 3, a mensagem será enviada no momento programado e mais duas vezes depois.
                   </p>
                </div>
             </div>
          )}

          {step === 5 && (
            <div className="space-y-10">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                   <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><SettingsIcon size={20} /></div>
                   <h3 className="font-bold text-gray-800">Criar ticket? <Info size={14} className="inline text-gray-400 ml-1" /></h3>
                </div>
                <p className="text-sm text-gray-500">Escolha qual estratégia usar para criar ou não criar um novo ticket.</p>
                
                <div className="space-y-8">
                  <div className="border border-gray-200 rounded-lg p-1.5 relative">
                    <div className="absolute -top-2.5 left-3 px-1 bg-white text-[10px] text-gray-400 font-bold">Criar ticket?</div>
                    <div className="flex items-center justify-between px-2 py-2">
                      <span className="text-sm text-gray-700">Criar um ticket normal</span>
                      <ChevronDown className="text-gray-400" size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="border border-gray-200 rounded-lg p-3 flex justify-between items-center text-sm text-gray-400">
                       Setores <ChevronDown size={18} />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 flex justify-between items-center text-sm text-gray-400">
                       Atendentes <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-12">
               <h3 className="text-2xl font-bold text-gray-800">Resumo da Mensagem</h3>
               <div className="space-y-8 text-gray-600">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Conexão:</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Horário Agendado:</p>
                    <p className="text-lg font-bold text-gray-800">Terça, 20 de Janeiro de 2026 às 03:17</p>
                    <p className="text-xs text-gray-400">20/01/2026 03:17 | America/Sao_Paulo: 20/01/2026 03:17</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Destinatários:</p>
                    <div className="h-0.5 w-full bg-gray-50 mt-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Mensagem:</p>
                    <div className="h-0.5 w-full bg-gray-50 mt-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Configurações Avançadas:</p>
                    <p className="font-bold text-gray-800">Estratégia: Criar um ticket normal</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <button 
            onClick={prevStep}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-white hover:shadow-sm'}`}
          >
            <ChevronLeft size={18} /> VOLTAR
          </button>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-purple-600 font-bold text-xs uppercase hover:underline">Cancelar</button>
            <button 
              onClick={nextStep}
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-sky-100 flex items-center gap-2 transition-all active:scale-95"
            >
              {step === 6 ? 'CONFIRMAR' : 'PRÓXIMO'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default ScheduleModal;
