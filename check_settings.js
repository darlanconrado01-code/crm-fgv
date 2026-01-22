
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

async function check() {
    const s = await getDoc(doc(db, "settings", "evolution"));
    if (s.exists()) {
        console.log("Settings found:", JSON.stringify(s.data(), null, 2));
    } else {
        console.log("Settings evolution NOT FOUND");
    }
}

check().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
