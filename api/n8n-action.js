
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp, getDocs, deleteDoc, writeBatch, query, where } from "firebase/firestore";

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

// Helper para encontrar os documentos corretos independente se for ID numérico ou LID
async function getContactAndChatRefs(rawId) {
    let sanitizedId = rawId;
    if (rawId.includes('@')) {
        sanitizedId = rawId.split('@')[0];
    }

    // 1. Tentar busca direta pelo ID sanitizado
    let contactRef = doc(db, "contacts", sanitizedId);
    let chatRef = doc(db, "chats", sanitizedId);
    let snap = await getDoc(contactRef);

    if (snap.exists()) {
        return { contactRef, chatRef, found: true, data: snap.data(), id: sanitizedId };
    }

    // 2. Busca profunda pelo remoteJid (campo que guarda o ID original da Evolution, inclusive LID)
    const q = query(collection(db, "contacts"), where("remoteJid", "==", rawId));
    const qSnap = await getDocs(q);

    if (!qSnap.empty) {
        const foundDoc = qSnap.docs[0];
        return {
            contactRef: doc(db, "contacts", foundDoc.id),
            chatRef: doc(db, "chats", foundDoc.id),
            found: true,
            data: foundDoc.data(),
            id: foundDoc.id
        };
    }

    // 3. Se não encontrou, criar novo usando o sanitizedId como base
    return { contactRef, chatRef, found: false, data: null, id: sanitizedId };
}

const VALID_TOKEN = "cv_vpdmp2uusecjze6w0vs6";

function checkAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '').trim();
    return token === VALID_TOKEN;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!checkAuth(req)) return res.status(401).json({ error: "Unauthorized" });

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
        const { action, data } = req.body;
        let rawId = req.body.chatId || req.body.chatID || "";

        const globalActions = ['clearLogs', 'resetDatabase'];
        if (!rawId && !globalActions.includes(action)) throw new Error("chatId é obrigatório.");

        console.log(`[N8N ACTION] ${action} para ${rawId}`, data);

        let result = { status: 'success' };

        // Buscar referências resolvidas
        const { contactRef, chatRef, found, data: contactData, id: resolvedId } = rawId ? await getContactAndChatRefs(rawId) : {};

        switch (action) {
            case 'getContact':
                const fieldsSnap = await getDocs(collection(db, "custom_fields"));
                const fieldIdToLabel = {}; // field_123 -> "Nome Amigável"
                const labelToFieldId = {}; // "Nome Amigável" -> field_123

                fieldsSnap.docs.forEach(d => {
                    const f = d.data();
                    if (f.active !== false) {
                        fieldIdToLabel[d.id] = f.label;
                        labelToFieldId[f.label] = d.id;
                    }
                });

                if (found) {
                    const cleanedData = { ...contactData };
                    const friendlyFields = {};

                    // Mover os ids estranhos para um objeto 'fields' com nomes bonitos
                    Object.keys(fieldIdToLabel).forEach(fid => {
                        friendlyFields[fieldIdToLabel[fid]] = cleanedData[fid] || null;
                        delete cleanedData[fid]; // Tira do objeto principal para não repetir
                    });

                    // Limpar campos de sistema
                    delete cleanedData.customData;

                    return res.status(200).json({
                        exists: true,
                        ...cleanedData, // id, name, phone, etc no topo
                        fields: friendlyFields, // CPF, Curso, etc agrupados aqui
                        _mapping: labelToFieldId // Apenas para referência técnica (oculto no n8n se não usar)
                    });
                } else {
                    const emptyFields = {};
                    Object.values(fieldIdToLabel).forEach(label => emptyFields[label] = null);
                    return res.status(200).json({
                        exists: false,
                        fields: emptyFields,
                        _mapping: labelToFieldId
                    });
                }

            case 'updateStatus':
                await setDoc(chatRef, {
                    status: data.status,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                break;

            case 'assignAgent':
                await setDoc(chatRef, {
                    agent: data.agentName,
                    agentId: data.agentId,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                break;

            case 'addTag':
                await setDoc(chatRef, {
                    tags: arrayUnion(data.tag),
                    updatedAt: serverTimestamp()
                }, { merge: true });
                await setDoc(contactRef, {
                    tags: arrayUnion(data.tag),
                    updatedAt: serverTimestamp()
                }, { merge: true });
                break;

            case 'setField':
                let fieldId = data.fieldId;
                const fieldValue = data.fieldValue;

                // Se o fieldId não começar com 'field_', presumimos que é o LABEL amigável
                if (fieldId && !fieldId.startsWith('field_')) {
                    const allFieldsSnap = await getDocs(collection(db, "custom_fields"));
                    const target = allFieldsSnap.docs.find(doc => doc.data().label === fieldId);
                    if (target) {
                        fieldId = target.id;
                    }
                }

                if (!fieldId) throw new Error(`Campo '${data.fieldId}' não encontrado.`);

                await setDoc(contactRef, {
                    [fieldId]: fieldValue,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                break;

            case 'updateAvatar':
                await setDoc(chatRef, {
                    avatarUrl: data.avatarUrl,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                await setDoc(contactRef, {
                    avatarUrl: data.avatarUrl,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                break;

            case 'addMessage':
                await addDoc(collection(chatRef, "messages"), {
                    text: data.text,
                    sender: 'system',
                    fromMe: true,
                    timestamp: serverTimestamp(),
                    isBot: true
                });
                break;

            case 'clearLogs':
                const logsSnap = await getDocs(collection(db, "webhook_events"));
                const logBatch = writeBatch(db);
                logsSnap.docs.forEach(d => logBatch.delete(d.ref));
                await logBatch.commit();
                break;

            case 'resetDatabase':
                if (!data.confirm) throw new Error("A confirmação 'confirm: true' é necessária.");
                const chatsSnap = await getDocs(collection(db, "chats"));
                for (const d of chatsSnap.docs) {
                    const msgs = await getDocs(collection(db, "chats", d.id, "messages"));
                    const msgBatch = writeBatch(db);
                    msgs.docs.forEach(m => msgBatch.delete(m.ref));
                    await msgBatch.commit();
                    await deleteDoc(doc(db, "chats", d.id));
                }
                break;

            default:
                throw new Error("Ação inválida.");
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Erro N8N Action:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
