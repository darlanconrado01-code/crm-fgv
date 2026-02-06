
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, User, Palette, Globe, Check,
  Webhook, Activity, Copy, ExternalLink, Zap, Plus, Trash2,
  Database, Key, Link2, Save, Edit3, QrCode, RefreshCw, QrCode as QrIcon, LogOut, Mic, Clock, Calendar
} from 'lucide-react';
import { db } from '../firebase';
import { useNotification } from './Notification';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, setDoc, getDoc, limit, getDocs, writeBatch, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('WEBHOOK');
  const [webhookListening, setWebhookListening] = useState(true);
  const { notify, confirm } = useNotification();
  const [lastEvent, setLastEvent] = useState<any>(null);

  // Configurações da Evolution e IA
  const [evolutionConfig, setEvolutionConfig] = useState({
    url: '',
    instance: '',
    apiKey: '',
    n8nSendUrl: 'https://n8n.canvazap.com.br/webhook-test/799c3543-026d-472f-a852-460f69c4d166',
    n8nReactionUrl: '',
    n8nDeleteUrl: '',
    n8nAudioUrl: 'https://n8n.canvazap.com.br/webhook/b72fc442-628a-4663-8be9-1fc40f3ceb9f',
    geminiApiKey: 'AIzaSyC5nSyUtnQt97vglDGZurv2AVVtbArg4nY',
    openaiApiKey: '',
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2PublicUrl: '',
    r2Bucket: '',
    r2CleanupDays: 30,
    voiceWebhookUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingN8N, setIsEditingN8N] = useState(false);
  const [isEditingGemini, setIsEditingGemini] = useState(false);
  const [isEditingOpenAI, setIsEditingOpenAI] = useState(false);
  const [isEditingR2, setIsEditingR2] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generalConfig, setGeneralConfig] = useState({
    openingHours: {
      start: '08:00',
      end: '18:00',
      days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    }
  });

  // Connection state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isFetchingQR, setIsFetchingQR] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'connecting'>('disconnected');

  const baseUrl = window.location.origin;

  const tabs = [
    'GERAL', 'CONEXÕES', 'INTEGRAÇÕES', 'SEGURANÇA', 'LIMPEZA'
  ];

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      const docRef = doc(db, "settings", "evolution");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvolutionConfig(prev => ({ ...prev, ...docSnap.data() }));
      }

      const genRef = doc(db, "settings", "general");
      const genSnap = await getDoc(genRef);
      if (genSnap.exists()) {
        setGeneralConfig(prev => ({ ...prev, ...genSnap.data() }));
      }
    };
    loadConfig();
    loadApiKeys();
  }, []);

  const loadApiKeys = () => {
    const q = query(collection(db, "api_keys"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setApiKeys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  };

  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) {
      notify("Digite um nome para a chave", "warning");
      return;
    }
    setIsGeneratingKey(true);
    try {
      const key = `cv_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      await addDoc(collection(db, "api_keys"), {
        name: newKeyName,
        key: key,
        createdAt: serverTimestamp()
      });
      setNewKeyName('');
      notify("Chave gerada com sucesso!", "success");
    } catch (e) {
      notify("Erro ao gerar chave.", "error");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (await confirm({
      title: 'Excluir Chave',
      message: 'Tem certeza que deseja excluir esta chave de API? Aplicações que a utilizam perderão o acesso.',
      type: 'danger',
      confirmText: 'Excluir'
    })) {
      try {
        await deleteDoc(doc(db, "api_keys", id));
        notify("Chave excluída com sucesso.", "success");
      } catch (e) {
        notify("Erro ao excluir chave.", "error");
      }
    }
  };

  const handleSaveEvolution = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "evolution"), evolutionConfig);
      setIsEditingN8N(false);
      setIsEditingGemini(false);
      setIsEditingOpenAI(false);
      setIsEditingR2(false);
      notify('Configurações salvas com sucesso!', "success");
    } catch (error) {
      notify('Erro ao salvar: ' + (error as any).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "general"), generalConfig);
      notify('Configurações gerais salvas!', "success");
    } catch (error) {
      notify('Erro ao salvar: ' + (error as any).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!evolutionConfig.url || !evolutionConfig.instance || !evolutionConfig.apiKey) return;

    try {
      const resp = await fetch(`${evolutionConfig.url}/instance/connectionState/${evolutionConfig.instance}`, {
        headers: { 'apikey': evolutionConfig.apiKey }
      });
      const data = await resp.json();

      const state = data.instance?.state || data.state;

      if (state === 'open') {
        setConnectionStatus('connected');
        setQrCode(null);
      } else if (state === 'connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error("Erro ao checar status:", error);
    }
  };

  const handleLogout = async () => {
    if (await confirm({
      title: 'Desconectar WhatsApp',
      message: 'Deseja realmente desconectar o WhatsApp do sistema?',
      type: 'danger',
      confirmText: 'Desconectar'
    })) {
      try {
        await fetch(`${evolutionConfig.url}/instance/logout/${evolutionConfig.instance}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionConfig.apiKey }
        });
        setConnectionStatus('disconnected');
        setQrCode(null);
        notify("WhatsApp desconectado com sucesso!", "success");
      } catch (error) {
        notify("Erro ao desconectar: " + (error as any).message, "error");
      }
    }
  };

  // Auto-check status when QR is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionStatus === 'connecting' || qrCode) {
      interval = setInterval(checkConnectionStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, qrCode]);

  const handleFetchQR = async () => {
    if (!evolutionConfig.url || !evolutionConfig.instance || !evolutionConfig.apiKey) {
      notify("Configure a URL, Instância e API Key primeiro!", "warning");
      return;
    }

    setIsFetchingQR(true);
    setQrCode(null);
    try {
      const isUzapi = evolutionConfig.url.toLowerCase().includes('uzapi');
      let targetUrl = '';
      let headers: any = { 'apikey': evolutionConfig.apiKey };

      if (isUzapi) {
        // UZAPI case
        targetUrl = `${evolutionConfig.url}/getQrCode?session=${evolutionConfig.instance}&sessionkey=${evolutionConfig.apiKey}`;
        headers = { 'content-type': 'application/json' };
      } else {
        // Evolution case
        targetUrl = `${evolutionConfig.url}/instance/connect/${evolutionConfig.instance}`;
      }

      console.log(`[Settings] Fetching QR from: ${targetUrl}`);
      const resp = await fetch(targetUrl, { headers });

      if (isUzapi) {
        // UZAPI usually returns base64 in a specific field or directly
        // According to the curl, it's a GET request (default for fetch unless specified)
        const data = await resp.json();
        if (data.qrcode || data.base64) {
          setQrCode(data.qrcode || data.base64);
          setConnectionStatus('connecting');
        } else {
          notify(data.message || "Erro ao obter QR Code da UZAPI", "error");
        }
      } else {
        const data = await resp.json();
        if (data.base64) {
          setQrCode(data.base64);
          setConnectionStatus('connecting');
        } else if (data.instance?.state === 'open' || data.state === 'open') {
          setConnectionStatus('connected');
          notify("Instância já está conectada!", "info");
        } else {
          const errorMsg = data.message || "Não foi possível gerar o QR Code. Verifique se a instância existe na Evolution API.";
          notify(errorMsg, "error");
        }
      }
    } catch (error) {
      notify("Erro ao buscar QR Code: " + (error as any).message, "error");
    } finally {
      setIsFetchingQR(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CONEXÕES') {
      checkConnectionStatus();
    }
  }, [activeTab]);

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
    notify('URL Copiada!', "success");
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

            {activeTab === 'GERAL' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Horário de Funcionamento</h3>
                      <p className="text-sm text-gray-500">Defina o período de atendimento global da empresa.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Abertura</label>
                        <input
                          type="time"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          value={generalConfig.openingHours?.start || '08:00'}
                          onChange={(e) => setGeneralConfig({
                            ...generalConfig,
                            openingHours: { ...(generalConfig.openingHours || { end: '18:00', days: [] }), start: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fechamento</label>
                        <input
                          type="time"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          value={generalConfig.openingHours?.end || '18:00'}
                          onChange={(e) => setGeneralConfig({
                            ...generalConfig,
                            openingHours: { ...(generalConfig.openingHours || { start: '08:00', days: [] }), end: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Dias de Funcionamento</label>
                      <div className="flex flex-wrap gap-2">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              const currentDays = generalConfig.openingHours?.days || [];
                              const newDays = currentDays.includes(day)
                                ? currentDays.filter(d => d !== day)
                                : [...currentDays, day];
                              setGeneralConfig({
                                ...generalConfig,
                                openingHours: { ...(generalConfig.openingHours || { start: '08:00', end: '18:00' }), days: newDays }
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${(generalConfig.openingHours?.days || []).includes(day)
                              ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-200'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                              }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={isSaving}
                      className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-all shadow-xl active:scale-95"
                    >
                      {isSaving ? 'SALVANDO...' : <><Save size={18} /> SALVAR ALTERAÇÕES</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'CONEXÕES' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <QrIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Conexão WhatsApp</h3>
                      <p className="text-sm text-gray-500">Gerencie sua conexão principal com a Evolution API.</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="pt-0">
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

                    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleSaveEvolution}
                        disabled={isSaving}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? 'SALVANDO...' : <><Save size={20} /> SALVAR CONFIGURAÇÕES</>}
                      </button>

                      <button
                        onClick={handleFetchQR}
                        disabled={isFetchingQR}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        {isFetchingQR ? (
                          <><RefreshCw size={20} className="animate-spin" /> GERANDO...</>
                        ) : (
                          <><QrIcon size={20} /> CONECTAR WHATSAPP</>
                        )}
                      </button>
                    </div>

                    {/* QR Code Display Section */}
                    {(qrCode || connectionStatus === 'connected') && (
                      <div className="mt-8 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
                        {connectionStatus === 'connected' ? (
                          <div className="text-center py-10">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                              <Check size={40} />
                            </div>
                            <h4 className="text-xl font-black text-gray-800 uppercase">WhatsApp Conectado</h4>
                            <p className="text-sm text-gray-500 mt-2">Sua instância está ativa e pronta para uso.</p>

                            <div className="flex gap-4 mt-8">
                              <button
                                onClick={checkConnectionStatus}
                                className="flex-1 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                              >
                                <RefreshCw size={14} /> Atualizar
                              </button>
                              <button
                                onClick={handleLogout}
                                className="flex-1 px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                              >
                                <LogOut size={14} /> Desconectar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6 ring-8 ring-blue-50">
                              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                            </div>
                            <div className="text-center">
                              <h4 className="font-black text-gray-800 uppercase tracking-tight mb-2">Aguardando Leitura</h4>
                              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                                Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> e aponte a câmera para o código acima.
                              </p>
                              <div className="flex gap-4 mt-6">
                                <button
                                  onClick={handleFetchQR}
                                  className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                                >
                                  Gerar Novo
                                </button>
                                <button
                                  onClick={checkConnectionStatus}
                                  className="px-6 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                                >
                                  Já Escaneei
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'INTEGRAÇÕES' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* Status Webhook Card */}
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Webhook Entrada e Saída */}
                  <div className="space-y-6">
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
                            COPIAR
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Envio (N8N)</h5>
                        <div className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider">SAÍDA</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Para onde o CRM envia as mensagens enviadas pelo chat.</p>

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
                            <Save size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingN8N(true)}
                            className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Reação (N8N)</h5>
                        <div className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider">REAÇÃO</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Para onde enviar a reação emoji selecionada.</p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={evolutionConfig.n8nReactionUrl || ''}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, n8nReactionUrl: e.target.value })}
                            disabled={!isEditingN8N}
                            placeholder="https://sua-n8n.com/webhook/reaction"
                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-emerald-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                          />
                        </div>
                        {isEditingN8N ? (
                          <button onClick={handleSaveEvolution} disabled={isSaving} className="bg-emerald-500 text-white px-5 rounded-2xl hover:bg-emerald-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Save size={14} />
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingN8N(true)} className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Exclusão (N8N)</h5>
                        <div className="text-[10px] font-black bg-red-50 text-red-600 px-2.5 py-1 rounded-full uppercase tracking-wider">EXCLUSÃO</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Para onde enviar o comando de apagar mensagem.</p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={evolutionConfig.n8nDeleteUrl || ''}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, n8nDeleteUrl: e.target.value })}
                            disabled={!isEditingN8N}
                            placeholder="https://sua-n8n.com/webhook/delete"
                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-red-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                          />
                        </div>
                        {isEditingN8N ? (
                          <button onClick={handleSaveEvolution} disabled={isSaving} className="bg-red-500 text-white px-5 rounded-2xl hover:bg-red-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Save size={14} />
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingN8N(true)} className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Áudio (N8N)</h5>
                        <div className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider">ÁUDIO / PTT</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Para onde enviar os áudios gravados no CRM.</p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={evolutionConfig.n8nAudioUrl || ''}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, n8nAudioUrl: e.target.value })}
                            disabled={!isEditingN8N}
                            placeholder="https://sua-n8n.com/webhook/audio"
                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-emerald-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                          />
                        </div>
                        {isEditingN8N ? (
                          <button onClick={handleSaveEvolution} disabled={isSaving} className="bg-emerald-500 text-white px-5 rounded-2xl hover:bg-emerald-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Save size={14} />
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingN8N(true)} className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2">
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Voz (IA)</h5>
                        <div className="text-[10px] font-black bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full uppercase tracking-wider">VOZ / COMANDO</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Endpoint que recebe o áudio gravado para transcrição e processamento.</p>

                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={evolutionConfig.voiceWebhookUrl || ''}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, voiceWebhookUrl: e.target.value })}
                            disabled={!isEditingN8N}
                            placeholder="https://sua-n8n.com/webhook/voice-command"
                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-purple-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                          />
                        </div>

                        {isEditingN8N ? (
                          <button
                            onClick={handleSaveEvolution}
                            disabled={isSaving}
                            className="bg-purple-500 text-white px-5 rounded-2xl hover:bg-purple-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Save size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingN8N(true)}
                            className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-800 text-lg">Webhook de Status</h5>
                        <div className="text-[10px] font-black bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full uppercase tracking-wider">STATUS</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Endpoint para receber atualizações de status (WhatsApp Status).</p>

                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={(evolutionConfig as any).statusWebhookUrl || ''}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, statusWebhookUrl: e.target.value } as any)}
                            disabled={!isEditingN8N}
                            placeholder="https://sua-n8n.com/webhook/status"
                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-mono text-gray-600 outline-none transition-all ${isEditingN8N ? 'ring-2 ring-yellow-500 bg-white shadow-inner' : 'truncate cursor-default'}`}
                          />
                        </div>

                        {isEditingN8N ? (
                          <button
                            onClick={handleSaveEvolution}
                            disabled={isSaving}
                            className="bg-yellow-500 text-white px-5 rounded-2xl hover:bg-yellow-600 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Save size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingN8N(true)}
                            className="bg-gray-100 text-gray-600 px-5 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-xs shrink-0 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Google Gemini */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <Zap size={20} />
                        </div>
                        <h5 className="font-bold text-gray-800 text-lg">Google Gemini AI</h5>
                      </div>
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
                                className={`w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono outline-none transition-all ${isEditingGemini ? 'ring-2 ring-blue-500 bg-white shadow-inner' : 'cursor-default'}`}
                                value={evolutionConfig.geminiApiKey}
                                onChange={(e) => setEvolutionConfig({ ...evolutionConfig, geminiApiKey: e.target.value })}
                              />
                            </div>
                            <button
                              onClick={() => isEditingGemini ? handleSaveEvolution() : setIsEditingGemini(true)}
                              className={`px-4 rounded-2xl transition-all font-bold text-xs flex items-center justify-center ${isEditingGemini ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {isEditingGemini ? <Save size={16} /> : <Edit3 size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* OpenAI */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Shield size={20} />
                        </div>
                        <h5 className="font-bold text-gray-800 text-lg">OpenAI (ChatGPT)</h5>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Chave API OpenAI</label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <input
                                type={isEditingOpenAI ? "text" : "password"}
                                placeholder="sk-proj-..."
                                disabled={!isEditingOpenAI}
                                className={`w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono outline-none transition-all ${isEditingOpenAI ? 'ring-2 ring-emerald-500 bg-white shadow-inner' : 'cursor-default'}`}
                                value={evolutionConfig.openaiApiKey || ''}
                                onChange={(e) => setEvolutionConfig({ ...evolutionConfig, openaiApiKey: e.target.value })}
                              />
                            </div>
                            <button
                              onClick={() => isEditingOpenAI ? handleSaveEvolution() : setIsEditingOpenAI(true)}
                              className={`px-4 rounded-2xl transition-all font-bold text-xs flex items-center justify-center ${isEditingOpenAI ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {isEditingOpenAI ? <Save size={16} /> : <Edit3 size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Segunda Coluna: R2 e Monitor */}
                  <div className="space-y-6">
                    {/* Cloudflare R2 */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                          <Database size={20} />
                        </div>
                        <h5 className="font-bold text-gray-800 text-lg">Cloudflare R2 Storage</h5>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Account ID</label>
                            <input
                              type="text"
                              disabled={!isEditingR2}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-mono outline-none ${isEditingR2 ? 'ring-2 ring-orange-500 bg-white' : 'cursor-default'}`}
                              value={evolutionConfig.r2AccountId}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2AccountId: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Bucket</label>
                            <input
                              type="text"
                              disabled={!isEditingR2}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-mono outline-none ${isEditingR2 ? 'ring-2 ring-orange-500 bg-white' : 'cursor-default'}`}
                              value={evolutionConfig.r2Bucket}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2Bucket: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Public URL</label>
                          <input
                            type="text"
                            disabled={!isEditingR2}
                            className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-mono outline-none ${isEditingR2 ? 'ring-2 ring-orange-500 bg-white' : 'cursor-default'}`}
                            value={evolutionConfig.r2PublicUrl}
                            onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2PublicUrl: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Key ID</label>
                            <input
                              type="text"
                              disabled={!isEditingR2}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-mono outline-none ${isEditingR2 ? 'ring-2 ring-orange-500 bg-white' : 'cursor-default'}`}
                              value={evolutionConfig.r2AccessKeyId}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2AccessKeyId: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Secret Access Key</label>
                            <input
                              type={isEditingR2 ? "text" : "password"}
                              disabled={!isEditingR2}
                              placeholder="Secret Access Key"
                              className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-mono outline-none ${isEditingR2 ? 'ring-2 ring-orange-500 bg-white' : 'cursor-default'}`}
                              value={evolutionConfig.r2SecretAccessKey}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2SecretAccessKey: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={() => isEditingR2 ? handleSaveEvolution() : setIsEditingR2(true)}
                            className={`flex-1 py-3 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-2 ${isEditingR2 ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {isEditingR2 ? <><Save size={16} /> SALVAR R2</> : <><Edit3 size={16} /> EDITAR R2</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Console / Monitor Area */}
                    <div className="bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-800 flex flex-col h-[400px]">
                      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Live Console</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (await confirm({
                                title: 'Limpar Monitor',
                                message: 'Deseja apagar todos os logs do monitor de webhooks?',
                                type: 'danger',
                                confirmText: 'Limpar Agora'
                              })) {
                                const snapshot = await getDocs(collection(db, "webhook_events"));
                                const batch = writeBatch(db);
                                snapshot.docs.forEach(d => batch.delete(d.ref));
                                await batch.commit();
                                setLastEvent(null);
                                notify("Logs removidos com sucesso.", "success");
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                            title="Limpar Logs"
                          >
                            <Trash2 size={14} />
                          </button>
                          {webhookListening && (
                            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto custom-scrollbar bg-[#0f172a]">
                        {lastEvent ? (
                          <div className="animate-in fade-in duration-500">
                            <div className="flex items-center gap-2 text-emerald-400 mb-4 text-[10px] font-bold bg-emerald-400/5 py-1 px-3 rounded-lg border border-emerald-400/10 w-fit">
                              <Activity size={10} />
                              EVENTO @ {lastEvent.timestamp}
                            </div>
                            <pre className="text-gray-300 leading-relaxed whitespace-pre-wrap selection:bg-blue-500/30">
                              {JSON.stringify(lastEvent, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-4 opacity-30">
                            <Webhook size={40} className={webhookListening ? 'animate-bounce' : ''} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center px-10">
                              Aguardando eventos...
                            </p>
                          </div>
                        )}
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

                    {/* R2 Automatic Cleanup */}
                    <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100 flex flex-col justify-between col-span-1 md:col-span-2">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-orange-600 mb-2">
                            <RefreshCw size={20} />
                            <h4 className="font-bold uppercase tracking-tight text-sm">Ciclo de Limpeza automática (R2)</h4>
                          </div>
                          <p className="text-xs text-orange-700 leading-relaxed max-w-2xl">
                            Defina o intervalo em dias para que os arquivos (áudios, imagens e PDFs) sejam removidos permanentemente do Cloudflare R2.
                            <br /><br />
                            <strong className="uppercase">⚠️ Aviso Importante:</strong> Esta limpeza apaga apenas os arquivos no storage (R2). As mensagens de texto no CRM e no WhatsApp permanecem intactas.
                          </p>
                        </div>

                        <div className="w-full md:w-64 bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ciclo de Limpeza (Dias)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={evolutionConfig.r2CleanupDays || 30}
                              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, r2CleanupDays: parseInt(e.target.value) })}
                              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-orange-600 outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-gray-400">DIAS</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col md:flex-row gap-4">
                        <button
                          onClick={handleSaveEvolution}
                          className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Save size={16} /> SALVAR CICLO DE LIMPEZA
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Deseja executar a limpeza manual do R2 agora seguindo a regra de dias configurada?")) return;
                            try {
                              const resp = await fetch('/api/r2-cleanup', { method: 'POST' });
                              const data = await resp.json();
                              alert(data.message || "Limpeza concluída!");
                            } catch (e) {
                              alert("Erro ao executar limpeza: " + e.message);
                            }
                          }}
                          className="px-8 bg-white text-orange-600 border border-orange-200 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-50 transition-all active:scale-95"
                        >
                          EXECUTAR AGORA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SEGURANÇA' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                        <Key size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Chaves de API</h3>
                        <p className="text-sm text-gray-500">Gerencie as chaves de acesso para a API ComVersa v1.0.0</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-10 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <input
                      type="text"
                      placeholder="Nome da chave (ex: Robô Vendas)"
                      className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus size={16} /> GERAR NOVA CHAVE
                    </button>
                  </div>

                  <div className="space-y-4">
                    {apiKeys.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                        Nenhuma chave gerada ainda
                      </div>
                    ) : (
                      apiKeys.map((k) => (
                        <div key={k.id} className="group flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:border-blue-200 hover:shadow-xl transition-all">
                          <div className="space-y-1">
                            <h5 className="font-black text-gray-800 uppercase tracking-tight">{k.name}</h5>
                            <div className="flex items-center gap-3">
                              <code className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 italic">
                                {k.key.substring(0, 6)}****************{k.key.substring(k.key.length - 4)}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(k.key);
                                  alert("Chave copiada!");
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Copiar Chave"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteApiKey(k.id)}
                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
