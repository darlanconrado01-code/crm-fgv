
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

async function findAgendaProject() {
    console.log("Searching in 'task_projects'...");
    const q = query(collection(db, "task_projects"), where("title", "==", "Agenda"));
    const snap = await getDocs(q);
    if (snap.empty) {
        console.log("No project with title 'Agenda' found. Checking for 'agenda' (lowercase)...");
        const q2 = query(collection(db, "task_projects"), where("title", "==", "agenda"));
        const snap2 = await getDocs(q2);
        if (snap2.empty) {
            console.log("Listing all projects to be sure:");
            const all = await getDocs(collection(db, "task_projects"));
            all.forEach(d => console.log(`${d.id}: ${d.data().title}`));
        } else {
            snap2.forEach(d => console.log(`${d.id}: ${d.data().title}`));
        }
    } else {
        snap.forEach(d => console.log(`${d.id}: ${d.data().title}`));
    }
    process.exit(0);
}

findAgendaProject();
