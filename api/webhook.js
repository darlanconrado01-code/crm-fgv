
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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
    const { type } = req.query;

    if (req.method === 'POST') {
        try {
            const payload = req.body;

            // Salva no Firestore com o tipo identificado
            await addDoc(collection(db, "webhook_events"), {
                ...payload,
                webhook_type: type || 'evolution_direct',
                source: 'vercel-api',
                timestamp: serverTimestamp(),
                receivedAt: new Date().toISOString()
            });

            return res.status(200).json({ status: 'success', type });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    } else {
        return res.status(200).json({
            message: "Webhook endpoint active",
            endpoint_type: type || "generic"
        });
    }
}
