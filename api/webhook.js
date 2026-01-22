
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";

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

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            let payload = req.body;

            // Suporte a payloads envelopados (n8n ou layouts específicos)
            if (Array.isArray(payload) && payload.length > 0) payload = payload[0];
            if (payload.body) payload = payload.body;

            const { event, data } = payload;

            // Salvar para o monitor
            await addDoc(collection(db, "webhook_events"), {
                ...payload, // Garantir que salvamos o conteúdo real
                timestamp: serverTimestamp(),
                raw: req.body // Guardar o original completo para debug
            });

            if (event === 'messages.upsert') {
                // LÓGICA DE UNIFICAÇÃO DEFINITIVA
                const key = data.key || {};
                const remoteJidBase = key.remoteJid || "";
                const remoteJidAlt = key.remoteJidAlt || data.remoteJidAlt || payload.remoteJidAlt || "";

                // O ID real do chat deve ser o remoteJidAlt se ele existir e for um número real
                let finalJid = remoteJidBase;
                if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
                    finalJid = remoteJidAlt;
                } else if (remoteJidBase.includes('@lid') && remoteJidAlt) {
                    finalJid = remoteJidAlt;
                }

                const phone = finalJid.split('@')[0];
                const pushName = data.pushName || 'Contato';
                const fromMe = key.fromMe || false;

                // FUNÇÃO PARA EXTRAIR CONTEÚDO REAL (Lida com rascunhos, efêmeras, viewOnce, etc)
                const getMsgContent = (m) => {
                    if (!m) return null;
                    if (m.conversation) return { text: m.conversation, type: 'text' };
                    if (m.extendedTextMessage?.text) return { text: m.extendedTextMessage.text, type: 'text' };

                    if (m.imageMessage) return { ...m.imageMessage, type: 'image', text: m.imageMessage.caption || '📷 Foto' };
                    if (m.videoMessage) return { ...m.videoMessage, type: 'video', text: m.videoMessage.caption || '🎥 Vídeo' };
                    if (m.audioMessage) return { ...m.audioMessage, type: 'audio', text: '🎤 Áudio' };
                    if (m.documentMessage) return { ...m.documentMessage, type: 'document', text: m.documentMessage.title || m.documentMessage.fileName || '📄 Documento' };
                    if (m.stickerMessage) return { ...m.stickerMessage, type: 'sticker', text: 'Sticker' };

                    // Recursão para wrappers
                    if (m.viewOnceMessageV2?.message) return getMsgContent(m.viewOnceMessageV2.message);
                    if (m.viewOnceMessageV2Extension?.message) return getMsgContent(m.viewOnceMessageV2Extension.message);
                    if (m.ephemeralMessage?.message) return getMsgContent(m.ephemeralMessage.message);
                    if (m.documentWithCaptionMessage?.message) return getMsgContent(m.documentWithCaptionMessage.message);

                    return null;
                };

                const content = getMsgContent(data.message);

                let messageText = 'Mídia/Outro';
                let mediaUrl = '';
                let mimeType = '';
                let fileName = '';
                let msgType = 'text';

                if (content) {
                    messageText = content.text || '';
                    msgType = content.type || 'text';
                    mediaUrl = content.url || content.mediaUrl || content.base64 || '';
                    mimeType = content.mimetype || '';
                    fileName = content.fileName || content.title || '';
                }

                const chatRef = doc(db, "chats", phone);

                const chatDoc = await getDoc(chatRef);
                const isNewChat = !chatDoc.exists();
                let currentUnread = 0;
                let chatStatus = 'bot'; // Padrão

                if (!isNewChat) {
                    const existingData = chatDoc.data();
                    currentUnread = existingData.unreadCount || 0;
                    chatStatus = existingData.status || 'bot';
                }

                // Log Trace
                const logRef = await addDoc(collection(db, "webhook_events"), {
                    type: 'bot_trace',
                    phone, chatStatus, isNewChat, fromMe,
                    message: messageText,
                    timestamp: serverTimestamp()
                });

                // 1. Criar/Atualizar na coleção 'chats' (Para a lista de conversas ativas)
                await setDoc(chatRef, {
                    ...payload,
                    ...data,
                    id: phone,
                    phone: phone,
                    remoteJid: remoteJidBase,
                    remoteJidAlt: remoteJidAlt,
                    name: pushName,
                    lastMessage: messageText,
                    updatedAt: serverTimestamp(),
                    unreadCount: fromMe ? 0 : (currentUnread + 1),
                    status: chatStatus
                }, { merge: true });

                // 2. Criar/Atualizar na coleção 'contacts' (Base de contatos permanente)
                const contactRef = doc(db, "contacts", phone);
                await setDoc(contactRef, {
                    id: phone,
                    phone: phone,
                    name: pushName,
                    remoteJid: remoteJidBase,
                    remoteJidAlt: remoteJidAlt,
                    lastMessage: messageText,
                    lastInteraction: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                // 3. Salvar Mensagem na sub-coleção do chat (SALVAR ANTES DO BOT)
                await addDoc(collection(chatRef, "messages"), {
                    ...data,
                    text: messageText,
                    mediaUrl: mediaUrl,
                    mimeType: mimeType,
                    fileName: fileName,
                    messageType: msgType,
                    sender: phone,
                    pushName: pushName,
                    fromMe: fromMe,
                    timestamp: serverTimestamp(),
                    type: msgType
                });

                // LÓGICA DE BOT (Ativa se status for 'bot' e não for enviado por mim)
                if (chatStatus === 'bot' && !fromMe) {
                    try {
                        const botQuery = query(
                            collection(db, "ai_agents"),
                            where("isFirstContact", "==", true),
                            where("status", "==", "active"),
                            limit(1)
                        );
                        const botSnap = await getDocs(botQuery);

                        if (!botSnap.empty) {
                            const bot = botSnap.docs[0].data();
                            const settingsSnap = await getDoc(doc(db, "settings", "evolution"));
                            const settings = settingsSnap.exists() ? settingsSnap.data() : {};
                            const openaiKey = settings.openaiApiKey;
                            const instanceName = settings.instance;

                            // --- ESTRATÉGIA DE AGRUPAMENTO (DEBOUNCE) ---
                            // 1. Esperar alguns segundos para ver se o usuário manda mais mensagens
                            console.log(`--- AGUARDANDO 7 SEGUNDOS PARA AGRUPAR MENSAGENS DE ${phone} ---`);
                            await new Promise(resolve => setTimeout(resolve, 7000));

                            // 2. Verificar se esta ainda é a ÚLTIMA mensagem recebida
                            const lastMsgQuery = query(
                                collection(chatRef, "messages"),
                                orderBy("timestamp", "desc"),
                                limit(1)
                            );
                            const lastMsgSnap = await getDocs(lastMsgQuery);
                            const realLastMsg = lastMsgSnap.docs[0]?.data();

                            // Comparamos o texto ou o timestamp aproximado. 
                            // Se chegou uma mensagem nova (não enviada pelo bot), abortamos esta execução silenciosamente.
                            // A execução da ULTIMA mensagem será a que vai responder.
                            if (realLastMsg && !realLastMsg.fromMe && !realLastMsg.isBot && realLastMsg.text !== messageText) {
                                console.log("--- NOVA MENSAGEM DETECTADA. ABORTANDO EXECUÇÃO ANTIGA PARA EVITAR DUPLICIDADE ---");
                                return res.status(200).json({ status: 'deferred' });
                            }

                            // BUSCAR HISTÓRICO (Já incluirá as mensagens agrupadas que acabaram de chegar)
                            const msgQuery = query(
                                collection(chatRef, "messages"),
                                orderBy("timestamp", "desc"),
                                limit(15)
                            );
                            const msgSnap = await getDocs(msgQuery);
                            const history = msgSnap.docs
                                .map(d => ({
                                    role: (d.data().fromMe || d.data().isBot) ? 'assistant' : 'user',
                                    content: d.data().text || ''
                                }))
                                .filter(m => m.content)
                                .reverse();

                            if (openaiKey) {
                                console.log("--- SOLICITANDO OPENAI COM HISTÓRICO ---");
                                const systemPrompt = `Você é um assistente virtual profissional da ISAN/FGV.
REGRAS:
1. Se o histórico mostrar que você já se apresentou, NÃO se apresente novamente.
2. Responda diretamente à dúvida do cliente.
3. Seja curto, natural e profissional.
4. Use o contexto abaixo para guiar suas respostas.

INSTRUÇÕES DO ROBÔ: ${bot.prompt}
BASE DE CONHECIMENTO: ${bot.knowledgeBase}`;

                                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${openaiKey}`
                                    },
                                    body: JSON.stringify({
                                        model: bot.modelId || 'gpt-4o-mini',
                                        messages: [
                                            { role: 'system', content: systemPrompt },
                                            ...history,
                                            { role: 'user', content: messageText }
                                        ],
                                        max_tokens: 500
                                    })
                                });

                                const aiData = await response.json();
                                const aiText = aiData.choices?.[0]?.message?.content;

                                if (aiText) {
                                    const n8nUrl = settings.n8nSendUrl;
                                    if (n8nUrl) {
                                        // CORREÇÃO PAYLOAD N8N (PADRÃO TELEFONE/NOME/MENSAGEM)
                                        const n8nRes = await fetch(n8nUrl, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                telefone: phone,
                                                nome: bot.name || "Bot FGV",
                                                mensagem: aiText,
                                                instance: instanceName,
                                                isBot: true
                                            })
                                        });

                                        const n8nText = await n8nRes.text();
                                        await setDoc(logRef, { n8n_status: n8nRes.status, n8n_response_raw: n8nText }, { merge: true });

                                        await addDoc(collection(chatRef, "messages"), {
                                            text: aiText,
                                            sender: bot.name || "Bot",
                                            fromMe: true,
                                            isBot: true,
                                            timestamp: serverTimestamp(),
                                            type: 'text'
                                        });

                                        await setDoc(chatRef, {
                                            lastMessage: aiText,
                                            updatedAt: serverTimestamp(),
                                            status: 'bot'
                                        }, { merge: true });

                                        await setDoc(logRef, { bot_responded: true, ai_text: aiText }, { merge: true });
                                    }
                                }
                            } else {
                                await setDoc(logRef, { error: 'Missing OpenAI Key' }, { merge: true });
                            }
                        } else {
                            await setDoc(logRef, { error: 'No active First Contact bot found' }, { merge: true });
                        }
                    } catch (botError) {
                        await setDoc(logRef, { error: botError.message }, { merge: true });
                        console.error("Erro no fluxo do Robô:", botError);
                    }
                }
            }

            return res.status(200).json({ status: 'success' });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    } else {
        return res.status(200).json({ message: "Webhook active" });
    }
}
