const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==============================
// Rota de saúde (health check)
// ==============================
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Ilimitado Lov Server rodando!' });
});

// ==============================
// Webhook principal
// Recebe: { message, projectId, token }
// Envia para o Lovable e retorna resposta
// ==============================
app.post('/webhook/promptxexe', async (req, res) => {
    const { message, projectId, token } = req.body;

    console.log(`[${new Date().toISOString()}] Recebido:`);
    console.log('  projectId:', projectId);
    console.log('  message:', message?.slice(0, 80));
    console.log('  token[:20]:', token?.substring(0, 20));

    // Validação básica
    if (!message || !projectId || !token) {
        return res.status(400).json({
            error: 'Campos obrigatórios: message, projectId, token'
        });
    }

    // Ping de teste (enviado pelo diagnóstico da extensão)
    if (message === '__ping__') {
        return res.json({ status: 'ok', reply: 'pong' });
    }

    try {
        // -----------------------------------------------
        // Tenta enviar mensagem para o Lovable via API
        // -----------------------------------------------

        // Endpoint 1: API pública (se existir)
        let lovableRes = await fetch(
            `https://api.lovable.dev/api/v1/projects/${projectId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: message })
            }
        );

        // Se a API pública não funcionar, tenta endpoint interno
        if (!lovableRes.ok) {
            console.log(`API pública retornou ${lovableRes.status}, tentando endpoint interno...`);

            lovableRes = await fetch(
                `https://lovable.dev/api/chat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Cookie': `sb-access-token=${token}`,
                        'Origin': 'https://lovable.dev',
                        'Referer': `https://lovable.dev/projects/${projectId}`
                    },
                    body: JSON.stringify({
                        message: message,
                        project_id: projectId
                    })
                }
            );
        }

        // Lê o corpo da resposta
        const responseText = await lovableRes.text();
        console.log(`  Lovable status: ${lovableRes.status}`);
        console.log(`  Lovable response: ${responseText.slice(0, 200)}`);

        if (lovableRes.ok) {
            try {
                const data = JSON.parse(responseText);
                return res.json({
                    status: 'ok',
                    reply: data.reply || data.message || data.content || '✅ Mensagem enviada ao Lovable!',
                    raw: data
                });
            } catch (e) {
                return res.json({
                    status: 'ok',
                    reply: '✅ Mensagem enviada ao Lovable!'
                });
            }
        } else {
            // Retorna o erro do Lovable com detalhes
            return res.status(lovableRes.status).json({
                error: `Lovable retornou ${lovableRes.status}`,
                details: responseText.slice(0, 500)
            });
        }

    } catch (err) {
        console.error('Erro no servidor:', err.message);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
