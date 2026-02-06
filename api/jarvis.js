
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit, orderBy, Timestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { message, user } = req.body || {};
    if (!message) return res.status(400).json({ status: 'error', message: 'Message is required' });

    try {
        const configDoc = await getDoc(doc(db, "settings", "evolution"));
        const settings = configDoc.exists() ? configDoc.data() : {};
        const openaiKey = settings.openaiApiKey;
        if (!openaiKey) throw new Error("Chave OpenAI não configurada");

        // --- DEFINIÇÃO DE FERRAMENTAS (TOOLS) PARA O JARVIS ---
        const tools = [
            {
                type: "function",
                function: {
                    name: "get_user_stats",
                    description: "Retorna estatísticas do usuário atual (atendimentos abertos, tarefas, reuniões).",
                    parameters: { type: "object", properties: {} }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_user_tasks",
                    description: "Retorna as tarefas pendentes do usuário.",
                    parameters: { type: "object", properties: {} }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_next_meetings",
                    description: "Retorna os próximos compromissos da agenda do usuário.",
                    parameters: { type: "object", properties: {} }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_contacts",
                    description: "Pesquisa contatos na base por nome ou número.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Nome ou número para pesquisar" }
                        },
                        required: ["query"]
                    }
                }
            }
        ];

        // 1. PRIMEIRA CHAMADA PARA A IA
        const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Você é o Jarvis, o assistente inteligente de elite do CRM FGV. 
                        Você ajuda o atendente ${user.name} (${user.role}) a gerenciar a plataforma.
                        Você tem acesso a ferramentas para buscar dados em tempo real.
                        Seja profissional, eficiente e direto, mas com um toque de inteligência artificial futurista.
                        Sempre responda em Português do Brasil.`
                    },
                    { role: "user", content: message }
                ],
                tools: tools,
                tool_choice: "auto"
            })
        });

        const initialData = await initialResponse.json();
        if (!initialResponse.ok) throw new Error(initialData.error?.message || 'Erro na IA');

        const messageObj = initialData.choices[0].message;

        // SE NÃO PRECISAR DE FERRAMENTA, RETORNAMOS A RESPOSTA DIRETA
        if (!messageObj.tool_calls) {
            return res.status(200).json({ status: 'success', response: messageObj.content });
        }

        // 2. EXECUTAR AS FERRAMENTAS SOLICITADAS
        const toolOutputs = [];
        for (const toolCall of messageObj.tool_calls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let output = "";

            if (functionName === "get_user_stats") {
                const chatsSnap = await getDocs(query(collection(db, "chats"), where("agent", "==", user.name), where("status", "==", "atendimento")));
                const tasksSnap = await getDocs(query(collection(db, "tasks"), where("responsible", "==", user.name), where("status", "==", "pending")));
                output = JSON.stringify({
                    open_chats: chatsSnap.size,
                    pending_tasks: tasksSnap.size,
                    userName: user.name
                });
            } else if (functionName === "get_user_tasks") {
                const tasksSnap = await getDocs(query(collection(db, "tasks"), where("responsible", "==", user.name), where("status", "==", "pending"), limit(10)));
                const tasks = tasksSnap.docs.map(d => ({ title: d.data().title, project: d.data().projectId, deadline: d.data().date }));
                output = JSON.stringify(tasks);
            } else if (functionName === "get_next_meetings") {
                const now = new Date().toISOString().split('T')[0];
                const meetingsSnap = await getDocs(query(collection(db, "agenda_events"), where("responsible", "==", user.name), where("startDate", ">=", now), limit(5)));
                const meetings = meetingsSnap.docs.map(d => ({ title: d.data().title, date: d.data().startDate, time: d.data().startTime }));
                output = JSON.stringify(meetings);
            } else if (functionName === "search_contacts") {
                const q = args.query.toLowerCase();
                // Busca simples (o Firebase tem limitações, mas vamos buscar os top 5)
                const contactsSnap = await getDocs(query(collection(db, "contacts"), limit(20)));
                const filtered = contactsSnap.docs
                    .map(d => ({ name: d.data().name, id: d.id }))
                    .filter(c => (c.name || "").toLowerCase().includes(q) || c.id.includes(q))
                    .slice(0, 5);
                output = JSON.stringify(filtered);
            }

            toolOutputs.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: functionName,
                content: output
            });
        }

        // 3. SEGUNDA CHAMADA COM OS RESULTADOS DAS FERRAMENTAS
        const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "Você é o Jarvis. Use as informações das ferramentas para responder ao usuário." },
                    { role: "user", content: message },
                    messageObj,
                    ...toolOutputs
                ]
            })
        });

        const finalData = await finalResponse.json();
        if (!finalResponse.ok) throw new Error(finalData.error?.message || 'Erro na IA Final');

        return res.status(200).json({ status: 'success', response: finalData.choices[0].message.content });

    } catch (error) {
        console.error("Jarvis Error:", error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
