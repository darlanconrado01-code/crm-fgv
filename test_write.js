
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

async function testWrite() {
    console.log("Attempting to write to webhook_events...");
    try {
        const docRef = await addDoc(collection(db, "webhook_events"), {
            test: true,
            source: "local_test_script",
            timestamp: serverTimestamp()
        });
        console.log("Document written with ID:", docRef.id);
    } catch (e) {
        console.error("Write failed:", e);
    }
}

testWrite().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
