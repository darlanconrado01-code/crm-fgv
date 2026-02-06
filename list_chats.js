
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

async function listChats() {
    console.log("Listing chats...");
    const snap = await getDocs(collection(db, "chats"));
    console.log(`Found ${snap.size} chats.`);
    snap.forEach(doc => {
        console.log(`- ${doc.id}`);
    });
    process.exit(0);
}

listChats().catch(console.error);
