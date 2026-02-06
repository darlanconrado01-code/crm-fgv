{
  "name": "CRM - Webhook + Check + Auto Sync Photo (V5 - Direct)",
  "nodes": [
    {
      "parameters": {
        "method": "POST",
        "url": "https://evo.canvazap.com.br/chat/fetchProfilePictureUrl/TestesAgencia02",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "D90BEE457EBF-4EF8-AF50-FCD130C8DEC4"
            },
            {
              "name": "Accept",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "5591984034863"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -3376,
        2064
      ],
      "id": "c45b22e9-1c38-4bfa-a7c2-287173b909cb",
      "name": "HTTP Request"
    },
    {
      "parameters": {
        "content": "## Agente SDR - Primeiro Contato",
        "height": 400,
        "width": 480,
        "color": 5
      },
      "type": "n8n-nodes-base.stickyNote",
      "typeVersion": 1,
      "position": [
        -4432,
        2288
      ],
      "id": "bf531d31-7216-468d-aab1-0d6f191eb50b",
      "name": "Sticky Note"
    },
    {
      "parameters": {
        "text": "={{ $node[\"Webhook Evolution\"].json.body.data.message.conversation }}",
        "options": {}
      },
      "id": "1dc30215-8191-48aa-9c33-9d9fd08941f1",
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.1,
      "position": [
        -4336,
        2432
      ]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "evolution-webhook",
        "options": {}
      },
      "id": "ec6dcd19-739f-4c03-acce-b4e9fb593d5f",
      "name": "Webhook Evolution",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -6048,
        2496
      ],
      "webhookId": "6889cef8-4c03-4060-87eb-536b325e3776"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "event-check",
              "leftValue": "={{ $json.body.event }}",
              "rightValue": "messages.upsert",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            },
            {
              "id": "from-me-check",
              "leftValue": "={{ $json.body.data.key.fromMe }}",
              "rightValue": false,
              "operator": {
                "type": "boolean",
                "operation": "false"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "956f135c-e315-47ea-979e-db03c258cae2",
      "name": "É do Cliente?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        -5840,
        2496
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://comversa.online/api/n8n-action",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"action\": \"getContact\",\n  \"chatId\": \"{{ $node[\"Webhook Evolution\"].json.body.data.key.remoteJid }}\"\n}",
        "options": {}
      },
      "id": "fb1e7669-dc0e-4aab-a160-327bae825b27",
      "name": "Lead já existe?",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        -5600,
        2496
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://comversa.online/api/webhook?type=evolution",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ $node[\"Webhook Evolution\"].json.body }}",
        "options": {}
      },
      "id": "858f5cfd-f388-43db-9996-bf12a69e85db",
      "name": "Abrir Conversa no CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        -5376,
        2496
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "has-avatar",
              "leftValue": "={{ $node[\"Webhook Evolution\"].json.body.data.imgUrl }}",
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "35f6884e-8551-4749-8f83-e0c68256fc77",
      "name": "Veio Foto no Webhook?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        -5136,
        2400
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://comversa.online/api/n8n-action",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"action\": \"updateAvatar\",\n  \"chatId\": \"{{ $node[\"Webhook Evolution\"].json.body.data.key.remoteJid }}\",\n  \"data\": {\n    \"avatarUrl\": \"{{ $node[\"Webhook Evolution\"].json.body.data.imgUrl }}\"\n  }\n}",
        "options": {}
      },
      "id": "c31befbb-e007-47d6-a797-d6360b4576ed",
      "name": "Sincronizar Foto (Direto)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        -4912,
        2192
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ 'https://evo.canvazap.com.br/chat/fetchProfilePictureUrl/' + $node[\"Webhook Evolution\"].json.body.instance }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "D90BEE457EBF-4EF8-AF50-FCD130C8DEC4"
            },
            {
              "name": "Accept",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"number\": \"{{ $node[\"Webhook Evolution\"].json.body.data.key.remoteJid.split('@')[0] }}\"\n}",
        "options": {}
      },
      "id": "c3fd13e2-6a1b-4a91-ae1e-fbf55c386014",
      "name": "Buscar na Evolution (Forçado)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        -4912,
        2896
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://comversa.online/api/n8n-action",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"action\": \"updateAvatar\",\n  \"chatId\": \"{{ $node[\"Webhook Evolution\"].json.body.data.key.remoteJid }}\",\n  \"data\": {\n    \"avatarUrl\": \"{{ $json.data.profilePictureUrl }}\"\n  }\n}",
        "options": {}
      },
      "id": "546cf2d3-de76-40a5-ad6c-c7b9e8e295e4",
      "name": "Atualizar CRM com Foto Forçada",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        -4672,
        2528
      ]
    },
    {
      "parameters": {
        "options": {}
      },
      "id": "3f2d64f6-f553-448f-b814-565d641585fd",
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "position": [
        -4544,
        2656
      ],
      "credentials": {
        "openAiApi": {
          "id": "GMT5FPmtLJiR26rC",
          "name": "OpenAi account"
        }
      }
    }
  ],
  "pinData": {},
  "connections": {
    "Webhook Evolution": {
      "main": [
        [
          {
            "node": "É do Cliente?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "É do Cliente?": {
      "main": [
        [
          {
            "node": "Lead já existe?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Lead já existe?": {
      "main": [
        [
          {
            "node": "Abrir Conversa no CRM",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Abrir Conversa no CRM": {
      "main": [
        [
          {
            "node": "Veio Foto no Webhook?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Veio Foto no Webhook?": {
      "main": [
        [
          {
            "node": "Sincronizar Foto (Direto)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar na Evolution (Forçado)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Sincronizar Foto (Direto)": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar na Evolution (Forçado)": {
      "main": [
        [
          {
            "node": "Atualizar CRM com Foto Forçada",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Atualizar CRM com Foto Forçada": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "054e2e12-4fef-45a2-afdc-7e5eb3afebbb",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "9afdb11c3639e4ac01660c283f45afb5bc718554bf9997d00bb258cc5f095480"
  },
  "id": "jRHuTVFw3zIhYb6M",
  "tags": []
}