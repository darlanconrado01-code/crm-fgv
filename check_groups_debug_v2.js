
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

async function checkGroups() {
    const chatsSnap = await getDocs(collection(db, "chats"));
    const chatGroups = chatsSnap.docs.filter(d => d.id.includes('@g.us') || d.data().isGroup);

    console.log(`TOTAL GROUPS IN CHATS: ${chatGroups.length}`);
    chatGroups.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}`);
        console.log(`NAME: ${data.name}`);
        console.log(`STATUS: ${data.status}`);
        console.log(`AGENT: ${data.agent}`);
        console.log(`ISGROUP: ${data.isGroup}`);
        console.log('-------------------');
    });
    process.exit(0);
}

checkGroups();
