
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
        const { chatId, text } = req.body;

        // 1. Buscar as configurações salvas no Firebase
        const configDoc = await getDoc(doc(db, "settings", "evolution"));
        const config = configDoc.exists() ? configDoc.data() : {};

        // Prioridade para o Webhook do N8N
        const n8nUrl = config.n8nSendUrl || 'https://n8n.canvazap.com.br/webhook-test/799c3543-026d-472f-a852-460f69c4d166';

        console.log('--- ENVIANDO MENSAGE PARA N8N ---');
        console.log('URL:', n8nUrl);

        // 2. Disparar para o Webhook do N8N
        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: chatId,
                text: text,
                instance: config.instance || 'EnduroAguas',
                apiKey: config.apiKey || '',
                evolutionUrl: config.url || '',
                timestamp: new Date().toISOString(),
                source: 'CRM FGV'
            })
        });

        const data = await response.text(); // n8n às vezes retorna string simples

        return res.status(200).json({ status: 'success', data });

    } catch (error) {
        console.error('Erro no Proxy Send:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
