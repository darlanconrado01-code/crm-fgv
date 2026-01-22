
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
            const { event, instance, data, sender } = payload;

            // 1. Log do evento bruto para o Monitor de Webhooks
            await addDoc(collection(db, "webhook_events"), {
                ...payload,
                timestamp: serverTimestamp(),
                receivedAt: new Date().toISOString()
            });

            // 2. Processamento específico para mensagens (Whaticket style)
            if (event === 'messages.upsert' && data?.message) {
                const phone = sender.split('@')[0];
                const pushName = data.pushName || 'Desconhecido';
                const messageText = data.message.conversation || data.message.extendedTextMessage?.text || 'Mídia/Outro';

                const chatRef = doc(db, "chats", phone);

                // Atualiza ou Cria o Chat (Lista Lateral)
                await setDoc(chatRef, {
                    id: phone,
                    name: pushName,
                    lastMessage: messageText,
                    updatedAt: serverTimestamp(),
                    unreadCount: 1, // Poderíamos incrementar aqui com field increment
                    status: 'pending' // Novo atendimento
                }, { merge: true });

                // Salva a Mensagem no histórico
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
            console.error(error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    } else {
        return res.status(200).json({ message: "Webhook endpoint active" });
    }
}
