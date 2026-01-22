
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, User, Palette, Globe, Check,
  Webhook, Activity, Copy, ExternalLink, Zap
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

interface SettingsToggleProps {
  label: string;
  enabled?: boolean;
  onChange?: (enabled: boolean) => void;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, enabled = true, onChange }) => {
  return (
    <div
      className="flex items-center gap-4 py-4 group cursor-pointer border-b border-gray-50 last:border-0"
      onClick={() => onChange?.(!enabled)}
    >
      <div className={`w-12 h-6 rounded-full relative transition-colors p-1 ${enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
      <span className="text-[15px] font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
        {label}
      </span>
    </div>
  );
};

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('EM GERAL');
  const [webhookListening, setWebhookListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  const tabs = [
    'EM GERAL', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES',
    'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'INTELIGENCIA ARTIFICIAL', 'SEGURANÇA', 'WEBHOOK'
  ];

  const webhookUrls = {
    test: 'https://n8n.canvazap.com.br/webhook-test/766a6d3a-57c8-428c-8f71-427ff834e6e2',
    production: 'https://n8n.canvazap.com.br/webhook/766a6d3a-57c8-428c-8f71-427ff834e6e2'
  };

  // Escuta Real do Firestore
  useEffect(() => {
    let unsubscribe: any;

    if (webhookListening) {
      console.log("Iniciando escuta real no Firestore (coleção: webhook_events)...");
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

            setLastEvent({
              ...data,
              timestamp: ts,
              _real: true
            });
          }
        });
      }, (error) => {
        console.error("Erro na escuta do Firestore:", error);
      });
    } else {
      setLastEvent(null);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [webhookListening]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL Copiada!');
  };

  return (
    <div className="h-full w-full bg-gray-100 p-6 overflow-hidden flex flex-col">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[11px] font-bold whitespace-nowrap relative transition-colors ${activeTab === tab ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-white">
          <div className="max-w-4xl">
            {activeTab === 'WEBHOOK' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${webhookListening ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'}`}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Status do Webhook</h3>
                      <p className="text-sm text-gray-600">
                        {webhookListening ? 'O sistema está escutando eventos em tempo real.' : 'Escuta desativada. Ative para receber dados do n8n.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWebhookListening(!webhookListening)}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${webhookListening
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                      }`}
                  >
                    {webhookListening ? 'DESATIVAR ESCUTA' : 'ATIVAR ESCUTA'}
                  </button>
                </div>

                {webhookListening && (
                  <div className="bg-gray-900 rounded-2xl p-6 font-mono text-xs overflow-hidden border border-gray-800 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-500 font-bold uppercase tracking-widest text-[10px]">Console de Eventos Live</span>
                      </div>
                      <span className="text-gray-500">v1.0.4 - REAL-TIME</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar text-gray-300">
                      {lastEvent ? (
                        <div className="animate-in fade-in duration-500">
                          <p className="text-emerald-400 font-bold text-sm">[ {lastEvent.timestamp} ] DADO RECEBIDO:</p>
                          <pre className="mt-2 text-blue-300 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 whitespace-pre-wrap break-all">
                            {JSON.stringify(lastEvent, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                          <p className="italic">Aguardando novo evento no Firestore (coleção: webhook_events)...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Webhook de Teste (n8n)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono text-gray-600 truncate">
                        {webhookUrls.test}
                      </div>
                      <button onClick={() => copyToClipboard(webhookUrls.test)} className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Webhook de Produção (n8n)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono text-gray-600 truncate">
                        {webhookUrls.production}
                      </div>
                      <button onClick={() => copyToClipboard(webhookUrls.production)} className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800">
                    <Zap size={18} className="text-yellow-500" />
                    <h4 className="font-bold">Como testar agora?</h4>
                  </div>
                  <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
                    <p>1. Ative a escuta no botão acima.</p>
                    <p>2. No seu <b>n8n</b>, adicione um nó de <b>Firestore</b> após o Webhook.</p>
                    <p>3. Configure para criar um documento na coleção: <code className="bg-gray-200 px-1.5 py-0.5 rounded font-bold text-blue-600">webhook_events</code></p>
                    <p>4. No documento, inclua um campo chamado <code className="bg-gray-200 px-1.5 py-0.5 rounded font-bold text-blue-600">timestamp</code> (com a data atual) e o corpo da mensagem.</p>
                  </div>
                  <div className="pt-2">
                    <a href="https://n8n.canvazap.com.br" target="_blank" rel="noreferrer" className="text-blue-500 text-xs font-bold flex items-center gap-1 hover:underline">
                      ABRIR N8N <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <SettingsToggle label="Agrupar mídias (imagens e vídeos)" />
                <SettingsToggle label="Mostrar seção Contatos para todos" />
                <SettingsToggle label="Mostrar seção Tags para todos" />
                <SettingsToggle label="Mostrar seção Conexões para todos" />
                <SettingsToggle label="Mostrar mensagens deletadas" />
                <SettingsToggle label="Mostrar Todos os Atendimentos Resolvidos para todos" />
                <SettingsToggle label="Mostrar seção Dashboard para todos" />
                <SettingsToggle label="Os atendentes podem finalizar o Atendimento sem enviar pesquisa de satisfação, se ativada." />
                <SettingsToggle label="Habilitar Carteira de Clientes" />
                <SettingsToggle label="Mostrar Notas das mensagens dos tickets para todos usuários" />
                <SettingsToggle label="Habilitar/Desabilitar segurança" enabled={false} />
              </div>
            )}
          </div>
        </div>

        {/* Footer info/save */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95">
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
};

export default SettingsView;
