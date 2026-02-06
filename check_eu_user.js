
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTasks() {
    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef.get();

    const tasksWithEu = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        const isEu = data.responsible === 'Eu' ||
            (data.assignees && data.assignees.includes('Eu')) ||
            data.responsible === 'eu' ||
            (data.assignees && data.assignees.includes('eu'));

        if (isEu) {
            tasksWithEu.push({ id: doc.id, title: data.title, responsible: data.responsible, assignees: data.assignees });
        }
    });

    console.log('Tasks with "Eu" as responsible or assignee:');
    console.log(JSON.stringify(tasksWithEu, null, 2));

    // Check contacts as well
    const contactsRef = db.collection('contacts');
    const contactSnapshot = await contactsRef.get();
    const contactsWithEu = [];
    contactSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.agent === 'Eu' || data.agent === 'eu') {
            contactsWithEu.push({ id: doc.id, name: data.name, agent: data.agent });
        }
    });

    console.log('\nContacts with "Eu" as agent:');
    console.log(JSON.stringify(contactsWithEu, null, 2));

    process.exit(0);
}

checkTasks().catch(console.error);
