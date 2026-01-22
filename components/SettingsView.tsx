
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, User, Palette, Globe, Check,
  Webhook, Activity, Copy, ExternalLink, Zap, Plus, Trash2,
  Database, Key, Link2, Save
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('WEBHOOK');
  const [webhookListening, setWebhookListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  // Configurações da Evolution
  const [evolutionConfig, setEvolutionConfig] = useState({
    url: '',
    instance: '',
    apiKey: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const baseUrl = window.location.origin;

  const tabs = [
    'EM GERAL', 'CONEXÕES', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES',
    'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'INTELIGENCIA ARTIFICIAL', 'SEGURANÇA', 'WEBHOOK'
  ];

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      const docRef = doc(db, "settings", "evolution");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvolutionConfig(docSnap.data() as any);
      }
    };
    loadConfig();
  }, []);

  const handleSaveEvolution = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "evolution"), evolutionConfig);
      alert('Configurações da Evolution salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
          <div className="max-w-4xl mx-auto">

            {activeTab === 'CONEXÕES' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Configuração Evolution API</h3>
                      <p className="text-sm text-gray-500">Esses dados são necessários para enviar mensagens do CRM para o WhatsApp.</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">URL da API</label>
                      <div className="relative">
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="https://sua-evolution.com.br"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={evolutionConfig.url}
                          onChange={(e) => setEvolutionConfig({ ...evolutionConfig, url: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome da Instância</label>
                        <div className="relative">
                          <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Ex: MinhaInstancia"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={evolutionConfig.instance}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instance: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Global API Key</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="password"
                            placeholder="Sua API Key"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={evolutionConfig.apiKey}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSaveEvolution}
                        disabled={isSaving}
                        className="w-full bg-gray-800 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? 'SALVANDO...' : <><Save size={20} /> SALVAR CONFIGURAÇÕES</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex gap-5">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl h-fit">
                    <Zap size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-amber-900">Como obter esses dados?</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      No seu painel da <b>Evolution API</b>, você encontrará a URL da API e a Global API Key nas configurações gerais.
                      A instância é o nome que você deu ao conectar o QR Code. Sem esses dados, o CRM poderá apenas "ler" as mensagens, mas não conseguirá responder.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'WEBHOOK' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* Status Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
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
                  <div className="bg-slate-900 rounded-3xl p-6 font-mono text-xs border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-emerald-400 font-bold uppercase tracking-widest">Live Console</span>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {lastEvent ? (
                        <pre className="text-blue-300 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                          {JSON.stringify(lastEvent, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-slate-500 italic text-center py-8">Aguardando interação...</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <h5 className="font-bold text-gray-800 text-lg mb-4">{wh.name}</h5>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 truncate">
                          {wh.url}
                        </div>
                        <button
                          onClick={() => copyToClipboard(wh.url)}
                          className="bg-gray-800 text-white px-5 rounded-2xl hover:bg-black transition-colors font-bold text-xs"
                        >
                          COPIAR URL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {['EM GERAL', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES', 'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'INTELIGENCIA ARTIFICIAL', 'SEGURANÇA'].includes(activeTab) && (
              <div className="flex items-center justify-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">
                {activeTab} em desenvolvimento...
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SettingsView;
