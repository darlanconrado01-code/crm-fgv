
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listAll() {
    try {
        const collections = ["projects", "agenda_events", "tasks", "chats", "contacts", "settings"];
        for (const colName of collections) {
            const snap = await getDocs(collection(db, colName));
            console.log(`Collection: ${colName} | Size: ${snap.size}`);
            if (colName === "projects") {
                snap.forEach(doc => console.log(` - Project: ${doc.data().title || doc.data().name} | ID: ${doc.id}`));
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

listAll();
