
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function checkSettings() {
    const docRef = doc(db, "settings", "evolution");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        console.log("Current Settings:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("Settings document not found!");
    }
}

checkSettings().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
