
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";

// Configuração do Firebase (mesma do seu app)
const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be",
    measurementId: "G-6E0EP3FRKE"
};

// Inicializa Firebase no Node
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

const app = express();
const PORT = 3021;

app.use(cors());
app.use(bodyParser.json());

// Mapeamento de DDD para Estado (UF)
const dddToState = {
    '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
    '21': 'RJ', '22': 'RJ', '24': 'RJ',
    '27': 'ES', '28': 'ES',
    '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
    '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
    '47': 'SC', '48': 'SC', '49': 'SC',
    '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
    '61': 'DF', '62': 'GO', '63': 'TO', '64': 'GO', '65': 'MT', '66': 'MT', '67': 'MS', '68': 'AC', '69': 'RO',
    '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
    '79': 'SE',
    '81': 'PE', '82': 'AL', '83': 'PB', '84': 'RN', '85': 'CE', '86': 'PI', '87': 'PE', '88': 'CE', '89': 'PI',
    '91': 'PA', '92': 'AM', '93': 'PA', '94': 'PA', '95': 'RR', '96': 'AP', '97': 'AM', '98': 'MA', '99': 'MA'
};

// Rota para receber Webhook da Evolution API
app.post('/webhook', async (req, res) => {
    try {
        let payload = req.body;

        // Suporte a payloads envelopados (n8n ou layouts específicos)
        if (Array.isArray(payload) && payload.length > 0) payload = payload[0];
        if (payload.body) payload = payload.body;

        const { event, data } = payload;

        console.log('--- EVENTO RECEBIDO ---', event);

        // 1. Salvar no Firestore na coleção webhook_events para o monitor
        await addDoc(collection(db, "webhook_events"), {
            ...payload,
            timestamp: serverTimestamp(),
            receivedAt: new Date().toISOString(),
            raw: req.body
        });

        // 2. Processar mensagens (Lógica Unificada e Agressiva)
        if (event === 'messages.upsert') {
            console.log('--- DETECÇÃO DE JID REAL ---');

            const key = data.key || {};
            const remoteJidBase = key.remoteJid || "";
            const remoteJidAlt = key.remoteJidAlt || data.remoteJidAlt || payload.remoteJidAlt || "";

            // O ID real do chat deve ser o remoteJidAlt se ele existir e for um número real
            let finalJid = remoteJidBase;
            if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
                finalJid = remoteJidAlt;
                console.log('-> JID Real via remoteJidAlt:', finalJid);
            } else if (remoteJidBase.includes('@lid') && remoteJidAlt) {
                finalJid = remoteJidAlt;
                console.log('-> Convertido de LID para Alt:', finalJid);
            } else {
                console.log('-> Mantendo JID original (pode ser lid):', finalJid);
            }

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

            const phone = finalJid.split('@')[0];
            const pushName = data.pushName || 'Contato';
            const fromMe = key.fromMe || false;

            const chatRef = doc(db, "chats", phone);

            // Incrementar unreadCount
            const chatDoc = await getDoc(chatRef);
            const isNewChat = !chatDoc.exists();
            let currentUnread = 0;
            let chatStatus = 'bot'; // Padrão

            if (!isNewChat) {
                const existingData = chatDoc.data();
                currentUnread = existingData.unreadCount || 0;
                chatStatus = existingData.status || 'atendimento';
                if (chatStatus === 'pending') chatStatus = 'bot'; // Caso tenha vindo de um rastro antigo
            }

            // 1. Criar/Atualizar na coleção 'chats'
            const phoneStr = String(phone);
            const ddd = phoneStr.length >= 2 ? phoneStr.substring(2, 4) : ''; // Assume formato 55XX...
            const detectedState = dddToState[ddd] || '';
            const stateFieldId = 'field_1769080430532'; // ID do campo ESTADO

            // Buscar robô de primeiro contato para atribuição IMEDIATA se necessário
            let initialAgent = chatDoc.exists() ? chatDoc.data().agent : null;
            let initialAgentId = chatDoc.exists() ? chatDoc.data().agentId : null;
            let initialSector = chatDoc.exists() ? chatDoc.data().sector : 'Geral';

            if (!initialAgent && chatStatus === 'bot') {
                const botQuery = query(collection(db, "ai_agents"), where("isFirstContact", "==", true), where("status", "==", "active"), limit(1));
                const botSnap = await getDocs(botQuery);
                if (!botSnap.empty) {
                    const bData = botSnap.docs[0].data();
                    initialAgent = bData.name;
                    initialAgentId = botSnap.docs[0].id;
                    initialSector = bData.sector || 'Geral';
                    console.log(`-> Atribuindo lead ao robô: ${initialAgent}`);
                }
            }

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
                status: chatStatus,
                agent: initialAgent,
                agentId: initialAgentId,
                sector: initialSector
            }, { merge: true });

            // 2. Criar/Atualizar na coleção 'contacts' (Base Permanente)
            const contactRef = doc(db, "contacts", phone);
            const contactDoc = await getDoc(contactRef);
            let customData = contactDoc.exists() ? (contactDoc.data().customData || {}) : {};

            // Auto-preencher estado se estiver vazio
            if (!customData[stateFieldId] && detectedState) {
                customData[stateFieldId] = detectedState;
                console.log(`-> UF identificada pelo DDD: ${detectedState}`);
            }

            await setDoc(contactRef, {
                id: phone,
                phone: phone,
                name: pushName,
                remoteJid: remoteJidBase,
                remoteJidAlt: remoteJidAlt,
                lastMessage: messageText,
                lastInteraction: serverTimestamp(),
                updatedAt: serverTimestamp(),
                customData
            }, { merge: true });

            // 3. Salvar Mensagem (SALVAR ANTES DO BOT PARA ORDEM CORRETA)
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

            // 4. LÓGICA DE BOT (Ativa se o status for 'bot' e não for enviado por mim)
            if (chatStatus === 'bot' && !fromMe) {
                try {
                    console.log('--- ATIVANDO ROBÔ DE PRIMEIRO CONTATO ---');
                    const botQuery = query(
                        collection(db, "ai_agents"),
                        where("isFirstContact", "==", true),
                        where("status", "==", "active"),
                        limit(1)
                    );
                    const botSnap = await getDocs(botQuery);

                    if (!botSnap.empty) {
                        const bot = botSnap.docs[0].data();

                        // ATRIBUIR RESPONSÁVEL E SETOR (Garantir que o robô é o dono do lead no setor correto)
                        await setDoc(chatRef, {
                            agent: bot.name,
                            agentId: botSnap.docs[0].id, // Usar o ID do documento do bot
                            sector: bot.sector || 'Geral'
                        }, { merge: true });

                        const settingsSnap = await getDoc(doc(db, "settings", "evolution"));
                        const settings = settingsSnap.exists() ? settingsSnap.data() : {};
                        const openaiKey = settings.openaiApiKey;
                        const instanceName = settings.instance;

                        // --- DEBOUNCE LOCAL ---
                        console.log(`[BOT LOCAL] Aguardando 7s para agrupar mensagens de ${phone}...`);
                        await new Promise(r => setTimeout(r, 7000));

                        // Verificar se é a última
                        const lastMsgQuery = query(
                            collection(chatRef, "messages"),
                            orderBy("timestamp", "desc"),
                            limit(1)
                        );
                        const lastMsgSnap = await getDocs(lastMsgQuery);
                        const realLast = lastMsgSnap.docs[0]?.data();

                        if (realLast && !realLast.fromMe && !realLast.isBot && realLast.text !== messageText) {
                            console.log("[BOT LOCAL] Nova mensagem detectada. Cancelando resposta anterior.");
                            return;
                        }

                        // BUSCAR HISTÓRICO
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

                        // BUSCAR DEFINIÇÕES DAS MISSÕES (Campos Personalizados)
                        let missionInstructions = "";
                        const missionsData = [];
                        if (bot.missions && bot.missions.length > 0) {
                            for (const mId of bot.missions) {
                                const fDoc = await getDoc(doc(db, "custom_fields", mId));
                                if (fDoc.exists()) {
                                    const fData = fDoc.data();
                                    missionsData.push({ id: mId, label: fData.label, type: fData.type });
                                    missionInstructions += `- ${fData.label} (ID: ${mId}): ${fData.placeholder || ''}\n`;
                                }
                            }
                        }

                        if (openaiKey) {
                            const systemPrompt = `Você é um assistente virtual profissional da ISAN/FGV. Seu objetivo é ajudar o cliente e, ao mesmo tempo, qualificar o lead de forma natural e empática.
REGRAS DE OURO:
1. NÃO seja um robô de formulário. NÃO faça uma lista de perguntas.
2. Seja empático. Se o cliente disser que está com pressa ou não quiser dar uma info, tudo bem! Prossiga com a ajuda.
3. Se o histórico mostrar que você já se apresentou, NÃO se apresente novamente. Curto e direto!
4. Use o contexto abaixo para guiar suas respostas técnicas.

MISSÃO DE QUALIFICAÇÃO (COLETA SUAVE):
Ao longo da conversa, tente descobrir as seguintes informações sem forçar a barra:
${missionInstructions || 'Nenhuma missão específica.'}

EXTRAÇÃO TÉCNICA (OBRIGATÓRIO):
Sempre que o usuário mencionar algo que corresponda a uma das missões acima (mesmo que você não tenha perguntado diretamente), você DEVE incluir no FINAL da sua resposta o formato técnico abaixo para o nosso CRM salvar o dado automaticamente:
###DATA###{"id_do_campo": "valor_extraido"}###ENDDATA###

Exemplo: Se o cliente disser "Sou de Belém", você responde algo simpático e termina com: ###DATA###{"field_1769080214565": "Belém"}###ENDDATA###

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
                            let aiTextRaw = aiData.choices?.[0]?.message?.content || "";

                            // EXTRAIR DADOS DO TEXTO DA IA
                            let extractedData = {};
                            const dataRegex = /###DATA###(.*?)###ENDDATA###/s;
                            const match = aiTextRaw.match(dataRegex);
                            if (match) {
                                try {
                                    extractedData = JSON.parse(match[1]);
                                    // Limpar o texto para enviar ao usuário
                                    aiTextRaw = aiTextRaw.replace(dataRegex, "").trim();
                                } catch (e) {
                                    console.error("Erro ao parsear JSON da IA:", e);
                                }
                            }

                            const aiText = aiTextRaw;

                            if (aiText) {
                                console.log('-> Resposta gerada pela IA:', aiText);
                                const n8nUrl = settings.n8nSendUrl;
                                if (n8nUrl) {
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
                                    console.log('-> Resposta enviada ao n8n. Status:', n8nRes.status);

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

                                    console.log('-> Resposta do Bot enviada e registrada.');

                                    // ATUALIZAR CAMPOS PERSONALIZADOS NO CONTATO
                                    if (Object.keys(extractedData).length > 0) {
                                        console.log('-> Dados extraídos pela IA:', extractedData);
                                        const contactDoc = await getDoc(contactRef);
                                        const currentCustomData = contactDoc.exists() ? (contactDoc.data().customData || {}) : {};

                                        await setDoc(contactRef, {
                                            customData: {
                                                ...currentCustomData,
                                                ...extractedData
                                            },
                                            updatedAt: serverTimestamp()
                                        }, { merge: true });
                                        console.log('-> Campos personalizados atualizados no contato.');

                                        // VERIFICAR SE TODAS AS MISSÕES FORAM CONCLUÍDAS
                                        if (bot.missions && bot.missions.length > 0) {
                                            const updatedContactDoc = await getDoc(contactRef);
                                            const updatedCustomData = updatedContactDoc.data().customData || {};
                                            const allMissionsComplete = bot.missions.every(mId =>
                                                updatedCustomData[mId] !== undefined &&
                                                updatedCustomData[mId] !== null &&
                                                updatedCustomData[mId] !== ""
                                            );

                                            if (allMissionsComplete) {
                                                console.log('--- MISSÕES CONCLUÍDAS! TRANSFERINDO PARA HUMANO ---');

                                                const transferText = "Obrigado pelas informações! Todas as missões foram cumpridas. Vou te transferir agora para um dos nossos atendentes humanos que continuará seu atendimento.";

                                                // Enviar mensagem de transferência via n8n
                                                if (settings.n8nSendUrl) {
                                                    await fetch(settings.n8nSendUrl, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            telefone: phone,
                                                            nome: bot.name || "Bot FGV",
                                                            mensagem: transferText,
                                                            instance: settings.instance,
                                                            isBot: true
                                                        })
                                                    });
                                                }

                                                // Registrar mensagem de transferência
                                                await addDoc(collection(chatRef, "messages"), {
                                                    text: transferText,
                                                    sender: bot.name || "Bot",
                                                    fromMe: true,
                                                    isBot: true,
                                                    timestamp: serverTimestamp(),
                                                    type: 'text'
                                                });

                                                await setDoc(chatRef, {
                                                    status: 'atendimento', // Transfere para atendimento humano
                                                    lastMessage: transferText,
                                                    updatedAt: serverTimestamp()
                                                }, { merge: true });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (botError) {
                    console.error("Erro no fluxo do Robô Local:", botError);
                }
            }

            // 5. Salvar Mensagem na lista geral removido daqui, já salvamos acima.
            console.log('-> Fluxo de mensagem processado.');

            console.log(`-> Sucesso: Chat [${phone}] atualizado com todas as informações.`);
        }

        // 3. Processar Atualização de Contato (Avatar, Nome, etc)
        if (event === 'contacts.update') {
            console.log('--- ATUALIZAÇÃO DE CONTATO ---');
            const { id, avatarUrl, name } = data;
            const phone = id.split('@')[0];

            const chatRef = doc(db, "chats", phone);
            const contactRef = doc(db, "contacts", phone);

            const updateData = {};
            if (avatarUrl) updateData.avatarUrl = avatarUrl;
            if (name) updateData.name = name;

            if (Object.keys(updateData).length > 0) {
                await setDoc(chatRef, updateData, { merge: true });
                await setDoc(contactRef, updateData, { merge: true });
                console.log(`-> Contato [${phone}] atualizado:`, updateData);
            }
        }

        res.status(200).send({ status: 'success' });
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Servidor de Webhook CRM FGV está Ativo!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR WEBHOOK ATIVO`);
    console.log(`Porta: ${PORT}`);
    console.log(`URL Local: http://localhost:${PORT}/webhook`);
    console.log(`Aponte o Webhook da Evolution API para: http://SEU_IP_LOCAL:${PORT}/webhook\n`);
});
