
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, writeBatch, limit } from "firebase/firestore";

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
    // Permitir apenas POST para execução manual ou gatilho interno
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).send('Method not allowed');

    try {
        // 1. Buscar as configurações do R2 e Ciclo de Limpeza
        const configDoc = await getDoc(doc(db, "settings", "evolution"));
        const settings = configDoc.exists() ? configDoc.data() : {};

        let cleanupDays = parseInt(settings.r2CleanupDays);
        if (isNaN(cleanupDays) || cleanupDays < 1) cleanupDays = 30; // Segurança: Mínimo 1 dia, padrão 30

        const bucket = settings.r2Bucket;

        if (!settings.r2AccountId || !settings.r2AccessKeyId || !settings.r2SecretAccessKey || !bucket) {
            return res.status(400).json({ status: 'error', message: 'Configurações R2 incompletas' });
        }

        const r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${settings.r2AccountId.trim()}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: settings.r2AccessKeyId.trim(),
                secretAccessKey: settings.r2SecretAccessKey.trim(),
            },
            forcePathStyle: true,
        });

        // 2. Listar Objetos
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket.trim(),
            Prefix: 'uploads/' // Limpar apenas a pasta de uploads
        });

        const listedObjects = await r2Client.send(listCommand);
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(200).json({ status: 'success', message: 'Nenhum arquivo para limpar.' });
        }

        const now = new Date();
        const expirationMs = cleanupDays * 24 * 60 * 60 * 1000;

        const objectsToDelete = listedObjects.Contents.filter(obj => {
            const ageMs = now.getTime() - new Date(obj.LastModified).getTime();
            return ageMs > expirationMs;
        }).map(obj => ({ Key: obj.Key }));

        if (objectsToDelete.length === 0) {
            return res.status(200).json({ status: 'success', message: `Nenhum arquivo com mais de ${cleanupDays} dias encontrado.` });
        }

        // 3. Deletar Objetos em Lote (Máximo 1000 por vez)
        const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucket.trim(),
            Delete: { Objects: objectsToDelete }
        });

        await r2Client.send(deleteCommand);

        // 4. Log do evento
        await addDoc(collection(db, "webhook_events"), {
            event: 'R2_CLEANUP_SUCCESS',
            message: `Limpeza executada: ${objectsToDelete.length} arquivos removidos (Ciclo: ${cleanupDays} dias).`,
            timestamp: serverTimestamp()
        });

        // 5. Limpeza Profunda do Banco de Dados (Firestore)
        console.log(`[CLEANUP] Iniciando limpeza profunda do Firestore (Ciclo: ${cleanupDays} dias)...`);
        const expirationDate = new Date(now.getTime() - expirationMs);
        let firestoreDeletedCount = 0;

        // A. Limpar Webhook Events (Eventos de log antigos)
        const eventQ = query(collection(db, "webhook_events"), where("timestamp", "<", expirationDate), limit(500));
        const eventSnap = await getDocs(eventQ);
        if (!eventSnap.empty) {
            const batch = writeBatch(db);
            eventSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            firestoreDeletedCount += eventSnap.size;
        }

        // B. Limpar Chats e Mensagens (Contatos inativos/antigos)
        const chatQ = query(collection(db, "chats"), where("updatedAt", "<", expirationDate), limit(100)); // Processa 100 chats por execução
        const chatSnap = await getDocs(chatQ);

        // Helper para deletar subcoleções em lotes de 500 (limite do Firestore)
        const deleteSubcollectionSafe = async (parentRole, subCollection) => {
            const ref = collection(db, "chats", parentRole, subCollection);
            while (true) {
                const q = query(ref, limit(500));
                const snap = await getDocs(q);
                if (snap.empty) break;

                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        };

        for (const chatDoc of chatSnap.docs) {
            const phone = chatDoc.id;

            // 1. Apagar subcoleção de mensagens (Safe Batch)
            await deleteSubcollectionSafe(phone, "messages");

            // 2. Apagar sugestões de compromisso se houver (Safe Batch)
            await deleteSubcollectionSafe(phone, "appointment_suggestions");

            // 3. Apagar o Chat e o Contato vinculado
            await deleteDoc(doc(db, "chats", phone));
            await deleteDoc(doc(db, "contacts", phone));
            firestoreDeletedCount++;
        }

        return res.status(200).json({
            status: 'success',
            message: `Limpeza finalizada.`,
            r2DeletedCount: objectsToDelete.length,
            firestoreDeletedCount
        });

    } catch (error) {
        console.error('Erro na limpeza R2:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
