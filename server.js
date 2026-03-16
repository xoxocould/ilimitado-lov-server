const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ilimitado-lov-server', timestamp: new Date().toISOString() });
});

// Main webhook endpoint - recebe mensagens da extensão e envia para a API do Lovable
app.post('/webhook', async (req, res) => {
  const { message, projectId, token } = req.body;

  // Ping de diagnóstico
  if (message === '__ping__') {
    return res.json({ status: 'ok', reply: 'pong' });
  }

  if (!message || !projectId || !token) {
    return res.status(400).json({ error: 'Campos obrigatórios: message, projectId, token' });
  }

  try {
    // Envia a mensagem para a API do Lovable
    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    if (!lovableRes.ok) {
      const errText = await lovableRes.text().catch(() => '');
      console.error(`Lovable API error ${lovableRes.status}:`, errText.slice(0, 300));
      return res.status(lovableRes.status).json({
        error: `Lovable API retornou ${lovableRes.status}`,
        details: errText.slice(0, 200)
      });
    }

    const data = await lovableRes.json();
    return res.json({ reply: data.reply || data.message || 'Mensagem enviada com sucesso!' });

  } catch (err) {
    console.error('Erro ao chamar Lovable API:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ilimitado-lov-server rodando na porta ${PORT}`);
});
