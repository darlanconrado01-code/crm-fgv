
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs, limit, Timestamp } from "firebase/firestore";

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
    if (req.method !== 'POST' && req.method !== 'OPTIONS') return res.status(405).send('Method not allowed');
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action: queryAction } = req.query || {};
    const { action: bodyAction, chatId, days, messages: manualMessages, taskContext, audioUrl, projects } = req.body || {};
    const action = queryAction || bodyAction;

    try {
        const configDoc = await getDoc(doc(db, "settings", "evolution"));
        const settings = configDoc.exists() ? configDoc.data() : {};
        const openaiKey = settings.openaiApiKey;
        if (!openaiKey) throw new Error("Chave OpenAI não configurada");

        // --- TRANSCRIBE ---
        if (action === 'transcribe' || (audioUrl && !action)) {
            if (!audioUrl) throw new Error("URL do áudio não fornecida.");
            const formData = new FormData();
            if (audioUrl.startsWith('data:')) {
                const base64Data = audioUrl.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const blob = new Blob([buffer], { type: 'audio/ogg' });
                formData.append('file', blob, 'audio.oga');
            } else {
                const audioResponse = await fetch(audioUrl);
                const blob = await audioResponse.blob();
                formData.append('file', blob, 'audio.oga');
            }
            formData.append('model', 'whisper-1');
            formData.append('language', 'pt');
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro ao transcrever áudio');
            return res.status(200).json({ status: 'success', text: data.text });
        }

        // --- DEEP ANALYSIS / EVALUATE / DETECT APPOINTMENT ---
        let messagesText = "";
        if (manualMessages && manualMessages.length > 0) {
            messagesText = manualMessages.map(m => `[${m.sender}]: ${m.text || '(Mídia)'}`).join('\n');
        } else if (chatId) {
            const numDays = days || 2;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - numDays);
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(messagesRef, where("timestamp", ">=", Timestamp.fromDate(startDate)), orderBy("timestamp", "asc"));
            const snapshot = await getDocs(q);
            messagesText = snapshot.docs.map(doc => {
                const d = doc.data();
                const sender = d.fromMe ? 'Atendente' : (d.pushName || 'Lead');
                return `${sender}: ${d.text || '(Mídia)'}`;
            }).join('\n');
        }

        if (!messagesText && action !== 'detect-appointment') {
            return res.status(200).json({ status: 'no_messages' });
        }

        let prompt = "";
        let model = "gpt-4o";

        const projectsList = projects ? projects.map(p => `- ${p.title} (ID: ${p.id})`).join('\n') : 'Não há projetos cadastrados.';

        if (action === 'detect-appointment') {
            model = "gpt-4o-mini";
            const now = new Date();
            prompt = `Analise a conversa abaixo e identifique se há a intenção de marcar um compromisso...\nDATA ATUAL: ${now.toLocaleDateString('pt-BR')}\nCONVERSA:\n${messagesText}\nRetorne JSON: {detected, title, date, time, participants, reason, summary}`;
        } else if (taskContext) {
            prompt = `Você é um assistente de CRM de elite. Sua tarefa é analisar as mensagens selecionadas abaixo e preparar uma TAREFA SMART.
            
            1. Crie um TÍTULO curto e profissional que descreva a ação necessária (ex: "Enviar orçamento de 100 cordões").
            2. Identifique o PROJETO que melhor se encaixa nesta tarefa dentre os projetos abaixo. Se nenhum encaixar perfeitamente, sugira o mais próximo.
            3. Escreva uma DESCRIÇÃO detalhada baseada em TODAS as mensagens, organizando os detalhes.
            4. Se as mensagens mencionarem data ou prazo, inclua na descrição.

            PROJETOS DISPONÍVEIS:
            ${projectsList}

            CONVERSA:
            ${messagesText}

            Retorne EXCLUSIVAMENTE um objeto JSON: 
            {
              "summary": "resumo curto",
              "events": [{
                "type": "task",
                "title": "Título da Tarefa",
                "description": "Descrição completa e organizada",
                "projectId": "ID_DO_PROJETO_SELECIONADO",
                "column": "Nome da coluna inicial ou sugerida"
              }]
            }`;
        } else if (action === 'improve-text') {
            const originalText = req.body.text;
            if (!originalText) throw new Error("Texto para melhorar não fornecido.");
            model = "gpt-4o";
            prompt = `Você é um editor de texto de alta performance. Sua tarefa é pegar a transcrição de áudio abaixo e transformá-la em um texto profissional, corrigindo gaguejos, repetições desnecessárias e erros gramaticais, mas MANTENDO exatamente o sentido e o tom original. 
            
            TEXTO ORIGINAL:
            "${originalText}"
            
            Retorne EXCLUSIVAMENTE um objeto JSON:
            {
              "improvedText": "texto corrigido e fluido aqui"
            }`;
        } else if (action === 'parse-intent') {
            const commandText = req.body.text;
            if (!commandText) throw new Error("Texto do comando não fornecido.");

            model = "gpt-4o"; // Use smart model for intent
            prompt = `Você é um "Action Dispatcher" de um CRM. Sua função é ler o comando do usuário e mapear para uma ação do sistema.

            COMANDO DO USUÁRIO:
            "${commandText}"

            AÇÕES DISPONÍVEIS:
            1. "send_message": Enviar mensagem de texto para um contato.
               - Extrair: "contactName" (nome da pessoa) e "messageContent" (conteúdo da mensagem).
            2. "unknown": Se não entender ou não houver ação clara.

            Retorne EXCLUSIVAMENTE um objeto JSON:
            {
              "intent": "send_message" | "unknown",
              "data": {
                 "contactName": "Nome encontrado ou null",
                 "messageContent": "Conteúdo da mensagem ou null"
              },
              "reason": "Explicação curta do que entendeu"
            }`;
        } else {
            const now = new Date();
            const daysOfWeek = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
            const currentDayName = daysOfWeek[now.getDay()];

            prompt = `Você é um analista de CRM sênior. Sua tarefa é analisar a conversa abaixo e extrair informações cruciais.
            
            DATA ATUAL: ${now.toLocaleDateString('pt-BR')} (Hoje é ${currentDayName})
            HORA ATUAL: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

            INSTRUÇÕES:
            1. RESUMO: Crie um resumo executivo da conversa.
            2. QUALIFICAÇÃO: Avalie o lead e dê insights sobre o momento de compra.
            3. EVENTOS: Identifique TODOS os compromissos, reuniões ou tarefas mencionadas.
               - IMPORTANTE: Se o texto disser "amanhã", "sexta que vem", "daqui a 2 dias", CALCULE a data exata baseada na DATA ATUAL fornecida acima.
               - Retorne a data no formato AAAA-MM-DD.
               - Retorne a hora no formato HH:MM (24h).
               - Se for uma reunião, use type: "meeting". Se for apenas uma ação a fazer, use type: "task".

            CONVERSA:
            ${messagesText}

            Retorne EXCLUSIVAMENTE um objeto JSON:
            {
              "summary": "texto do resumo",
              "qualification": "texto da qualificação",
              "events": [
                {
                  "type": "meeting" | "task",
                  "title": "Título curto e claro",
                  "description": "Explicação do que deve ser feito",
                  "date": "YYYY-MM-DD",
                  "time": "HH:MM"
                }
              ]
            }`;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro na IA');
        const result = JSON.parse(data.choices[0].message.content);
        return res.status(200).json({ status: 'success', ...result });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
