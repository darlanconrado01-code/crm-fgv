import { initializeApp, getApps, getApp } from "firebase/app";
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
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const { audioUrl } = req.body;
    if (!audioUrl) return res.status(400).json({ status: 'error', message: 'Missing audioUrl' });

    try {
        // 1. Get Webhook URL from settings
        const settingsSnap = await getDoc(doc(db, "settings", "evolution"));
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};
        const webhookUrl = settings.voiceWebhookUrl;

        if (!webhookUrl) {
            return res.status(500).json({ status: 'error', message: 'Voice Webhook not configured in settings.' });
        }

        // 2. Call Webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioUrl: audioUrl,
                type: 'transcription_request'
            })
        });

        const data = await response.json();
        const text = data.transcription || data.text || (data.transcriptions && data.transcriptions[0]?.text);

        if (text) {
            return res.status(200).json({ status: 'success', text });
        } else {
            return res.status(500).json({ status: 'error', message: 'No transcription returned from webhook.', details: data });
        }

    } catch (error) {
        console.error("Transcription error:", error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
