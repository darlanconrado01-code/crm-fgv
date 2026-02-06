# 📚 Documentação da API de Integração - CRM FGV

Esta documentação detalha os endpoints disponíveis para integrar o sistema com ferramentas externas como **n8n**, **Make** ou scripts personalizados.

---

## 🚀 URLs de Acesso
- **Front-end (Painel):** `https://comversa.online`
- **Base API (Produção):** `https://comversa.online`
- **Base API (Local):** `http://localhost:3020` (Via Vite Proxy) ou `http://localhost:3021` (Direto no SDR)

---

## 🔑 Autenticação
Todas as requisições devem incluir o cabeçalho de autorização:
- **Header:** `Authorization`
- **Value:** `Bearer cv_vpdmp2uusecjze6w0vs6`

---

## 1. Contatos e CRM
Endpoints para gerenciar os dados dos leads.

### Listar Contatos
- **Endpoint:** `GET /api/contacts`
- **Descrição:** Retorna os últimos 200 contatos.

### Detalhes do Contato
- **Endpoint:** `GET /api/contacts/{phone}`
- **Exemplo:** `/api/contacts/559198000000`

### Criar/Atualizar Contato
- **Endpoint:** `POST /api/contacts`
- **Body:** `{ "id": "55...", "name": "Nome", "cpf": "..." }`

---

## 2. Ações de Sistema (n8n-action)
Endpoint central para manipular o estado dos chats e contatos.

- **Endpoint:** `POST /api/n8n-action`

### Exemplo de Corpo (JSON):
```json
{
  "action": "updateStatus",
  "chatId": "559198000000",
  "data": { "status": "aguardando" }
}
```

### Ações Disponíveis:
| Ação | Descrição |
| :--- | :--- |
| `updateStatus` | Muda o chat de aba (`aguardando`, `atendimento`, `resolvido`, `bot`). |
| `addTag` | Adiciona etiqueta ao contato/chat. |
| `setField` | Preenche campo personalizado (ex: `cpf`, `curso_interesse`). |
| `assignAgent` | Define atendente (`agentId`, `agentName`). |
| `addMessage` | Insere um comentário/log do sistema no chat. |

---

## 3. Envio de Mensagens (WhatsApp)
Dispara o envio real de mensagens.

- **Endpoint:** `POST /api/send-message`
- **Alias:** `POST /api/send/{to}`

### JSON de Exemplo:
```json
{
  "chatId": "559198000000",
  "text": "Olá! Teste de API.",
  "type": "text"
}
```

---

## 4. IA e Utilitários
- **Transcrição:** `POST /api/transcribe` (Envia `audioUrl`).
- **Sincronizar Perfil:** `POST /api/sync-profile` (Atualiza foto via Evolution).
- **Análise Profunda:** `POST /api/deep-analysis` (Gera resumo/tarefas).

---

## 📁 Localização do Código
Se precisar ajustar a lógica da API:
- Handlers: `d:\sistemas\CRM FGV\api\*.js`
- Servidor Local: `d:\sistemas\CRM FGV\webhook_receiver.js`
- Painel de Docs: `d:\sistemas\CRM FGV\components\DocsView.tsx`
