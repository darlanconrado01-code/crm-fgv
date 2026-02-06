
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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

async function checkProjects() {
    console.log("Checking task_projects structure...");
    const q = query(collection(db, "task_projects"), limit(2));
    const all = await getDocs(q);
    all.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}, Data:`, JSON.stringify(data, null, 2));
    });
    process.exit(0);
}

checkProjects();
