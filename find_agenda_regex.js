
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

async function findAgendaProject() {
    const all = await getDocs(collection(db, "task_projects"));
    let found = false;
    all.forEach(d => {
        const title = d.data().title || "";
        if (title.toLowerCase().includes("agenda")) {
            console.log(`FOUND: ${d.id}: ${title}`);
            found = true;
        }
    });
    if (!found) {
        console.log("No project containing 'agenda' in title found.");
    }
    process.exit(0);
}

findAgendaProject();
