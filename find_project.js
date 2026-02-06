
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

async function findProject() {
    console.log("Searching task_projects...");
    const all = await getDocs(collection(db, "task_projects"));
    let found = false;
    all.forEach(doc => {
        const data = doc.data();
        console.log(`Project: ${data.title} | ID: ${doc.id}`);
        if (data.title && data.title.toUpperCase() === "REUNIÕES") {
            console.log("MATCH_FOUND_ID:" + doc.id);
            found = true;
        }
    });

    if (!found) {
        console.log("PROJECT_REUNIOES_NOT_FOUND");
    }
    process.exit(0);
}

findProject();
