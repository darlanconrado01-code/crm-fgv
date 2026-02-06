
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc, getDocs, query, where, limit, orderBy, updateDoc } from "firebase/firestore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    if (req.method !== 'POST') {
        return res.status(200).json({ message: "Webhook active" });
    }

    try {
        let body = req.body;

        // Suporte a payloads envelopados ou arrays do n8n
        if (Array.isArray(body)) body = body[0];

        // SUPORTE UZAPI RAW (Se vier direto "body" dentro do body)
        if (body.body && typeof body.body === 'object') {
            body = body.body;
        } else if (body.body && typeof body.body === 'string') {
            try { body = JSON.parse(body.body); } catch (e) { }
        }

        const payload = body.data || body;

        // ADAPTER UZAPI -------------------------------------------------------------------------
        // Verifica se é o formato da UZAPI e normaliza para o padrão do nosso sistema
        if (payload.session && payload.sender && (payload.text || payload.type)) {
            console.log("[WEBHOOK] Payload UZAPI detectado, normalizando...");

            // 1. Identificação do Chat (RemoteJid)
            if (payload.isGroup) {
                // Em grupos, o chatId é o JID do grupo
                payload.remoteJid = payload.chatId;
                // E o sender é o participante
                payload.participant = payload.sender;
            } else {
                // Em privados, o sender é o próprio remoteJid (contato)
                payload.remoteJid = payload.sender;
            }

            // 2. Mensagem e ID
            // Se já não tiver uma estrutura de key/message, criamos simulada para o resto do código
            if (!payload.key) payload.key = {};
            payload.key.remoteJid = payload.remoteJid;
            payload.key.id = payload.messageId; // Usa o ID da UZAPI

            // FromMe logic
            if (payload.myPhone && payload.sender === payload.myPhone) {
                payload.fromMe = true;
                payload.key.fromMe = true;
            }

            // 3. Conteúdo da Mensagem
            // O código abaixo espera 'message' como objeto ou string. Vamos estruturar.
            if (!payload.message) {
                if (payload.type === 'text') {
                    payload.message = { text: payload.text };
                } else if (payload.type === 'image' || payload.type === 'video' || payload.type === 'audio' || payload.type === 'document') {
                    // Se for mídia, passamos propriedades que o código lá embaixo espera (mediaUrl, etc)
                    // Mas o código lá embaixo olha 'payload.mediaUrl' também.
                    // Vamos garantir que 'messageType' esteja setado
                    payload.messageType = payload.type;
                }
            }

            // 4. Metadados do Contato
            if (!payload.pushName) payload.pushName = payload.name || payload.contactNameFromProfile;

            // Foto: O código lá embaixo olha payload.avatarUrl ou messageData.imgUrl
            if (!payload.avatarUrl && payload.contactProfilePic) {
                payload.avatarUrl = payload.contactProfilePic;
            }
        }
        // FIM ADAPTER UZAPI ---------------------------------------------------------------------
        const data = payload;
        const messageData = payload.message || payload;
        const key = payload.key || (payload.data && payload.data.key) || {};

        // Identificação do JID (ID da conversa)
        const remoteJidBase = payload.remoteJid || payload.chatId || key.remoteJid || data?.key?.remoteJid || messageData.key?.remoteJid;

        if (!remoteJidBase) {
            return res.status(200).json({ status: 'ignored', message: 'No remoteJid found' });
        }

        const { event, event_type } = payload;
        const finalEvent = event || event_type;

        // Se tiver remoteJid e mensagem (ou apenas remoteJid no push manual), consideramos um evento válido
        const isManualPush = !!remoteJidBase;

        // 1. TRATAMENTO DE ATUALIZAÇÃO DE GRUPOS (Metadata)
        if (['groups.upsert', 'group-update', 'groups.update'].includes(finalEvent)) {
            const groupData = data || payload;
            const groupId = (groupData.id || groupData.remoteJid || "").split('@')[0] + '@g.us';
            if (groupId) {
                await setDoc(doc(db, "chats", groupId), {
                    id: groupId,
                    name: groupData.subject || groupData.name,
                    avatarUrl: groupData.imgUrl || groupData.avatarUrl || null,
                    isGroup: true,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                return res.status(200).json({ status: 'group_updated' });
            }
        }

        // Filtro: Apenas mensagens recebidas (ignora mensagens enviadas por nós)
        const isFromMe = key.fromMe || payload.fromMe || false;
        // if (isFromMe) return res.status(200).json({ status: 'is_from_me' }); // REMOVIDO PARA SUPORTE A SYNC VIA CELULAR

        // Validação Permissiva: Se for manual do n8n ou um evento oficial de mensagem
        if (!isManualPush && finalEvent !== 'messages.upsert' && finalEvent !== 'messages.update') {
            return res.status(200).json({ status: 'ignored_event' });
        }

        // Identificação Extra (ID de LID para número real)
        const remoteJidAlt = messageData.remoteJidAlt || key.remoteJidAlt || payload.remoteJidAlt || "";

        // Verifica se é grupo (Suporte explícito ao campo isGroup vindo do n8n)
        const isGroup = payload.isGroup === true || payload.isGroup === 'true' || remoteJidBase.includes('@g.us') || !!messageData.participant || !!payload.participant;

        let finalJid = remoteJidBase;
        if (!isGroup && remoteJidBase.includes('@lid') && remoteJidAlt) {
            finalJid = remoteJidAlt;
        }

        // Definição do ID do documento (phone)
        let phone = isGroup ? finalJid : finalJid.split('@')[0];
        const pushName = payload.pushName || messageData.pushName || 'Contato';

        // Inteligência de Relacionamento (LID -> Contato Real)
        if (!isGroup && remoteJidBase.includes('@lid')) {
            const q = query(collection(db, "contacts"), where("remoteJid", "==", remoteJidBase));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
                phone = qSnap.docs[0].id;
            }
        }

        // FOTO DE PERFIL (Grupo vs Participante)
        let chatAvatarUrl = payload.groupAvatarUrl || null;
        let participantAvatarUrl = payload.avatarUrl || messageData.imgUrl || null;
        let finalAvatarUrl = isGroup ? chatAvatarUrl : participantAvatarUrl;

        // Nome do Chat
        let chatDisplayName = pushName;
        if (isGroup) {
            chatDisplayName = payload.subject || payload.groupName || messageData.subject || data?.subject || "Grupo";
            // Buscar nome salvo se não vier no payload
            if (!chatDisplayName || chatDisplayName === "Grupo") {
                const existingChat = await getDoc(doc(db, "chats", phone));
                if (existingChat.exists() && existingChat.data().name) {
                    chatDisplayName = existingChat.data().name;
                }
            }
        }

        // Conteúdo da Mensagem - Extração Profunda
        const messageObject = messageData.message || payload.message || {};
        const getMsgText = (m) => {
            if (!m) return null;
            if (typeof m === 'string') return m;
            return m.conversation || m.extendedTextMessage?.text || m.text || m.imageMessage?.caption || m.videoMessage?.caption || null;
        };
        const messageText = getMsgText(messageObject) || (payload.text) || 'Mídia enviada';

        // Identificar tipo de mensagem
        let type = payload.messageType || payload.type || 'chat';
        if (messageObject.imageMessage) type = 'image';
        else if (messageObject.videoMessage) type = 'video';
        else if (messageObject.audioMessage) type = 'audio';
        else if (messageObject.documentMessage) type = 'document';
        else if (messageObject.stickerMessage) type = 'sticker';
        else if (messageObject.extendedTextMessage) type = 'chat';

        // Contexto de Resposta (Quoted Message)
        let quoted = null;
        const contextInfo = messageObject.extendedTextMessage?.contextInfo || messageObject.imageMessage?.contextInfo || messageObject.videoMessage?.contextInfo || messageObject.audioMessage?.contextInfo || messageObject.documentMessage?.contextInfo;
        if (contextInfo && contextInfo.quotedMessage) {
            quoted = {
                id: contextInfo.stanzaId,
                participant: contextInfo.participant,
                text: getMsgText(contextInfo.quotedMessage) || "Mídia"
            };
        }

        // Tratamento de Reações
        if (finalEvent === 'messages.reaction' || payload.reaction) {
            const reaction = payload.reaction || messageData.reaction;
            if (reaction && reaction.key) {
                const targetMsgId = reaction.key.id;
                const emoji = reaction.text;
                const phoneStr = phone;

                const msgsRef = collection(db, "chats", phoneStr, "messages");
                const q = query(msgsRef, where("messageId", "==", targetMsgId), limit(1));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const msgDoc = snap.docs[0];
                    const existingReactions = msgDoc.data().reactions || {};
                    const reactor = reaction.key.participant || (reaction.key.fromMe ? 'me' : phoneStr);
                    if (emoji) {
                        existingReactions[reactor] = emoji;
                    } else {
                        delete existingReactions[reactor];
                    }
                    await updateDoc(msgDoc.ref, { reactions: existingReactions });
                }
                return res.status(200).json({ status: 'reaction_processed' });
            }
        }

        // SALVAR NO FIREBASE (Eventos, Chats e Messages)
        const chatRef = doc(db, "chats", phone);
        const existingChatSnap = await getDoc(chatRef);
        const existingChat = existingChatSnap.exists() ? existingChatSnap.data() : null;

        // 1. Monitor (Webhooks ao vivo)
        await addDoc(collection(db, "webhook_events"), {
            event: finalEvent || 'n8n_push',
            phone: phone,
            timestamp: serverTimestamp(),
            message: messageText,
            isGroup: !!isGroup,
            full_payload: payload // Captura todos os dados extras do Evolution
        });

        // Lógica de Status (Reabrir se estiver concluído ou novo lead)
        const currentStatus = existingChat?.status || 'concluido'; // Default fallback safe
        let newStatus = currentStatus;

        // Se for novo (existingChat é null) ou se estiver concluído/resolvido
        if (!existingChat || ['concluido', 'resolvido'].includes(currentStatus)) {
            // Se for enviado por MIM, assume 'atendimento'. Se for contato, 'aguardando'.
            newStatus = isFromMe ? 'atendimento' : 'aguardando';
        } else if (isFromMe && currentStatus === 'aguardando') {
            // Se eu respondi um aguardando, move para atendimento
            newStatus = 'atendimento';
        }

        // Contador de Não Lidas
        const currentUnread = existingChat?.unreadCount || 0;
        // Se for enviado por mim, zera (ou mantém 0). Se for contato, incrementa.
        const newUnread = isFromMe ? 0 : (currentUnread + 1);

        // 2. Chat (Upsert com status e unreadCount corrigidos)
        await setDoc(chatRef, {
            id: phone,
            name: chatDisplayName,
            isGroup: !!isGroup,
            remoteJid: remoteJidBase,
            avatarUrl: finalAvatarUrl || existingChat?.avatarUrl || null,
            updatedAt: serverTimestamp(),
            lastMessage: messageText,
            status: newStatus,
            unreadCount: newUnread
        }, { merge: true });

        // 3. Contato
        await setDoc(doc(db, "contacts", phone), {
            id: phone,
            name: chatDisplayName,
            isGroup: !!isGroup,
            remoteJid: remoteJidBase,
            avatarUrl: finalAvatarUrl || null,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Extrair URL da Mídia
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

        // --- R2 STORAGE INTEGRATION ---
        // Se for mídia e tivermos configurações do R2, tentar fazer upload
        const settingsSnap = await getDoc(doc(db, "settings", "evolution"));
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};

        if (['image', 'video', 'audio', 'document'].includes(type) && settings.r2Bucket) {
            try {
                // Tenta pegar base64 direto do payload (caso venha do n8n)
                let base64Data = payload.base64 || (payload.data && payload.data.base64) || null;

                // Fallback N8N: Se mediaUrl vier com conteúdo Base64 (não URL http) e for longo
                if (!base64Data && mediaUrl && typeof mediaUrl === 'string' && !mediaUrl.startsWith('http') && mediaUrl.length > 200) {
                    base64Data = mediaUrl;
                }

                // CLEANUP: Se vier como Data URI (data:audio/ogg;base64,AAAA...), remover o cabeçalho
                if (base64Data && typeof base64Data === 'string' && base64Data.includes(',')) {
                    base64Data = base64Data.split(',')[1];
                }

                // Se for audio e vier sem mimetype ou genérico, tentar deduzir ou manter (NÃO forçar MP3 se for OGG)
                if (type === 'audio' && (!mimeType || mimeType === 'application/octet-stream')) {
                    // Apenas fallback. Se for OGG, o código original já deve ter enviado 'audio/ogg'
                    // Se não tiver info, mp3 é um chute arriscado, mas mantemos o fallback para casos nulos.
                    mimeType = 'audio/mp3';
                }

                // Se não veio base64 no payload, tentar buscar na Evolution
                if (!base64Data && settings.url && settings.instance && settings.apiKey && (key.id || payload.messageId)) {
                    const msgId = key.id || payload.messageId;
                    try {
                        const fetch64 = await fetch(`${settings.url}/chat/getBase64FromMediaMessage/${settings.instance}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': settings.apiKey },
                            body: JSON.stringify({
                                message: messageObject,
                                convertToMp4: false
                            })
                        });
                        const data64 = await fetch64.json();
                        if (data64 && data64.base64) base64Data = data64.base64;
                    } catch (e) {
                        console.warn("[R2] Falha ao buscar base64 da Evolution:", e);
                    }
                }

                // Se ainda não temos base64, mas temos uma URL pública (ex: enviada pelo N8N ou Link Evolution)
                if (!base64Data && mediaUrl && mediaUrl.startsWith('http')) {
                    try {
                        console.log(`[R2] Tentando baixar mídia da URL: ${mediaUrl}`);
                        const urlRes = await fetch(mediaUrl);
                        if (urlRes.ok) {
                            const arrayBuffer = await urlRes.arrayBuffer();
                            base64Data = Buffer.from(arrayBuffer).toString('base64');
                        }
                    } catch (e) {
                        console.warn("[R2] Falha ao baixar mídia da URL:", e);
                    }
                }

                if (base64Data) {
                    const r2Client = new S3Client({
                        region: "auto",
                        endpoint: `https://${settings.r2AccountId.trim()}.r2.cloudflarestorage.com`,
                        credentials: {
                            accessKeyId: settings.r2AccessKeyId.trim(),
                            secretAccessKey: settings.r2SecretAccessKey.trim(),
                        },
                        forcePathStyle: true,
                    });

                    const safeMime = mimeType || 'application/octet-stream';
                    // Sanitize extension: remove parameters like "; codecs=opus"
                    const ext = safeMime.split('/')[1].split(';')[0].trim() || 'bin';
                    const finalFileName = fileName || `media_${Date.now()}.${ext}`;
                    const r2Key = `uploads/start_chat_${Date.now()}_${finalFileName}`;

                    const buffer = Buffer.from(base64Data, 'base64');

                    await r2Client.send(new PutObjectCommand({
                        Bucket: settings.r2Bucket.trim(),
                        Key: r2Key,
                        Body: buffer,
                        ContentType: safeMime,
                    }));

                    const publicUrlBase = settings.r2PublicUrl.trim().replace(/\/$/, '');
                    mediaUrl = `${publicUrlBase}/${r2Key}`;
                    console.log(`[R2] Mídia salva com sucesso: ${mediaUrl}`);
                }
            } catch (e) {
                console.error("[R2] Erro no processamento de mídia:", e);
            }
        }
        // ------------------------------

        // 4. Mensagem
        const msgId = key.id || payload.messageId;

        if (msgId) {
            const msgDocRef = doc(chatRef, "messages", msgId);
            const msgDocSnap = await getDoc(msgDocRef);

            if (msgDocSnap.exists()) {
                console.log(`[WEBHOOK] Message ${msgId} already exists, skipping save to avoid duplicates/overwrite.`);
                return res.status(200).json({ status: 'skipped_exists' });
            }

            // Se não existe, usamos setDoc com o ID específico para manter consistência
            await setDoc(msgDocRef, {
                text: messageText,
                sender: phone,
                type: type,
                mediaUrl: mediaUrl,
                mimeType: mimeType,
                fileName: fileName,
                quoted: quoted,
                participant: key.participant || payload.participant || null,
                pushName: pushName,
                avatarUrl: participantAvatarUrl,
                timestamp: serverTimestamp(),
                fromMe: false, // Webhooks são, por padrão, recebidos. Os enviados (fromMe=true) são filtrados no início.
                isGroup: !!isGroup,
                messageId: msgId
            });
        } else {
            // Fallback para addDoc se não tiver ID (raro)
            await addDoc(collection(chatRef, "messages"), {
                text: messageText,
                sender: phone,
                type: type,
                mediaUrl: mediaUrl,
                mimeType: mimeType,
                fileName: fileName,
                quoted: quoted,
                participant: key.participant || payload.participant || null,
                pushName: pushName,
                avatarUrl: participantAvatarUrl,
                timestamp: serverTimestamp(),
                fromMe: false,
                isGroup: !!isGroup,
                messageId: null
            });
        }

        return res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error("[WEBHOOK ERROR]", error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
