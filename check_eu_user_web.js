
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc } = require("firebase/firestore");

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

async function checkEu() {
    console.log("Checking for 'Eu' in database...");

    // 1. Check if there's a user named 'Eu'
    const usersSnap = await getDocs(collection(db, "users"));
    console.log("\n--- Users ---");
    usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes('eu') || data.displayName?.toLowerCase().includes('eu')) {
            console.log(`Potential 'Eu' User: ID=${doc.id}, Name=${data.name}, DisplayName=${data.displayName}`);
        }
    });

    // 2. Check tasks
    const tasksSnap = await getDocs(collection(db, "tasks"));
    console.log("\n--- Tasks with 'Eu' ---");
    tasksSnap.forEach(doc => {
        const data = doc.data();
        const responsible = data.responsible ? data.responsible : '';
        const assignees = data.assignees || [];

        if (responsible.toLowerCase() === 'eu' || assignees.some(a => a.toLowerCase() === 'eu')) {
            console.log(`Task ID=${doc.id}, Title="${data.title}", Responsible="${responsible}", Assignees=${JSON.stringify(assignees)}`);
        }
    });

    // 3. Check chats/contacts
    const chatsSnap = await getDocs(collection(db, "chats"));
    console.log("\n--- Chats with 'Eu' Agent ---");
    chatsSnap.forEach(doc => {
        const data = doc.data();
        if (data.agent?.toLowerCase() === 'eu') {
            console.log(`Chat ID=${doc.id}, Name="${data.name}", Agent="${data.agent}"`);
        }
    });

    console.log("\nDone.");
}

checkEu().catch(console.error);
