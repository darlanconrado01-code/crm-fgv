
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, addDoc, deleteDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const VALID_TOKEN = "cv_vpdmp2uusecjze6w0vs6";

function checkAuth(req) {
    const authHeader = req.headers.authorization;
    // console.log("[AUTH DEBUG] Header:", authHeader);
    if (!authHeader) {
        console.log("[AUTH ERROR] Missing Authorization Header");
        return false;
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const isValid = token === VALID_TOKEN;
    if (!isValid) console.log(`[AUTH ERROR] Invalid Token: '${token}' vs Expected '${VALID_TOKEN}'`);
    return isValid;
}

export default async function handler(req, res) {
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    }

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!checkAuth(req)) return res.status(401).json({ error: "Unauthorized" });

    const { resource, id, chatId, phone, to, action: queryAction } = req.query || {};
    const body = req.body || {};
    const action = queryAction || body.action;

    try {
        // --- CONTACTS ---
        if (resource === 'contacts') {
            if (req.method === 'GET') {
                if (id) {
                    const snap = await getDoc(doc(db, "contacts", id));
                    if (!snap.exists()) return res.status(404).json({ error: "Contato não encontrado." });
                    return res.status(200).json({ id: snap.id, ...snap.data() });
                } else {
                    const q = query(collection(db, "contacts"), orderBy("updatedAt", "desc"), limit(200));
                    const snap = await getDocs(q);
                    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }
            if (req.method === 'POST' || req.method === 'PUT') {
                const targetId = id || body.id || body.phone;
                if (!targetId) return res.status(400).json({ error: "ID is required" });
                await setDoc(doc(db, "contacts", targetId), { ...body, updatedAt: serverTimestamp() }, { merge: true });
                return res.status(200).json({ status: 'success', id: targetId });
            }
        }

        // --- MESSAGES ---
        if (resource === 'messages') {
            if (req.method === 'GET') {
                if (chatId) {
                    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "desc"), limit(50));
                    const snap = await getDocs(q);
                    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                } else {
                    const q = query(collection(db, "webhook_events"), orderBy("timestamp", "desc"), limit(50));
                    const snap = await getDocs(q);
                    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }
        }

        // --- TICKETS (Chats) ---
        if (resource === 'tickets') {
            if (req.method === 'GET') {
                if (id) {
                    const snap = await getDoc(doc(db, "chats", id));
                    if (!snap.exists()) return res.status(404).json({ error: "Ticket not found" });
                    return res.status(200).json({ id: snap.id, ...snap.data() });
                } else {
                    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"), limit(100));
                    const snap = await getDocs(q);
                    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }
            if (req.method === 'PUT') {
                const targetId = id || body.id;
                if (!targetId) return res.status(400).json({ error: "ID is required" });
                await setDoc(doc(db, "chats", targetId), { ...body, updatedAt: serverTimestamp() }, { merge: true });
                return res.status(200).json({ status: 'success' });
            }
        }

        // --- AGENDA ---
        if (resource === 'agenda') {
            if (req.method === 'GET') {
                const q = query(collection(db, "agenda_events"), orderBy("startDate", "desc"), limit(100));
                const snap = await getDocs(q);
                return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            if (req.method === 'POST') {
                const docRef = await addDoc(collection(db, "agenda_events"), { ...body, createdAt: serverTimestamp() });
                return res.status(201).json({ status: 'success', id: docRef.id });
            }
            if (req.method === 'DELETE') {
                if (!id) return res.status(400).json({ error: "ID is required" });
                await deleteDoc(doc(db, "agenda_events", id));
                return res.status(200).json({ status: 'success' });
            }
        }

        // --- AI AGENTS (Personas/Agentes) ---
        if (resource === 'ai-agents' || resource === 'ai-agent') {
            if (req.method === 'GET') {
                try {
                    if (id) {
                        const snap = await getDoc(doc(db, "ai_agents", id));
                        if (!snap.exists()) return res.status(404).json({ error: "Agente não encontrado." });
                        return res.status(200).json({ id: snap.id, ...snap.data() });
                    } else {
                        // Busca todos os agentes cadastrados
                        const q = query(collection(db, "ai_agents"));
                        const snap = await getDocs(q);
                        const agents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        console.log(`[API] Retornando ${agents.length} agentes para o n8n.`);
                        return res.status(200).json(agents);
                    }
                } catch (err) {
                    console.error("[API] Erro ao buscar agentes:", err);
                    return res.status(500).json({ error: err.message });
                }
            }
        }

        // --- SEND MESSAGE ---
        if (resource === 'send-message' || to) {
            const { text: bodyText, contactName, type: bodyType, isMedia: bodyIsMedia, quoted, caption } = body;
            const targetChatId = chatId || body.chatId || to;
            let type = bodyType || 'chat';
            let isMedia = bodyIsMedia || (type !== 'chat' && type !== 'text');
            const text = bodyText || body.message;

            if (!targetChatId) return res.status(400).json({ error: "chatId is required" });

            const configDoc = await getDoc(doc(db, "settings", "evolution"));
            const config = configDoc.exists() ? configDoc.data() : {};
            if (!config.url || !config.instance || !config.apiKey) throw new Error('Configuração Evolution incompleta.');

            let number = targetChatId;
            if (targetChatId.includes('@')) {
                number = targetChatId; // Mantém JID completo se já estiver presente (@s.whatsapp.net ou @g.us)
            } else {
                number = targetChatId; // Fallback
            }

            let targetUrl = `${config.url}/message/sendText/${config.instance}`;
            let evBody = {};

            // DETECT PROVDER: UZAPI
            if (config.url.includes('uzapi')) {
                // UZAPI espera apenas apenas números (sem sufixo) para endpoints de envio simples
                const cleanNumber = number.replace('@s.whatsapp.net', '').replace('@g.us', '');

                // Mapeamento de Payload conforme documentação UZAPI
                if (type === 'text' || type === 'chat') {
                    targetUrl = `${config.url}/sendText`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        text: text
                    };
                } else if (type === 'image') {
                    targetUrl = `${config.url}/sendImage`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        path: text, // UZAPI usa 'path' para a URL da mídia
                        caption: caption || ""
                    };
                } else if (type === 'audio') {
                    // Decide entre sendAudio (url) ou sendAudio64 (base64)
                    // Se 'text' começar com 'data:audio', é base64
                    if (text.startsWith('data:')) {
                        targetUrl = `${config.url}/sendAudio64`;
                        evBody = {
                            session: config.instance,
                            number: cleanNumber,
                            path: text.split(',')[1], // Remove prefixo data:audio...
                            caption: caption || ""
                        };
                    } else {
                        targetUrl = `${config.url}/sendAudio`;
                        evBody = {
                            session: config.instance,
                            number: cleanNumber,
                            path: text,
                            caption: caption || ""
                        };
                    }
                } else if (type === 'video') {
                    targetUrl = `${config.url}/sendVideo`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        path: text,
                        caption: caption || ""
                    };
                } else if (type === 'document' || type === 'file') {
                    targetUrl = `${config.url}/sendFile`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        path: text,
                        caption: caption || "arquivo"
                    };
                } else if (type === 'contact') {
                    targetUrl = `${config.url}/sendContact`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        name: caption || "Contato",
                        contact: text // Assumindo que 'text' carrega o número do contato a ser enviado
                    };
                } else if (type === 'location') {
                    targetUrl = `${config.url}/sendLocation`;
                    // Para location, o 'text' precisaria vir parseado ou vir de campos separados no body
                    // Vamos tentar extrair de 'body' se disponível, senão fallback
                    const lat = body.lat || 0;
                    const log = body.log || 0;
                    const title = body.title || "Localização";
                    const desc = body.description || "";

                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        lat: lat,
                        log: log,
                        title: title,
                        description: desc
                    };
                } else {
                    // Fallback para texto se tipo desconhecido
                    targetUrl = `${config.url}/sendText`;
                    evBody = {
                        session: config.instance,
                        number: cleanNumber,
                        text: text
                    };
                }
            } else {
                // DEFAULT: EVOLUTION API
                evBody = {
                    number,
                    text,
                    delay: 1200,
                    linkPreview: true,
                    quoted: quoted ? {
                        key: {
                            id: quoted.id,
                            fromMe: quoted.fromMe,
                            remoteJid: quoted.remoteJid || targetChatId
                        },
                        message: {
                            conversation: quoted.text || ""
                        }
                    } : undefined
                };

                if (isMedia) {
                    targetUrl = `${config.url}/message/sendMedia/${config.instance}`;
                    evBody = {
                        number,
                        media: text,
                        mediatype: type,
                        fileName: text.split('/').pop(),
                        caption: caption || "",
                        quoted: quoted ? {
                            key: {
                                id: quoted.id,
                                fromMe: quoted.fromMe,
                                remoteJid: quoted.remoteJid || targetChatId
                            }
                        } : undefined,
                        ptt: type === 'audio'
                    };
                }
            }

            console.log(`[API] Sending to ${targetUrl} (Provider: ${config.url.includes('uzapi') ? 'UZAPI' : 'EVOLUTION'})`);

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.apiKey,
                    'sessionkey': config.apiKey,
                    'Authorization': `Bearer ${config.apiKey}`,
                    'token': config.apiKey
                },
                body: JSON.stringify(evBody)
            });

            const responseText = await response.text();
            console.log(`[API] Response (${response.status}):`, responseText);

            let result = {};
            try { result = JSON.parse(responseText); } catch (e) { }

            if (!response.ok) return res.status(response.status).json({ status: 'error', message: result.message || result.error || responseText || 'Erro API Externa' });

            // Sync Firestore
            // Para UZAPI, o ID pode vir diferente. Vamos tentar capturar
            const messageId = result.key?.id || result.id || result.messageId || `sent_${Date.now()}`;
            const phoneStr = targetChatId.includes('@g.us') ? targetChatId : targetChatId.split('@')[0];
            const finalDisplayChatText = isMedia ? (caption || 'Mídia') : text;

            await setDoc(doc(db, "chats", phoneStr, "messages", messageId), {
                text: finalDisplayChatText,
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type,
                messageId,
                mediaUrl: isMedia ? text : null,
                quoted: quoted || null
            }, { merge: true });

            // Prepare chat update object
            const chatUpdate = {
                lastMessage: finalDisplayChatText,
                updatedAt: serverTimestamp(),
                unreadCount: 0
            };
            if (body.agent) chatUpdate.agent = body.agent; // Assign agent if provided (User initiated)

            await setDoc(doc(db, "chats", phoneStr), chatUpdate, { merge: true });

            return res.status(200).json({ status: 'success', data: result });
        }

        // --- ACTIONS (Reaction, Delete, etc) ---
        if (action === 'reaction' || action === 'delete-message') {
            const configDoc = await getDoc(doc(db, "settings", "evolution"));
            const config = configDoc.exists() ? configDoc.data() : {};
            if (!config.url || !config.instance || !config.apiKey) throw new Error('Configuração Evolution incompleta.');

            const targetChatId = chatId || body.chatId;
            const messageId = body.messageId;
            const fromMe = body.fromMe;

            // Enviar para N8N se houver URL configurada, senão vai direto para Evolution
            if (action === 'reaction') {
                if (config.n8nReactionUrl) {
                    await fetch(config.n8nReactionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instanceName: config.instance,
                            chatId: targetChatId,
                            messageId: messageId,
                            fromMe: fromMe,
                            reaction: body.reaction
                        })
                    });
                    return res.status(200).json({ status: 'success', target: 'n8n' });
                }

                const targetUrl = `${config.url}/message/sendReaction/${config.instance}`;
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
                    body: JSON.stringify({
                        number: targetChatId,
                        reaction: body.reaction,
                        key: { id: messageId, fromMe: fromMe, remoteJid: targetChatId }
                    })
                });
                if (!response.ok) throw new Error('Erro ao enviar reação');
                return res.status(200).json({ status: 'success' });
            }

            if (action === 'delete-message') {
                if (config.n8nDeleteUrl) {
                    await fetch(config.n8nDeleteUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instanceName: config.instance,
                            chatId: targetChatId,
                            messageId: messageId,
                            fromMe: fromMe
                        })
                    });
                    // Também apaga do Firestore local
                    const phoneStr = targetChatId.includes('@g.us') ? targetChatId : targetChatId.split('@')[0];
                    await deleteDoc(doc(db, "chats", phoneStr, "messages", messageId));
                    return res.status(200).json({ status: 'success', target: 'n8n' });
                }

                const targetUrl = `${config.url}/message/deleteMessage/${config.instance}`;
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
                    body: JSON.stringify({
                        number: targetChatId,
                        key: { id: messageId, fromMe: fromMe, remoteJid: targetChatId }
                    })
                });
                if (!response.ok) throw new Error('Erro ao apagar mensagem');

                const phoneStr = targetChatId.includes('@g.us') ? targetChatId : targetChatId.split('@')[0];
                await deleteDoc(doc(db, "chats", phoneStr, "messages", messageId));
                return res.status(200).json({ status: 'success' });
            }
        }

        // --- SYNC PROFILE ---
        if (resource === 'sync-profile' || action === 'sync-profile') {
            const targetPhone = phone || body.phone || body.chatId;
            if (!targetPhone) throw new Error("Telefone não fornecido.");

            const configDoc = await getDoc(doc(db, "settings", "evolution"));
            const settings = configDoc.exists() ? configDoc.data() : {};
            if (!settings.url || !settings.instance || !settings.apiKey) throw new Error("Configuração Evolution não encontrada.");

            const cleanPhone = targetPhone.split('@')[0];
            const jid = `${cleanPhone}@s.whatsapp.net`;

            // Try multiple endpoints
            const endpoints = [
                { url: `${settings.url}/chat/fetchProfile/${settings.instance}`, body: { number: cleanPhone } },
                { url: `${settings.url}/chat/fetchProfile/${settings.instance}`, body: { number: jid } },
                { url: `${settings.url}/chat/fetchProfilePicture/${settings.instance}`, body: { number: jid } },
                { url: `${settings.url}/chat/fetchProfilePictureUrl/${settings.instance}`, body: { number: cleanPhone } }
            ];

            let avatarUrl = null;
            for (const ep of endpoints) {
                try {
                    const r = await fetch(ep.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': settings.apiKey.trim() },
                        body: JSON.stringify(ep.body)
                    });
                    const d = await r.json();
                    avatarUrl = (d.data && d.data.picture) || d.picture || d.profilePictureUrl || (d.data && d.data.profilePictureUrl) || null;
                    if (avatarUrl) break;
                } catch (e) { }
            }

            if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
                await setDoc(doc(db, "contacts", cleanPhone), { avatarUrl }, { merge: true });
                await setDoc(doc(db, "chats", cleanPhone), { avatarUrl }, { merge: true });
                return res.status(200).json({ status: 'success', avatarUrl });
            }
            return res.status(200).json({ status: 'not_found' });
        }

        // --- SEND AUDIO VIA N8N ---
        if (resource === 'send-audio-n8n') {
            const { base64, phone, fromMe } = body;

            if (!base64 || !phone) return res.status(400).json({ error: "Dados incompletos" });

            // Buscar configuração do banco
            const configDoc = await getDoc(doc(db, "settings", "evolution"));
            const config = configDoc.exists() ? configDoc.data() : {};
            const n8nUrl = config.n8nAudioUrl || "https://n8n.canvazap.com.br/webhook/b72fc442-628a-4663-8be9-1fc40f3ceb9f";

            // Salvar no Firestore PRIMEIRO para aparecer na tela imediatamente (UI Optimistic)
            const messageId = `n8n_${Date.now()}`;
            const phoneStr = phone.includes('@g.us') ? phone : phone.split('@')[0];

            await setDoc(doc(db, "chats", phoneStr, "messages", messageId), {
                text: "Áudio enviado",
                fromMe: true,
                sender: 'me',
                timestamp: serverTimestamp(),
                type: 'audio',
                messageId,
                mediaUrl: `data:audio/ogg;base64,${base64}`,
                mimeType: 'audio/ogg;codecs=opus'
            }, { merge: true });

            await setDoc(doc(db, "chats", phoneStr), {
                lastMessage: "🎵 Áudio enviado",
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Promises array for parallel execution (Background)
            const promises = [];

            // 1. Enviar para n8n
            promises.push(fetch(n8nUrl.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: { base64 },
                    number: phone,
                    chatId: phone,
                    fromMe
                })
            }).then(async (res) => {
                const status = res.ok ? 'success' : 'error';
                await addDoc(collection(db, "webhook_events"), {
                    type: 'outgoing_n8n_audio',
                    status: status,
                    details: `Status N8N: ${res.status} - ${res.statusText}`,
                    url: n8nUrl,
                    phone: phone,
                    timestamp: serverTimestamp()
                });
            }).catch(async (e) => {
                console.error("Erro no envio para n8n:", e);
                await addDoc(collection(db, "webhook_events"), {
                    type: 'outgoing_n8n_audio',
                    status: 'error',
                    details: `Erro de Conexão: ${e.message}`,
                    url: n8nUrl,
                    phone: phone,
                    timestamp: serverTimestamp()
                });
            }));

            // 2. Enviar para Evolution API
            if (config.url && config.instance && config.apiKey) {
                const targetUrl = `${config.url}/message/sendMedia/${config.instance}`;
                const dataUri = base64.startsWith('data:') ? base64 : `data:audio/ogg;base64,${base64}`;

                promises.push(fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
                    body: JSON.stringify({
                        number: phone,
                        media: dataUri,
                        mediatype: "audio",
                        ptt: true,
                        fileName: "audio-msg.ogg"
                    })
                }).catch(e => console.error("Erro no envio para Evolution:", e)));
            }

            // Aguardar APIs externas sem bloquear a UI (pois o retorno 200 pro front libera o loading)
            // Mas precisamos aguardar o Vercel não matar a função
            await Promise.all(promises);

            return res.status(200).json({ status: 'success', messageId });
        }

        return res.status(404).json({ error: "Resource not found or method not allowed" });

    } catch (e) {
        console.error("CRITICAL API ERROR:", e);
        return res.status(500).json({
            error: e.message,
            stack: e.stack,
            details: "Check backend terminal for full logs"
        });
    }
}
