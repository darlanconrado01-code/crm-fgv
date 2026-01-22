
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, User, Palette, Globe, Check,
  Webhook, Activity, Copy, ExternalLink, Zap, Plus, Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('WEBHOOK');
  const [webhookListening, setWebhookListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  // URL base da Vercel (seria bom detectar automaticamente ou deixar um placeholder)
  const baseUrl = window.location.origin;

  const tabs = [
    'EM GERAL', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES',
    'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'INTELIGENCIA ARTIFICIAL', 'SEGURANÇA', 'WEBHOOK'
  ];

  const initialWebhooks = [
    {
      id: '1',
      name: 'Evolution API (Mensagens)',
      url: `${baseUrl}/api/webhook?type=evolution`,
      description: 'Recebe mensagens enviadas e recebidas diretamente da Evolution.'
    }
  ];

  const [webhooks, setWebhooks] = useState(initialWebhooks);

  // Escuta Real do Firestore
  useEffect(() => {
    let unsubscribe: any;
    if (webhookListening) {
      const q = query(
        collection(db, "webhook_events"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const ts = data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp;
            setLastEvent({ ...data, timestamp: ts });
          }
        });
      });
    } else {
      setLastEvent(null);
    }
    return () => unsubscribe?.();
  }, [webhookListening]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL Copiada!');
  };

  return (
    <div className="h-full w-full bg-gray-100 p-6 overflow-hidden flex flex-col font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[11px] font-bold whitespace-nowrap relative transition-colors ${activeTab === tab ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc]">
          <div className="max-w-5xl mx-auto space-y-8">
            {activeTab === 'WEBHOOK' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Status Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${webhookListening ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                      <Activity size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Monitor de Webhooks</h3>
                      <p className="text-sm text-gray-500">
                        {webhookListening ? 'Escutando eventos em tempo real...' : 'Escuta desativada.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWebhookListening(!webhookListening)}
                    className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${webhookListening
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100'
                      }`}
                  >
                    {webhookListening ? 'DESATIVAR ESCUTA' : 'ATIVAR ESCUTA'}
                  </button>
                </div>

                {/* Console Live */}
                {webhookListening && (
                  <div className="mb-8 bg-slate-900 rounded-3xl p-6 font-mono text-xs border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-emerald-400 font-bold uppercase tracking-widest">Live Console</span>
                      </div>
                      <span className="text-slate-500">evolution_api_v2</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {lastEvent ? (
                        <div className="animate-in fade-in slide-in-from-left-2 transition-all">
                          <p className="text-emerald-400 font-bold flex items-center gap-2">
                            <Check size={14} /> EVENTO RECEBIDO: {lastEvent.webhook_type || 'default'}
                          </p>
                          <pre className="mt-3 text-blue-300 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 overflow-x-auto">
                            {JSON.stringify(lastEvent, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                          <p className="italic">Aguardando interação do WhatsApp...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Webhooks Config List */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Seus Endpoints</h4>
                    <button className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                      <Plus size={18} /> NOVO WEBHOOK
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h5 className="font-bold text-gray-800 text-lg">{wh.name}</h5>
                            <p className="text-sm text-gray-500 mt-1">{wh.description}</p>
                          </div>
                          <button className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 truncate flex items-center">
                            {wh.url}
                          </div>
                          <button
                            onClick={() => copyToClipboard(wh.url)}
                            className="bg-gray-800 text-white px-5 rounded-2xl hover:bg-black transition-colors flex items-center gap-2 font-bold text-xs"
                          >
                            <Copy size={16} /> COPIAR URL
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Help */}
                <div className="mt-12 p-8 bg-blue-600 rounded-[2rem] text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Zap size={120} fill="currentColor" />
                  </div>
                  <div className="relative z-10 max-w-2xl">
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                      Dica de Mestre
                    </h4>
                    <p className="text-blue-100 leading-relaxed mb-6">
                      Ao configurar a Evolution API, use o endpoint acima. O sistema vai ignorar o <b>n8n</b> e receber os dados diretamente,
                      garantindo uma resposta muito mais rápida nas telas de atendimento.
                    </p>
                    <a href="https://evolution-api.com" target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 px-6 py-2.5 rounded-xl font-bold text-sm transition-all inline-flex items-center gap-2">
                      Doc Evolution API <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-400">
                Aba {activeTab} em desenvolvimento...
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SettingsView;
