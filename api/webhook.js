
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

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
            const { event, data, sender } = payload;

            // 1. Log do evento para o Monitor
            await addDoc(collection(db, "webhook_events"), {
                ...payload,
                timestamp: serverTimestamp()
            });

            // 2. Processamento inteligente de mensagens
            if (event === 'messages.upsert') {
                const phone = sender.split('@')[0];
                const pushName = data.pushName || 'Contato';

                // Detecta o tipo de mensagem para não mostrar "Mídia/Outro"
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

                // Atualiza a lista lateral
                await setDoc(chatRef, {
                    id: phone,
                    name: pushName,
                    lastMessage: messageText,
                    updatedAt: serverTimestamp(),
                    unreadCount: data.key.fromMe ? 0 : 1,
                    status: 'pending'
                }, { merge: true });

                // Salva no histórico
                await addDoc(collection(chatRef, "messages"), {
                    text: messageText,
                    sender: phone,
                    pushName: pushName,
                    fromMe: data.key.fromMe || false,
                    timestamp: serverTimestamp(),
                    type: 'chat'
                });
            }

            return res.status(200).json({ status: 'success' });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    } else {
        return res.status(200).json({ message: "Webhook active" });
    }
}
