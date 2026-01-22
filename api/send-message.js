
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
        if (!configDoc.exists()) {
            return res.status(400).json({ status: 'error', message: 'Configurações da Evolution não encontradas.' });
        }

        const config = configDoc.data();

        // Limpeza da URL para evitar barras duplas (ex: http://url.com/ + /message)
        const cleanUrl = config.url.replace(/\/$/, "");
        const evolutionUrl = `${cleanUrl}/message/sendText/${config.instance}`;

        // 2. Disparar para a Evolution API
        const response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: chatId,
                text: text,
                delay: 1200,
                linkPreview: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ status: 'error', data });
        }

        return res.status(200).json({ status: 'success', data });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
