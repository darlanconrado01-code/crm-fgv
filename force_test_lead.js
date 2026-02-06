import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const chatId = "559184034863";

async function forceUpdate() {
    console.log("-> 🧪 Forçando atualização FINAL do lead de teste...");

    // 1. Atualizar Chat
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
        agent: "Flávio - SDR ISAN | FGV",
        agentId: "bot_1769067500238",
        status: "bot",
        updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Atualizar Contato
    const contactRef = doc(db, "contacts", chatId);
    await setDoc(contactRef, {
        customData: {
            "field_1769078512483": "12345678900", // CPF como número puro (sem pontos/traços) para o input type number
            "field_1769078647289": "LLM em Direito Civil Processual Civil", // Opção EXATA sem o "e"
            "field_1769080214565": "Belém do Pará",
            "field_1769080430532": "PA",
            "field_1769081921057": "Interessado em pós-graduação EAD de Direito"
        },
        updatedAt: serverTimestamp()
    }, { merge: true });

    console.log("✅ DADOS ENVIADOS! CPF e CURSO agora devem aparecer.");
    process.exit(0);
}

forceUpdate();
