
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Search, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import ScheduleModal from './ScheduleModal';

const SchedulingView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="h-full w-full bg-[#f8fafc] flex">
      {/* Sidebar Info */}
      <div className="w-72 bg-white border-r border-gray-100 flex flex-col p-8">
        <h2 className="text-lg text-gray-500 mb-1">Terça-feira</h2>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">20 Janeiro</h1>
        <p className="text-sm text-gray-400 mb-12">2026</p>

        <div className="space-y-6">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Mensagens para a data selecionada</span>
            <Filter size={14} />
          </div>
          <p className="text-sm text-gray-400 italic">Sem mensagens programadas para esta data</p>
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-blue-500">
            <CalendarIcon size={20} />
            <h2 className="text-lg font-bold">Mensagens Programadas</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={18} /> Adicionar Mensagem programada
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
          {/* Calendar Header */}
          <div className="flex items-center gap-8 p-6 border-b border-gray-50">
            <div className="flex items-center gap-2">
               <button className="text-gray-400 hover:text-blue-500"><ChevronLeft size={20} /></button>
               <div className="flex items-center gap-1">
                 <button className="text-lg font-bold text-gray-800 flex items-center gap-1">Janeiro <ChevronDown size={14} /></button>
                 <button className="text-lg font-bold text-gray-800 flex items-center gap-1">2026 <ChevronDown size={14} /></button>
               </div>
               <button className="text-gray-400 hover:text-blue-500"><ChevronRight size={20} /></button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50/30">
            {weekDays.map(day => (
              <div key={day} className="py-4 text-center text-[11px] font-bold text-gray-400 uppercase">{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 flex-1">
            {/* Pad first week */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`pad-${i}`} className="border-r border-b border-gray-50 bg-gray-50/10 p-4">
                <span className="text-xs text-gray-300 font-medium">{28 + i}</span>
              </div>
            ))}
            
            {days.map(day => (
              <div 
                key={day} 
                className={`border-r border-b border-gray-50 p-4 relative group cursor-pointer hover:bg-blue-50/30 transition-colors ${day === 20 ? 'bg-[#f0f9ff]' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${day === 20 ? 'text-blue-600' : 'text-gray-500'}`}>{day}</span>
                  <button className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} />
                  </button>
                </div>
                {day === 1 && (
                  <div className="mt-2 bg-rose-100 text-rose-600 text-[9px] font-bold p-1 rounded-sm border-l-2 border-rose-500 truncate">
                    🎉 Confraternização...
                  </div>
                )}
                {day === 20 && (
                  <div className="absolute inset-0 border-2 border-[#bae6fd] pointer-events-none rounded-sm">
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* List toggle footer */}
          <div className="p-4 border-t border-gray-50 flex justify-center">
            <button className="flex items-center gap-2 text-blue-500 text-xs font-bold hover:bg-blue-50 px-3 py-1 rounded transition-colors uppercase">
               Mostrar lista <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && <ScheduleModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

const ChevronDown = ({ size }: { size?: number }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

export default SchedulingView;
