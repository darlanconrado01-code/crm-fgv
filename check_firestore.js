
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

async function checkMessages(chatId) {
    console.log(`Checking messages for chat: ${chatId}`);
    try {
        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} messages.`);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}`);
            console.log(`  Sender: ${data.sender}`);
            console.log(`  Text Length: ${data.text?.length || 0}`);
            console.log(`  Preview: ${data.text?.substring(0, 50)}...`);
            console.log(`  Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : 'N/A'}`);
            console.log('---');
        });
    } catch (e) {
        console.error("Error checking Firestore:", e);
    }
}

const chatId = process.argv[2] || "120303310000000000@g.us";
checkMessages(chatId).then(() => process.exit(0));
