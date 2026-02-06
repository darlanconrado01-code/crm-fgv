
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

async function listAllProjects() {
    const all = await getDocs(collection(db, "task_projects"));
    all.forEach(d => {
        console.log(`ID: ${d.id}`);
        console.log(`Data: ${JSON.stringify(d.data(), null, 2)}`);
        console.log('---');
    });
    process.exit(0);
}

listAllProjects();
