
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkGroups() {
    console.log("Checking Groups in Firestore...");

    // 1. Check Chats
    const chatsSnap = await getDocs(collection(db, "chats"));
    const chatGroups = chatsSnap.docs.filter(d => d.id.includes('@g.us') || d.data().isGroup);

    console.log(`\nFound ${chatGroups.length} groups in 'chats' collection:`);
    chatGroups.forEach(d => {
        const data = d.data();
        console.log(`- [${d.id}] ${data.name || 'No Name'} (Status: ${data.status}, Agent: ${data.agent})`);
    });

    // 2. Check Contacts
    const contactsSnap = await getDocs(collection(db, "contacts"));
    const contactGroups = contactsSnap.docs.filter(d => d.id.includes('@g.us') || d.data().isGroup);

    console.log(`\nFound ${contactGroups.length} groups in 'contacts' collection:`);
    contactGroups.forEach(d => {
        const data = d.data();
        const inChat = chatGroups.find(c => c.id === d.id);
        console.log(`- [${d.id}] ${data.name || 'No Name'} -> In Chats? ${inChat ? 'YES' : 'NO'}`);
    });

    process.exit(0);
}

checkGroups();
