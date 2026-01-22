
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";

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
            const payload = req.body;
            const { event, data } = payload;

            // 1. Log do evento para o Monitor
            await addDoc(collection(db, "webhook_events"), {
                ...payload,
                timestamp: serverTimestamp()
            });

            // 2. Processamento inteligente de mensagens
            if (event === 'messages.upsert') {
                // IMPORTANTE: remoteJid é o ID real da conversa (pode ser o número do contato ou o ID do grupo)
                const remoteJid = data.key.remoteJid;
                const phone = remoteJid.split('@')[0];
                const pushName = data.pushName || 'Contato';
                const fromMe = data.key.fromMe || false;

                // Detecta o tipo de mensagem
                let messageText = 'Mídia (Imagem/Áudio/Arquivo)';

                if (data.message?.conversation) {
                    messageText = data.message.conversation;
                } else if (data.message?.extendedTextMessage?.text) {
                    messageText = data.message.extendedTextMessage.text;
                } else if (data.message?.imageMessage) {
                    messageText = '📷 Foto';
                } else if (data.message?.audioMessage) {
                    messageText = '🎤 Áudio';
                } else if (data.message?.videoMessage) {
                    messageText = '🎥 Vídeo';
                } else if (data.message?.documentMessage) {
                    messageText = '📄 Documento: ' + (data.message.documentMessage.title || 'Arquivo');
                }

                const chatRef = doc(db, "chats", phone);

                // Atualiza a lista lateral (Chat List)
                await setDoc(chatRef, {
                    id: phone,
                    remoteJid: remoteJid, // Guardamos o JID completo para envios futuros
                    name: fromMe ? (await getDoc(chatRef)).data()?.name || pushName : pushName,
                    lastMessage: messageText,
                    updatedAt: serverTimestamp(),
                    unreadCount: fromMe ? 0 : 1,
                    status: 'pending'
                }, { merge: true });

                // Salva no histórico de mensagens
                await addDoc(collection(chatRef, "messages"), {
                    text: messageText,
                    sender: payload.sender || remoteJid,
                    pushName: pushName,
                    fromMe: fromMe,
                    timestamp: serverTimestamp(),
                    type: 'chat'
                });
            }

            return res.status(200).json({ status: 'success' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    } else {
        return res.status(200).json({ message: "Webhook active" });
    }
}
