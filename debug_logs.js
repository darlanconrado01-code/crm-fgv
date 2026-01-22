
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

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

async function check() {
    console.log("Fetching logs...");
    const q = query(collection(db, "webhook_events"), orderBy("timestamp", "desc"), limit(10));
    const snap = await getDocs(q);

    for (const doc of snap.docs) {
        const data = doc.data();
        console.log(`\n[${doc.id}] Type: ${data.type || 'RAW'}`);
        if (data.type === 'bot_trace') {
            console.log(`Phone: ${data.phone}, Status: ${data.status}, error: ${data.error || 'none'}`);
            if (data.bot_responded) console.log("SUCCESS: Bot responded!");
        } else if (data.event === 'messages.upsert') {
            console.log(`Message from ${data.data?.pushName}: ${JSON.stringify(data.data?.message?.conversation || data.data?.message?.extendedTextMessage?.text || 'media')}`);
        }
    }
}

check().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
