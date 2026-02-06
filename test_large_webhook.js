const url = 'http://localhost:3021/api/webhook'; // Webhook URL

(async () => {
    const textBase = "Calendário de Conteúdo\n";
    const largeText = textBase.repeat(2000); // ~46KB
    const extremeLargeText = textBase.repeat(20000); // ~460KB

    const tests = [
        {
            name: "Extended (46KB)",
            payload: {
                event: "messages.upsert",
                data: {
                    key: { remoteJid: "120363247342384541@g.us", fromMe: false, id: "TEST_EXTENDED_" + Date.now() },
                    message: { extendedTextMessage: { text: largeText } },
                    pushName: "Teste Grande"
                }
            }
        },
        {
            name: "Bare (46KB)",
            payload: {
                event: "messages.upsert",
                data: {
                    key: { remoteJid: "120363247342384541@g.us", fromMe: false, id: "TEST_BARE_" + Date.now() },
                    extendedTextMessage: { text: largeText },
                    pushName: "Teste Bare"
                }
            }
        },
        {
            name: "Extreme (460KB)",
            payload: {
                event: "messages.upsert",
                data: {
                    key: { remoteJid: "120363247342384541@g.us", fromMe: false, id: "TEST_EXTREME_" + Date.now() },
                    message: { extendedTextMessage: { text: extremeLargeText } },
                    pushName: "Teste Extremo"
                }
            }
        }
    ];

    for (const test of tests) {
        console.log(`Running test: ${test.name}...`);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(test.payload)
            });
            console.log(`${test.name} - Status: ${response.status}`);
            const data = await response.text();
            console.log(`${test.name} - Response data:`, data);
        } catch (e) {
            console.error(`${test.name} - Error:`, e.message);
        }
    }
})();
