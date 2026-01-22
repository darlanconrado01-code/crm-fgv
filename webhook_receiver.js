
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

// Rota para receber Webhook da Evolution API
app.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;

        console.log('--- NOVO EVENTO RECEBIDO ---');
        console.log('Evento:', payload.event);
        console.log('Remetente:', payload.sender);

        // Salva no Firestore na coleção webhook_events
        const docRef = await addDoc(collection(db, "webhook_events"), {
            ...payload,
            timestamp: serverTimestamp(),
            receivedAt: new Date().toISOString()
        });

        console.log('Evento salvo no Firebase com ID:', docRef.id);

        res.status(200).send({ status: 'success', id: docRef.id });
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
