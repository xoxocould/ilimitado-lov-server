const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────
// BUNDLE INLINE (runtime mínimo da extensão)
// ─────────────────────────────────────────────
const BUNDLE_CODE = `
var RuntimeEntry = {
  sidepanel: function() {
    if (typeof Bridge !== 'undefined' && Bridge.ui) {
      Bridge.ui.setStatus('Runtime carregado com sucesso.');
    }
  },
  background: function() {}
};
`;

// Calcula hash SHA-256 do bundle em memória
function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

const BUNDLE_HASH = sha256(BUNDLE_CODE);
const BASE_URL = process.env.BASE_URL || 'https://ilimitado-lov-server.onrender.com';

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ilimitado-lov-server',
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// MANIFESTO REMOTO
// Extensão chama: GET /ext/runtime/manifest
// ─────────────────────────────────────────────
app.get('/ext/runtime/manifest', (req, res) => {
  res.json({
    version: '1.0.0',
    bundle_url: `${BASE_URL}/ext/runtime/bundle.js`,
    hash_sha256: BUNDLE_HASH,
    signature: 'bypass'   // assinatura desabilitada na extensão
  });
});

// ─────────────────────────────────────────────
// BUNDLE JS
// Extensão chama: GET /ext/runtime/bundle.js
// ─────────────────────────────────────────────
app.get('/ext/runtime/bundle.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(BUNDLE_CODE);
});

// ─────────────────────────────────────────────
// UI REMOTA (iframe no sidepanel)
// Extensão chama: GET /ext/runtime/ui/sidepanel.html
// ─────────────────────────────────────────────
app.get('/ext/runtime/ui/sidepanel.html', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infinity Credits</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0d0f;
      color: #e2e8f0;
      font-family: Inter, -apple-system, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #3b82f6;
      letter-spacing: -0.5px;
    }
    .status {
      font-size: 13px;
      color: #94a3b8;
    }
    .badge {
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.3);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 12px;
      color: #bfdbfe;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="logo">⚡ Infinity Credits</div>
  <div class="badge">Ativo</div>
  <div class="status">Guardião e interceptador em execução.</div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ─────────────────────────────────────────────
// ENVIAR PROMPT PARA O LOVABLE
// Extensão chama: POST /send-msg/:projectId/
// Body: { message, authToken, files?, deviceId?, plan? }
// ─────────────────────────────────────────────
app.post('/send-msg/:projectId/', async (req, res) => {
  const { projectId } = req.params;
  const { message, authToken, files, plan } = req.body;

  if (!projectId || !message || !authToken) {
    return res.status(400).json({
      success: false,
      detail: 'Campos obrigatórios ausentes: projectId, message, authToken.'
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        message,
        ...(Array.isArray(files) && files.length > 0 ? { files } : {}),
        ...(plan ? { plan: true } : {})
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await lovableRes.json().catch(() => ({}));

    if (!lovableRes.ok) {
      console.error(`Lovable API error ${lovableRes.status}:`, data);
      return res.status(lovableRes.status).json({
        success: false,
        detail: data?.message || data?.error || `Lovable API retornou ${lovableRes.status}`
      });
    }

    return res.json({
      success: true,
      detail: 'Mensagem enviada via Infinity Credits.',
      payload: data
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('Erro ao chamar Lovable API:', err.message);
    return res.status(500).json({
      success: false,
      detail: isTimeout ? 'Tempo limite ao chamar a API do Lovable.' : `Erro interno: ${err.message}`
    });
  }
});

// ─────────────────────────────────────────────
// APLICAR PLANO (botão Approve)
// Extensão chama: POST /apply-plan-from-latest
// Body: { authToken, projectId, deviceId? }
// ─────────────────────────────────────────────
app.post('/apply-plan-from-latest', async (req, res) => {
  const { authToken, projectId } = req.body;

  if (!authToken || !projectId) {
    return res.status(400).json({
      success: false,
      detail: 'Campos obrigatórios ausentes: authToken, projectId.'
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Busca o último plano pendente do projeto
    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/apply-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({}),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await lovableRes.json().catch(() => ({}));

    if (!lovableRes.ok) {
      console.error(`Lovable apply-plan error ${lovableRes.status}:`, data);
      return res.status(lovableRes.status).json({
        success: false,
        detail: data?.message || data?.error || `Lovable API retornou ${lovableRes.status}`
      });
    }

    return res.json({
      success: true,
      detail: 'Plano aplicado com sucesso.',
      planFound: true,
      payload: data
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('Erro ao aplicar plano:', err.message);
    return res.status(500).json({
      success: false,
      detail: isTimeout ? 'Tempo limite ao aplicar plano.' : `Erro interno: ${err.message}`
    });
  }
});

// ─────────────────────────────────────────────
// WEBHOOK LEGADO (compatibilidade)
// ─────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const { message, projectId, token } = req.body;

  if (message === '__ping__') {
    return res.json({ status: 'ok', reply: 'pong' });
  }

  if (!message || !projectId || !token) {
    return res.status(400).json({ error: 'Campos obrigatórios: message, projectId, token' });
  }

  try {
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
      return res.status(lovableRes.status).json({
        error: `Lovable API retornou ${lovableRes.status}`,
        details: errText.slice(0, 200)
      });
    }

    const data = await lovableRes.json();
    return res.json({ reply: data.reply || data.message || 'Mensagem enviada com sucesso!' });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
});

// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📦 Bundle hash: ${BUNDLE_HASH}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
});
