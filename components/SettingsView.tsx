
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, User, Palette, Globe, Check,
  Webhook, Activity, Copy, ExternalLink, Zap, Plus, Trash2,
  Database, Key, Link2, Save, Edit3
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, setDoc, getDoc, limit, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('WEBHOOK');
  const [webhookListening, setWebhookListening] = useState(true);
  const [lastEvent, setLastEvent] = useState<any>(null);

  // Configurações da Evolution e IA
  const [evolutionConfig, setEvolutionConfig] = useState({
    url: '',
    instance: '',
    apiKey: '',
    n8nSendUrl: 'https://n8n.canvazap.com.br/webhook-test/799c3543-026d-472f-a852-460f69c4d166',
    geminiApiKey: 'AIzaSyC5nSyUtnQt97vglDGZurv2AVVtbArg4nY',
    openaiApiKey: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingN8N, setIsEditingN8N] = useState(false);
  const [isEditingGemini, setIsEditingGemini] = useState(false);
  const [isEditingOpenAI, setIsEditingOpenAI] = useState(false);

  const baseUrl = window.location.origin;

  const tabs = [
    'EM GERAL', 'CONEXÕES', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES',
    'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'INTELIGENCIA ARTIFICIAL', 'SEGURANÇA', 'WEBHOOK', 'LIMPEZA'
  ];

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      const docRef = doc(db, "settings", "evolution");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvolutionConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
    };
    loadConfig();
  }, []);

  const handleSaveEvolution = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "evolution"), evolutionConfig);
      setIsEditingN8N(false);
      setIsEditingGemini(false);
      setIsEditingOpenAI(false);
      alert('Configurações salvas com sucesso!');
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
      description: 'Recebe mensagens enviadas e recebidas diretamente da Evolution.',
      type: 'ENTRADA'
    }
  ];

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
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();

          // Formata o timestamp de forma segura
          let ts = 'Processando...';
          if (data.timestamp instanceof Timestamp) {
            ts = data.timestamp.toDate().toLocaleString();
          } else if (data.timestamp) {
            ts = new Date(data.timestamp).toLocaleString();
          }

          setLastEvent({ ...data, timestamp: ts });
        }
      }, (error) => {
        console.error("Erro no monitor de webhook:", error);
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
        <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0 bg-white items-center pr-4">
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
          <span className="ml-auto text-[10px] text-gray-300 font-mono">v1.2-reset-btn</span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc]">
          <div className="max-w-4xl mx-auto">

            {activeTab === 'CONEXÕES' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Endpoints de Saída</h3>
                      <p className="text-sm text-gray-500">Configure para onde o CRM deve enviar suas respostas.</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Webhook de Envio (N8N)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="https://n8n.seuhosti.com/..."
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                          value={evolutionConfig.n8nSendUrl}
                          onChange={(e) => setEvolutionConfig({ ...evolutionConfig, n8nSendUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 mt-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Configurações Diretas Evolution (Opcional)</h4>
                      <div className="grid gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">URL da API</label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={evolutionConfig.url}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, url: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Instância</label>
                            <input
                              type="text"
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              value={evolutionConfig.instance}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instance: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">API Key</label>
                            <input
                              type="password"
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              value={evolutionConfig.apiKey}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={handleSaveEvolution}
                        disabled={isSaving}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? 'SALVANDO...' : <><Save size={20} /> SALVAR CONFIGURAÇÕES</>}
                      </button>
                    </div>
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
                  <div className="flex items-center gap-3">
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
                </div>

                <div className="grid gap-6">
                  {/* Webhook Entrada */}
                  {initialWebhooks.map((wh) => (
                    <div key={wh.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">{wh.name}</h5>
                        <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full uppercase tracking-wider">ENTRADA</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{wh.description}</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 truncate flex items-center">
                          {wh.url}
                        </div>
                        <button
                          onClick={() => copyToClipboard(wh.url)}
                          className="bg-gray-800 text-white px-5 rounded-2xl hover:bg-black transition-colors font-bold text-xs shrink-0"
                        >
                          COPIAR URL
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Webhook Saída Editável */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-bold text-gray-800 text-lg">Webhook de Envio (N8N)</h5>
                      <div className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider">SAÍDA</div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Para onde o CRM envia as mensagens que você digita na tela.</p>

                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={evolutionConfig.n8nSendUrl}
                          onChange={(e) => setEvolutionConfig({ ...evolutionConfig, n8nSendUrl: e.target.value })}
                          disabled={!isEditingN8N}
                          placeholder="https://sua-n8n.com/webhook/..."
                          className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-emerald-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                        />
                      </div>

                      {isEditingN8N ? (
                        <button
                          onClick={handleSaveEvolution}
                          disabled={isSaving}
                          className="bg-emerald-500 text-white px-5 rounded-2xl hover:bg-emerald-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                        >
                          <Save size={14} /> SALVAR
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingN8N(true)}
                            className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Edit3 size={14} /> EDITAR
                          </button>
                          <button
                            onClick={() => copyToClipboard(evolutionConfig.n8nSendUrl)}
                            className="bg-gray-800 text-white px-5 rounded-2xl hover:bg-black transition-colors font-bold text-xs shrink-0"
                          >
                            COPIAR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Console / Monitor Area */}
                  <div className="bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-800 mt-6 min-h-[300px] flex flex-col">
                    <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/80" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                          <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Live Console / Webhook Monitor</span>
                      </div>
                      {webhookListening && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-6 font-mono text-sm overflow-y-auto custom-scrollbar bg-[#0f172a]">
                      {lastEvent ? (
                        <div className="animate-in fade-in duration-500">
                          <div className="flex items-center gap-2 text-emerald-400 mb-4 text-xs font-bold bg-emerald-400/5 py-1.5 px-3 rounded-lg border border-emerald-400/10 w-fit">
                            <Activity size={12} />
                            EVENTO RECEBIDO @ {lastEvent.timestamp}
                          </div>
                          <pre className="text-gray-300 leading-relaxed whitespace-pre-wrap selection:bg-blue-500/30">
                            {JSON.stringify(lastEvent, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                          <div className="p-8 bg-gray-800/50 rounded-full">
                            <Webhook size={48} className={webhookListening ? 'animate-bounce' : ''} />
                          </div>
                          <p className="text-sm font-bold uppercase tracking-widest text-center px-10">
                            {webhookListening
                              ? "Aguardando próximo evento pela Evolution API..."
                              : "Ative a escuta para monitorar eventos em tempo real"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'INTELIGENCIA ARTIFICIAL' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Google Gemini AI</h3>
                      <p className="text-sm text-gray-500">Configure sua chave de API para habilitar recursos de inteligência artificial.</p>
                    </div>
                  </div>

                  <div className="grid gap-8">
                    {/* Google Gemini */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Chave API Gemini</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                              type={isEditingGemini ? "text" : "password"}
                              placeholder="AIzaSy..."
                              disabled={!isEditingGemini}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono outline-none transition-all ${isEditingGemini ? 'ring-2 ring-blue-500 bg-white shadow-inner' : 'cursor-default'}`}
                              value={evolutionConfig.geminiApiKey}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, geminiApiKey: e.target.value })}
                            />
                          </div>

                          {isEditingGemini ? (
                            <button
                              onClick={handleSaveEvolution}
                              disabled={isSaving}
                              className="bg-blue-600 text-white px-6 rounded-2xl hover:bg-blue-700 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                            >
                              <Save size={16} /> SALVAR
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsEditingGemini(true)}
                              className="bg-gray-100 text-gray-600 px-6 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                            >
                              <Edit3 size={16} /> EDITAR
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex gap-3">
                          <Activity className="text-blue-500 shrink-0" size={18} />
                          <p className="text-xs text-blue-700 leading-relaxed">
                            Esta chave será usada para o processamento de mensagens e automações via Google Gemini.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* OpenAI API Key */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Shield size={20} />
                        </div>
                        <h4 className="font-bold text-gray-700">OpenAI (ChatGPT)</h4>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Chave API OpenAI</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                              type={isEditingOpenAI ? "text" : "password"}
                              placeholder="sk-proj-..."
                              disabled={!isEditingOpenAI}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono outline-none transition-all ${isEditingOpenAI ? 'ring-2 ring-emerald-500 bg-white shadow-inner' : 'cursor-default'}`}
                              value={evolutionConfig.openaiApiKey || ''}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, openaiApiKey: e.target.value })}
                            />
                          </div>

                          {isEditingOpenAI ? (
                            <button
                              onClick={handleSaveEvolution}
                              disabled={isSaving}
                              className="bg-emerald-600 text-white px-6 rounded-2xl hover:bg-emerald-700 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                            >
                              <Save size={16} /> SALVAR
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsEditingOpenAI(true)}
                              className="bg-gray-100 text-gray-600 px-6 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                            >
                              <Edit3 size={16} /> EDITAR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'LIMPEZA' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Manutenção e Limpeza</h3>
                      <p className="text-sm text-gray-500">Ferramentas para resetar dados e limpar logs do sistema.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Reset Database */}
                    <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <Database size={20} />
                          <h4 className="font-bold uppercase tracking-tight text-sm">Limpar Banco de Dados</h4>
                        </div>
                        <p className="text-xs text-red-700 leading-relaxed mb-6">
                          ⚠️ **ATENÇÃO:** Esta ação apagará permanentemente todas as conversas, mensagens e históricos de chat do CRM. Esta ação não pode ser desfeita.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm("⚠️ PERIGO: Isso apagará TODAS as conversas e mensagens. Confirma?")) return;
                          const chatsSnap = await getDocs(collection(db, "chats"));
                          for (const d of chatsSnap.docs) {
                            const msgs = await getDocs(collection(db, "chats", d.id, "messages"));
                            const batch = writeBatch(db);
                            msgs.docs.forEach(m => batch.delete(m.ref));
                            await batch.commit();
                            await deleteDoc(doc(db, "chats", d.id));
                          }
                          alert("Banco de dados resetado!");
                        }}
                        className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg active:scale-95"
                      >
                        RESETAR BANCO AGORA
                      </button>
                    </div>

                    {/* Clear Logs */}
                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Activity size={20} />
                          <h4 className="font-bold uppercase tracking-tight text-sm">Limpar Logs do Monitor</h4>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-6">
                          Esta ação limpa o histórico de eventos que aparecem no Monitor de Webhooks. Útil para limpar a tela durante testes massivos.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm("Limpar logs do monitor?")) return;
                          const snapshot = await getDocs(collection(db, "webhook_events"));
                          const batch = writeBatch(db);
                          snapshot.docs.forEach(d => batch.delete(d.ref));
                          await batch.commit();
                          setLastEvent(null);
                          alert("Logs limpos!");
                        }}
                        className="w-full bg-gray-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg active:scale-95"
                      >
                        LIMPAR TODOS OS LOGS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {['EM GERAL', 'ATENDIMENTOS', 'CHAT INTERNO', 'PERMISSÕES', 'INTEGRAÇÃO', 'AÇÕES POR LOTE', 'SEGURANÇA'].includes(activeTab) && (
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
