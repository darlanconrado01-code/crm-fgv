
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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

async function verify(chatId) {
    console.log(`Checking messages for ${chatId}...`);
    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "desc"),
        limit(20)
    );
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} messages.`);
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Text Length: ${data.text?.length || 0}`);
        console.log(`  Preview: ${data.text?.substring(0, 50)}...`);
        console.log(`  Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : 'no date'}`);
    });
    process.exit(0);
}

const target = process.argv[2] || "120363247342384541";
verify(target).catch(console.error);
