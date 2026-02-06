
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    let debugLog = { step: 'init', timestamp: new Date().toISOString() };

    try {
        const { fileName, fileType, fileData } = req.body;
        debugLog.fileInfo = { fileName, fileType, dataLength: fileData?.length };

        // 1. Buscar as configurações do R2 no Firebase
        const configDoc = await getDoc(doc(db, "settings", "evolution"));
        const settings = configDoc.exists() ? configDoc.data() : {};
        debugLog.settingsFound = Object.keys(settings).filter(k => k.startsWith('r2'));

        if (!settings.r2AccountId || !settings.r2AccessKeyId || !settings.r2SecretAccessKey || !settings.r2Bucket) {
            throw new Error(`Configurações R2 incompletas: ${JSON.stringify(debugLog.settingsFound)}`);
        }

        const r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${settings.r2AccountId.trim()}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: settings.r2AccessKeyId.trim(),
                secretAccessKey: settings.r2SecretAccessKey.trim(),
            },
            forcePathStyle: true, // Crucial para R2
        });

        // O fileData vem como base64 do frontend
        const buffer = Buffer.from(fileData, 'base64');
        const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const key = `uploads/${Date.now()}-${cleanFileName}`;

        debugLog.step = 'uploading';
        const command = new PutObjectCommand({
            Bucket: settings.r2Bucket.trim(),
            Key: key,
            Body: buffer,
            ContentType: fileType,
        });

        await r2Client.send(command);
        debugLog.step = 'success';

        const publicUrlBase = settings.r2PublicUrl.trim().replace(/\/$/, '').replace(/"/g, '');
        const publicUrl = `${publicUrlBase}/${key}`;

        // Salvar log de sucesso para debug
        await addDoc(collection(db, "webhook_events"), {
            event: 'R2_UPLOAD_SUCCESS',
            url: publicUrl,
            timestamp: serverTimestamp()
        });

        return res.status(200).json({ status: 'success', url: publicUrl });

    } catch (error) {
        console.error('Erro no Upload R2:', error);

        // Salvar log de erro no Firestore para o usuário ver no Monitor
        await addDoc(collection(db, "webhook_events"), {
            event: 'R2_UPLOAD_ERROR',
            error: error.message,
            debug: debugLog,
            timestamp: serverTimestamp()
        });

        return res.status(500).json({ status: 'error', message: error.message });
    }
}
