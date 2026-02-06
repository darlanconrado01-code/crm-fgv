
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import coreHandler from './api/core.js';
import aiHandler from './api/ai.js';
import n8nActionHandler from './api/n8n-action.js';
import r2CleanupHandler from './api/r2-cleanup.js';
import uploadR2Handler from './api/upload-r2.js';
import webhookHandler from './api/webhook.js';
import jarvisHandler from './api/jarvis.js';
import fs from 'fs';

const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be"
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('API Backend SDR 🚀 Online'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// FUNÇÃO PARA ENVIAR MENSAGEM VIA EVOLUTION OU N8N
async function sendMessage(chatId, text, settings) {
    try {
        let number = chatId;
        if (chatId.includes('@s.whatsapp.net')) {
            number = chatId.split('@')[0];
        }

        // DEBUG SETTINGS
        console.log(`[SEND] Settings found:`, Object.keys(settings));

        const apiKey = settings.apiKey;
        const evolutionUrl = settings.url || "https://evolution.canvazap.com.br";
        const instance = settings.instance;

        if (!apiKey || !instance) {
            console.error(`[SEND] Configurações de API incompletas:`, { apiKey: !!apiKey, instance: !!instance });
            return false;
        }

        const targetUrl = `${evolutionUrl}/message/sendText/${instance}`;

        const payload = {
            number: number,
            text: text,
            linkPreview: true
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[SEND] Erro Evolution: ${response.status}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error(`[SEND] Erro crítico:`, e);
        return false;
    }
}

// Helper to wrap Vercel-style handlers for Express
const wrap = (handler, params = {}) => async (req, res) => {
    // Em Express 5, req.query pode ser apenas um getter. Usamos defineProperty para sobrescrever.
    const mergedQuery = { ...(req.query || {}), ...(req.params || {}), ...params };
    Object.defineProperty(req, 'query', {
        value: mergedQuery,
        writable: true,
        configurable: true
    });
    try {
        await handler(req, res);
    } catch (e) {
        console.error(`[ROUTE ERROR]`, e);
        res.status(500).json({ status: 'error', error: e.message });
    }
};

// API ROUTES (MAPPED FROM /api FOLDER FOR LOCAL DEV)
app.all('/api/health', (req, res) => res.json({ status: 'ok' }));
app.all('/api/contacts', wrap(coreHandler, { resource: 'contacts' }));
app.all('/api/contacts/:id', wrap(coreHandler, { resource: 'contacts' }));
app.all('/api/messages', wrap(coreHandler, { resource: 'messages' }));
app.all('/api/messages/:id', wrap(coreHandler, { resource: 'messages' }));
app.all('/api/tickets', wrap(coreHandler, { resource: 'tickets' }));
app.all('/api/tickets/:id', wrap(coreHandler, { resource: 'tickets' }));
app.all('/api/agenda', wrap(coreHandler, { resource: 'agenda' }));
app.all('/api/agenda/:id', wrap(coreHandler, { resource: 'agenda' }));
app.all('/api/ai-agents', wrap(coreHandler, { resource: 'ai-agents' }));
app.all('/api/ai-agents/:id', wrap(coreHandler, { resource: 'ai-agents' }));
app.all('/api/core', wrap(coreHandler));

app.post('/api/send-message', wrap(coreHandler, { resource: 'send-message' }));
app.post('/api/send/:to', wrap(coreHandler, { resource: 'send-message' }));
app.post('/api/send/:type/:to', wrap(coreHandler, { resource: 'send-message' }));
app.post('/api/sync-profile', wrap(coreHandler, { resource: 'sync-profile' }));
app.post('/api/upload-r2', uploadR2Handler);
app.post('/api/transcribe', wrap(aiHandler, { action: 'transcribe' }));
app.post('/api/n8n-action', n8nActionHandler);
app.post('/api/r2-cleanup', r2CleanupHandler);
app.post('/api/evaluate-chat', wrap(aiHandler, { action: 'evaluate-chat' }));
app.post('/api/detect-appointment', wrap(aiHandler, { action: 'detect-appointment' }));
app.post('/api/deep-analysis', wrap(aiHandler, { action: 'deep-analysis' }));
app.post('/api/jarvis', jarvisHandler);

// MAPEAMENTO EXATO DOS CAMPOS DO SEU BANDO DE DADOS
const FIELD_MAP = {
    'cpf': 'field_1769078512483',
    'curso_interesse': 'field_1769078647289',
    'cidade': 'field_1769080214565',
    'estado': 'field_1769080430532',
    'qualificacao': 'field_1769081921057',
    'origem': 'field_1769081611283'
};

app.post('/receber-uzapi', (req, res, next) => {
    req.url = '/api/webhook';
    next();
});
app.post('/api/webhook', async (req, res) => {
    try {
        let bodySize = JSON.stringify(req.body || {}).length;
        console.log(`[WEBHOOK] Recebida requisição. Tamanho: ${(bodySize / 1024).toFixed(2)} KB`);

        // Log raw body to a file for deep inspection
        try {
            fs.appendFileSync('payloads_debug.log', `\n--- ${new Date().toISOString()} ---\n` + JSON.stringify(req.body, null, 2) + '\n');
        } catch (e) {
            console.error('[LOG] Erro ao salvar log de payload:', e);
        }

        let body = req.body;
        const payloads = Array.isArray(body) ? body : [body];

        console.log(`[WEBHOOK] Processando ${payloads.length} payloads.`);

        await Promise.all(payloads.map(async (rawPayload) => {
            try {
                let payload = rawPayload.data || rawPayload;

                // --- ADAPTER UZAPI ---
                if (payload.session && payload.sender && (payload.text || payload.type)) {
                    // (Mantendo a lógica existente de normalização UZAPI para garantir compatibilidade)
                    if (payload.isGroup) {
                        payload.remoteJid = payload.chatId;
                        payload.participant = payload.sender;
                    } else {
                        payload.remoteJid = payload.sender; // Em privados UZAPI, sender é o JID
                    }

                    if (!payload.key) payload.key = {};
                    payload.key.remoteJid = payload.remoteJid;
                    payload.key.id = payload.messageId;

                    if (payload.myPhone && payload.sender === payload.myPhone) {
                        payload.fromMe = true;
                        payload.key.fromMe = true;
                    }

                    if (!payload.message) {
                        if (payload.type === 'text') {
                            payload.message = { text: payload.text };
                        } else if (['image', 'video', 'audio', 'document'].includes(payload.type)) {
                            payload.messageType = payload.type;
                        }
                    }

                    if (!payload.pushName) payload.pushName = payload.name || payload.contactNameFromProfile;
                    if (!payload.avatarUrl && payload.contactProfilePic) {
                        payload.avatarUrl = payload.contactProfilePic;
                    }
                }
                // --- FIM ADAPTER UZAPI ---

                // --- NORMALIZAÇÃO INICIAL DO PAYLOAD ---
                const payloadData = rawPayload.data?.[0] || rawPayload.data || rawPayload;

                // O messageData deve ser o objeto que contém a 'key' e a 'message'
                // Alguns provedores mandam direto no data, outros dentro de data.message
                const messageData = payloadData.message ? payloadData : (payloadData.key ? payloadData : (payloadData.data?.message ? payloadData.data : payloadData));

                const finalEvent = rawPayload.event || rawPayload.eventType || payloadData.event || payloadData.eventType || 'messages.upsert';

                console.log(`[WEBHOOK] Processando Evento: ${finalEvent}`);

                const key = messageData.key || {};
                let remoteJid = key.remoteJid || payloadData.remoteJid || messageData.remoteJid;

                if (!remoteJid && messageData.extendedTextMessage) {
                    // Fallback para payloads "Bare" onde remoteJid pode estar fora da key ou em payloadData
                    remoteJid = payloadData.remoteJid;
                }

                if (!remoteJid) {
                    console.log(`[WEBHOOK] Ignorando payload sem remoteJid. Estrutura detectada:`, Object.keys(messageData));
                    return;
                }

                const remoteJidBase = remoteJid;
                console.log(`[WEBHOOK] RemoteJid: ${remoteJidBase}`);

                // --- CALL DETECTION ---
                if (finalEvent === 'call' || finalEvent === 'call.offer' || (payloadData && payloadData.status === 'offer')) {
                    const callData = payloadData;
                    const fromNumber = (callData.from || callData.remoteJid || "").split('@')[0];
                    await addDoc(collection(db, "notifications"), {
                        userId: "ALL",
                        title: "Chamada Recebida",
                        message: `Chamada de ${fromNumber}`,
                        type: "missed_call",
                        senderName: "Cliente",
                        senderPhone: fromNumber,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                    return;
                }

                // --- GROUP UPDATES ---
                if (finalEvent === 'groups.upsert' || finalEvent === 'group-update' || finalEvent === 'groups.update') {
                    const groupData = data || payload;
                    const groupId = (groupData.id || "").split('@')[0];
                    if (groupId) {
                        await setDoc(doc(db, "chats", groupId), {
                            id: groupId,
                            name: groupData.subject || groupData.name,
                            avatarUrl: groupData.imgUrl || groupData.avatarUrl || null,
                            isGroup: true,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                    return;
                }

                if (finalEvent !== 'messages.upsert' && finalEvent !== 'messages.update') return;

                const isFromMe = key.fromMe || payload.fromMe || false;
                const remoteJidAlt = messageData.remoteJidAlt || key.remoteJidAlt || payload.remoteJidAlt || "";

                // Verificação de Grupo
                const isGroup = remoteJidBase.includes('@g.us') || payload.isGroup || !!messageData.participant || !!payload.participant;

                let finalJid = remoteJidBase;
                if (!isGroup && remoteJidBase.includes('@lid') && remoteJidAlt) {
                    finalJid = remoteJidAlt;
                }

                let phone = finalJid.split('@')[0];
                const pushName = messageData.pushName || payload.pushName || 'Contato';

                // --- NORMALIZAÇÃO DE ID (55+... vs ...) ---
                if (!isGroup) {
                    const exactCheck = await getDoc(doc(db, "chats", phone));
                    if (!exactCheck.exists()) {
                        let altPhone = null;
                        if (phone.startsWith('55') && phone.length > 11) {
                            altPhone = phone.substring(2);
                        } else if (!phone.startsWith('55') && phone.length >= 10) {
                            altPhone = '55' + phone;
                        }

                        if (altPhone) {
                            const altCheck = await getDoc(doc(db, "chats", altPhone));
                            if (altCheck.exists()) {
                                console.log(`[NORMALIZE] Mesclando ${phone} em ${altPhone}`);
                                phone = altPhone;
                            }
                        }
                    }
                }

                // --- EXTRAÇÃO DE AVATARS ---
                let chatAvatarUrl = payload.groupAvatarUrl || null;
                let participantAvatarUrl = payload.avatarUrl || messageData.imgUrl || null;
                let finalAvatarUrl = isGroup ? chatAvatarUrl : participantAvatarUrl;

                // Fallback Avatar para privados (Evolution API)
                if (!finalAvatarUrl && !isGroup) {
                    // (Mantendo lógica existente de busca na Evolution se config existir - simplificado aqui)
                    // Se necessário, re-implementar a busca aqui ou confiar no cron
                }

                // --- NOME DO CHAT ---
                let chatDisplayName = pushName;
                if (isGroup) {
                    chatDisplayName = payload.subject || payload.groupName || messageData.subject || data?.subject || payload.subject;
                    if (!chatDisplayName) {
                        const existing = await getDoc(doc(db, "chats", phone));
                        if (existing.exists() && existing.data().name) chatDisplayName = existing.data().name;
                        else chatDisplayName = `Grupo ${phone.split('@')[0]}`;
                    }
                }

                // --- DATA EXTRACTION ---
                const getMsg = (m) => {
                    if (!m) return null;
                    if (typeof m === 'string') return m;
                    if (m.ephemeralMessage?.message) return getMsg(m.ephemeralMessage.message);
                    if (m.viewOnceMessage?.message) return getMsg(m.viewOnceMessage.message);
                    if (m.viewOnceMessageV2?.message) return getMsg(m.viewOnceMessageV2.message);
                    if (m.documentWithCaptionMessage?.message) return getMsg(m.documentWithCaptionMessage.message);

                    if (m.conversation) return m.conversation;
                    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
                    if (m.text) return m.text;

                    if (m.imageMessage?.caption) return m.imageMessage.caption;
                    if (m.videoMessage?.caption) return m.videoMessage.caption;
                    if (m.documentMessage?.caption) return m.documentMessage.caption;

                    return null;
                };

                // messageObject pode ser o messageData inteiro em alguns casos (Bare payloads)
                const messageObject = messageData.message || (messageData.extendedTextMessage ? messageData : payloadData.message) || {};
                const messageText = getMsg(messageObject) || 'Mídia enviada';

                console.log(`[WEBHOOK] Texto extraído (${messageText.length} chars) para ${phone}: ${messageText.substring(0, 50)}...`);

                // Limitar lastMessage para evitar estourar limite do documento no Firestore (1MB)
                const lastMessageForChat = messageText.length > 2000 ? messageText.substring(0, 2000) + '...' : messageText;

                // --- UPDATING FIRESTORE ---
                const chatRef = doc(db, "chats", phone);
                const contactRef = doc(db, "contacts", phone);

                const existingChatSnap = await getDoc(chatRef);
                const existingChat = existingChatSnap.exists() ? existingChatSnap.data() : null;

                const currentStatus = existingChat?.status || 'concluido';
                let newStatus = currentStatus;

                // Reabrir chat se nova msg e status 'concluido'
                if (!existingChat || ['concluido', 'resolvido'].includes(currentStatus)) {
                    newStatus = 'aguardando';
                }

                const newUnread = (existingChat?.unreadCount || 0) + 1;

                await setDoc(chatRef, {
                    id: phone,
                    name: chatDisplayName,
                    isGroup: !!isGroup,
                    remoteJid: remoteJidBase,
                    avatarUrl: finalAvatarUrl || existingChat?.avatarUrl || null,
                    updatedAt: serverTimestamp(),
                    lastMessage: lastMessageForChat,
                    status: newStatus,
                    unreadCount: newUnread
                }, { merge: true });

                await setDoc(contactRef, {
                    id: phone,
                    name: chatDisplayName,
                    isGroup: !!isGroup,
                    remoteJid: remoteJidBase,
                    avatarUrl: finalAvatarUrl || null,
                    updatedAt: serverTimestamp()
                }, { merge: true });

                const messageId = key.id || payload.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Identificar Tipo
                let type = payload.messageType || 'chat';
                if (messageObject.imageMessage) type = 'image';
                else if (messageObject.videoMessage) type = 'video';
                else if (messageObject.audioMessage) type = 'audio';
                else if (messageObject.documentMessage) type = 'document';
                else if (messageObject.stickerMessage) type = 'sticker';

                // Mídia Info
                let mediaUrl = payload.mediaUrl || null;
                let mimeType = payload.mimeType || null;
                let fileName = payload.fileName || null;

                if (type === 'image' && messageObject.imageMessage) {
                    mediaUrl = mediaUrl || messageObject.imageMessage.url;
                    mimeType = mimeType || messageObject.imageMessage.mimetype;
                } else if (type === 'video' && messageObject.videoMessage) {
                    mediaUrl = mediaUrl || messageObject.videoMessage.url;
                    mimeType = mimeType || messageObject.videoMessage.mimetype;
                } else if (type === 'audio' && messageObject.audioMessage) {
                    mediaUrl = mediaUrl || messageObject.audioMessage.url;
                    mimeType = mimeType || messageObject.audioMessage.mimetype;
                } else if (type === 'document' && messageObject.documentMessage) {
                    mediaUrl = mediaUrl || messageObject.documentMessage.url;
                    mimeType = mimeType || messageObject.documentMessage.mimetype;
                    fileName = fileName || messageObject.documentMessage.fileName;
                }

                await setDoc(doc(chatRef, "messages", messageId), {
                    text: messageText,
                    sender: isFromMe ? 'me' : phone,
                    participant: key.participant || payload.participant || null,
                    pushName: isFromMe ? 'Eu' : pushName,
                    avatarUrl: participantAvatarUrl,
                    timestamp: serverTimestamp(), // SERVER TIMESTAMP!
                    fromMe: isFromMe,
                    isGroup: !!isGroup,
                    messageId: messageId,
                    type: type,
                    mediaUrl: mediaUrl,
                    mimeType: mimeType,
                    fileName: fileName
                }, { merge: true });

                console.log(`[WEBHOOK] Msg salva: ${messageId} em chats/${phone}`);

            } catch (innerError) {
                console.error(`[WEBHOOK] Erro processando payload individual:`, innerError);
            }
        }));

        res.sendStatus(200);
    } catch (e) {
        console.error(`[WEBHOOK] ERRO CRÍTICO NO HANDLER:`, e);
        res.status(500).json({ status: 'error', error: e.message });
    }
});

// --- ROTINA DE LIMPEZA AUTOMÁTICA R2 (24h) ---
setInterval(async () => {
    console.log("[CLEANUP] Iniciando rotina automática de limpeza R2...");
    try {
        const mockRes = { status: () => ({ json: (data) => console.log("[CLEANUP] Resultado:", data), send: () => { } }) };
        const mockReq = {
            method: 'POST',
            headers: { authorization: `Bearer cv_vpdmp2uusecjze6w0vs6` }
        };
        await r2CleanupHandler(mockReq, mockRes);
    } catch (e) {
        console.error("[CLEANUP] Erro na limpeza automática:", e);
    }
}, 24 * 60 * 60 * 1000);
// ----------------------------------------------

// --- CRON DE SINCRONIZAÇÃO DE FOTOS (30s) ---
setInterval(async () => {
    try {
        // 1. Busca chats sem foto (avatarUrl == null ou vazio)
        const q = query(
            collection(db, "chats"),
            where("avatarUrl", "==", null),
            limit(5)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        console.log(`[CRON-PHOTO] Verificando ${snapshot.size} perfis sem foto...`);

        for (const chatDoc of snapshot.docs) {
            const phone = chatDoc.id;

            // Chamar o handler de sincronização que já temos
            const mockRes = {
                status: () => ({
                    json: (data) => {
                        if (!data) return;
                        if (data.status === 'not_found') {
                            setDoc(doc(db, "chats", phone), { avatarUrl: 'não existente' }, { merge: true });
                            console.log(`[CRON-PHOTO] ${phone}: Foto privada ou inexistente. Marcado.`);
                        } else if (data.status === 'success') {
                            console.log(`[CRON-PHOTO] ${phone}: Foto sincronizada com sucesso.`);
                        }
                    }, send: () => { }
                })
            };

            await coreHandler({
                method: 'POST',
                body: { phone },
                query: { resource: 'sync-profile' },
                headers: { authorization: `Bearer cv_vpdmp2uusecjze6w0vs6` }
            }, mockRes);
        }
    } catch (e) {
        console.error("[CRON-PHOTO] Erro na rotina:", e);
    }
}, 30000); // 30 segundos
// ----------------------------------------------

const PORT = process.env.PORT || 3021;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 WEBHOOK SDR ATIVO NA PORTA ${PORT}`));
