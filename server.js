const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || 'https://ilimitado-lov-server.onrender.com';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────
// BUNDLE RUNTIME (mínimo — lógica real fica no background.js da extensão)
// ─────────────────────────────────────────
const BUNDLE_CODE = `var RuntimeEntry = {
  sidepanel: function() {
    if (typeof Bridge !== 'undefined' && Bridge.ui) {
      Bridge.ui.setStatus('Runtime carregado.');
    }
  },
  background: function() {}
};`;

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
const BUNDLE_HASH = sha256(BUNDLE_CODE);

// ─────────────────────────────────────────
// PAINEL UI COMPLETO
// ─────────────────────────────────────────
const SIDEPANEL_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Infinity Credits</title>
<style>
  :root {
    --bg: #0a0d0f;
    --card: #111518;
    --accent: #3b82f6;
    --accent-dim: rgba(59,130,246,0.1);
    --accent-border: rgba(59,130,246,0.24);
    --green: #22c55e;
    --green-dim: rgba(34,197,94,0.1);
    --green-border: rgba(34,197,94,0.3);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.08);
    --red-border: rgba(239,68,68,0.3);
    --yellow: #f59e0b;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --border: rgba(148,163,184,0.12);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, -apple-system, sans-serif; }
  html, body { width: 100%; height: 100%; background: var(--bg); color: var(--text); overflow-x: hidden; }

  .app { display: flex; flex-direction: column; height: 100vh; }

  /* HEADER */
  .header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .header-icon { font-size: 22px; }
  .header-title { font-size: 15px; font-weight: 800; color: #bfdbfe; letter-spacing: -0.3px; }
  .header-version { font-size: 10px; color: var(--muted); margin-left: auto; background: var(--accent-dim); border: 1px solid var(--accent-border); border-radius: 6px; padding: 2px 7px; }

  /* STATUS BAR */
  .status-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    font-size: 11px; color: var(--muted);
    flex-shrink: 0;
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
  .dot.green { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .dot.red { background: var(--red); }
  .dot.yellow { background: var(--yellow); animation: pulse 1.2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* SCROLL AREA */
  .scroll { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .scroll::-webkit-scrollbar { width: 4px; }
  .scroll::-webkit-scrollbar-track { background: transparent; }
  .scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 4px; }

  /* CARDS */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
  }
  .card-header-left { display: flex; align-items: center; gap: 8px; }
  .card-icon { font-size: 14px; }
  .card-title { font-size: 12px; font-weight: 700; color: #dbeafe; }
  .card-arrow { font-size: 11px; color: var(--muted); transition: transform .2s; }
  .card-arrow.open { transform: rotate(180deg); }
  .card-body { padding: 12px 14px; display: none; }
  .card-body.open { display: block; }

  /* TOGGLE */
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
  }
  .toggle-info { display: flex; flex-direction: column; gap: 2px; }
  .toggle-label { font-size: 12px; font-weight: 700; color: var(--text); }
  .toggle-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }
  .toggle {
    position: relative; width: 40px; height: 22px; flex-shrink: 0;
    background: rgba(148,163,184,0.2); border-radius: 999px; cursor: pointer;
    transition: background .2s; border: none; outline: none;
  }
  .toggle.on { background: var(--accent); }
  .toggle::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%; background: white;
    transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  .toggle.on::after { transform: translateX(18px); }
  .toggle:disabled { opacity: 0.5; cursor: not-allowed; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer;
    border: 1px solid var(--accent-border); background: var(--accent-dim);
    color: #dbeafe; padding: 8px 12px; transition: all .15s; width: 100%;
  }
  .btn:hover:not(:disabled) { border-color: rgba(59,130,246,0.5); transform: translateY(-1px); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn.green { background: var(--green-dim); border-color: var(--green-border); color: #bbf7d0; }
  .btn.red { background: var(--red-dim); border-color: var(--red-border); color: #fecaca; }
  .btn.sm { padding: 6px 10px; font-size: 11px; width: auto; }
  .btn-row { display: flex; gap: 8px; }
  .btn-row .btn { flex: 1; }

  /* TEXTAREA / INPUT */
  .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
  .field label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  textarea, input[type="text"] {
    width: 100%; background: rgba(15,23,42,0.8); border: 1px solid rgba(148,163,184,0.18);
    border-radius: 8px; color: var(--text); font-size: 12px; padding: 9px 10px;
    resize: none; outline: none; font-family: inherit;
    transition: border-color .15s;
  }
  textarea:focus, input[type="text"]:focus { border-color: rgba(59,130,246,0.5); }
  textarea { min-height: 80px; max-height: 180px; }

  /* PILL BADGES */
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; border-radius: 6px; padding: 2px 8px;
    border: 1px solid;
  }
  .pill.green { background: var(--green-dim); border-color: var(--green-border); color: #86efac; }
  .pill.red { background: var(--red-dim); border-color: var(--red-border); color: #fca5a5; }
  .pill.blue { background: var(--accent-dim); border-color: var(--accent-border); color: #93c5fd; }
  .pill.yellow { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #fcd34d; }

  /* TOAST */
  #toast {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%) translateY(8px);
    background: rgba(2,6,23,0.96); border: 1px solid var(--accent-border);
    color: #dbeafe; font-size: 11px; font-weight: 700; padding: 8px 14px;
    border-radius: 10px; z-index: 9999; opacity: 0; pointer-events: none;
    transition: opacity .18s, transform .18s; white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  #toast.green { border-color: var(--green-border); }
  #toast.red { border-color: var(--red-border); color: #fca5a5; }

  /* HISTORY */
  .msg { padding: 8px 10px; border-radius: 8px; margin-bottom: 6px; font-size: 11px; line-height: 1.5; }
  .msg.user { background: var(--accent-dim); border: 1px solid var(--accent-border); color: #bfdbfe; }
  .msg.assistant { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); color: #bbf7d0; }
  .msg-role { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; opacity: .7; }
  .history-empty { font-size: 11px; color: var(--muted); text-align: center; padding: 16px 0; }

  /* SUGGESTIONS */
  .suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .suggestion-btn {
    font-size: 11px; font-weight: 600; padding: 4px 10px;
    border-radius: 20px; cursor: pointer; border: 1px solid var(--accent-border);
    background: var(--accent-dim); color: #93c5fd; transition: all .15s;
  }
  .suggestion-btn:hover { background: rgba(59,130,246,0.2); }

  /* TAB NAV */
  .tab-nav { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .tab-btn {
    flex: 1; padding: 9px 6px; font-size: 11px; font-weight: 700;
    color: var(--muted); background: transparent; border: none;
    border-bottom: 2px solid transparent; cursor: pointer; transition: all .15s;
  }
  .tab-btn.active { color: #93c5fd; border-bottom-color: var(--accent); }

  /* DIVIDER */
  .divider { height: 1px; background: var(--border); margin: 8px 0; }

  /* INFO ROW */
  .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .info-label { font-size: 11px; color: var(--muted); }
  .info-value { font-size: 11px; font-weight: 600; color: var(--text); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
</head>
<body>
<div class="app">

  <!-- HEADER -->
  <div class="header">
    <span class="header-icon">⚡</span>
    <span class="header-title">Infinity Credits</span>
    <span class="header-version" id="extVersion">v3.0.0</span>
  </div>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <div class="dot" id="statusDot"></div>
    <span id="statusText">Conectando...</span>
    <span style="margin-left:auto" id="projectBadge"></span>
  </div>

  <!-- TAB NAV -->
  <div class="tab-nav">
    <button class="tab-btn active" onclick="switchTab('painel')">🛡️ Painel</button>
    <button class="tab-btn" onclick="switchTab('prompt')">✏️ Prompt</button>
    <button class="tab-btn" onclick="switchTab('historico')">📜 Histórico</button>
  </div>

  <!-- SCROLL AREA -->
  <div class="scroll">

    <!-- ── TAB: PAINEL ── -->
    <div id="tab-painel">

      <!-- GUARDIÃO -->
      <div class="card">
        <div class="card-header" onclick="toggleCard('guardiao')">
          <div class="card-header-left">
            <span class="card-icon">🔒</span>
            <span class="card-title">Guardião</span>
          </div>
          <span class="card-arrow open" id="arrow-guardiao">▼</span>
        </div>
        <div class="card-body open" id="body-guardiao">
          <div class="toggle-row" style="padding:0 0 12px">
            <div class="toggle-info">
              <span class="toggle-label">Ativar Guardião</span>
              <span class="toggle-desc">Bloqueia envio nativo e redireciona pela API</span>
            </div>
            <button class="toggle" id="toggleGuardian" onclick="handleToggleGuardian()" disabled></button>
          </div>
          <div class="divider"></div>
          <div class="toggle-row" style="padding:12px 0 0">
            <div class="toggle-info">
              <span class="toggle-label">Approve Guard</span>
              <span class="toggle-desc">Intercepta botão Approve do Lovable</span>
            </div>
            <span class="pill" id="approveGuardStatus">—</span>
          </div>
        </div>
      </div>

      <!-- INFO DA ABA -->
      <div class="card">
        <div class="card-header" onclick="toggleCard('tabinfo')">
          <div class="card-header-left">
            <span class="card-icon">📋</span>
            <span class="card-title">Aba Lovable Ativa</span>
          </div>
          <span class="card-arrow open" id="arrow-tabinfo">▼</span>
        </div>
        <div class="card-body open" id="body-tabinfo">
          <div class="info-row">
            <span class="info-label">Project ID</span>
            <span class="info-value" id="infoProjectId">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Auth Token</span>
            <span class="info-value" id="infoAuthToken">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">URL</span>
            <span class="info-value" id="infoTabUrl">—</span>
          </div>
          <div style="margin-top:10px">
            <button class="btn sm green" onclick="openLovableTab()">🔗 Abrir Lovable</button>
          </div>
        </div>
      </div>

      <!-- AÇÕES RÁPIDAS -->
      <div class="card">
        <div class="card-header" onclick="toggleCard('actions')">
          <div class="card-header-left">
            <span class="card-icon">⚡</span>
            <span class="card-title">Ações Rápidas</span>
          </div>
          <span class="card-arrow open" id="arrow-actions">▼</span>
        </div>
        <div class="card-body open" id="body-actions">
          <div class="btn-row" style="margin-bottom:8px">
            <button class="btn green" id="btnApply" onclick="applyPlan()" disabled>✅ Aplicar Plano (Approve)</button>
          </div>
          <div class="btn-row">
            <button class="btn" onclick="refreshState()">🔄 Atualizar Estado</button>
            <button class="btn" onclick="reloadExtension()">♻️ Recarregar Ext.</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ── TAB: PROMPT ── -->
    <div id="tab-prompt" style="display:none">
      <div class="card">
        <div class="card-body open">
          <div class="field">
            <label>Mensagem</label>
            <textarea id="promptInput" placeholder="Digite seu prompt aqui..."></textarea>
          </div>
          <div class="btn-row" style="margin-bottom:10px">
            <button class="btn green" id="btnSend" onclick="sendPrompt()" disabled>🚀 Enviar via API</button>
          </div>
          <div id="suggestionsArea" style="display:none">
            <div class="divider"></div>
            <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Sugestões da aba</div>
            <div class="suggestions" id="suggestionsList"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: HISTÓRICO ── -->
    <div id="tab-historico" style="display:none">
      <div class="card">
        <div class="card-body open" style="padding-bottom:6px">
          <div class="btn-row" style="margin-bottom:10px">
            <button class="btn" onclick="loadHistory()">🔄 Carregar Histórico</button>
          </div>
          <div id="historyList"><div class="history-empty">Clique em "Carregar Histórico"</div></div>
        </div>
      </div>
    </div>

  </div>
</div>

<div id="toast"></div>

<script>
// ── BRIDGE HELPER ──────────────────────────────────────────────
const CHANNEL = 'InfinityRuntimeBridge';
let _reqId = 0;
const _pending = {};

window.addEventListener('message', (e) => {
  if (!e.data || e.data.channel !== CHANNEL || e.data.phase !== 'response') return;
  const cb = _pending[e.data.requestId];
  if (cb) { delete _pending[e.data.requestId]; cb(e.data); }
});

function bridge(command, ...args) {
  return new Promise((resolve, reject) => {
    const requestId = 'r' + (++_reqId);
    _pending[requestId] = (data) => {
      if (data.ok) resolve(data.payload);
      else reject(new Error(data.payload?.error || 'Bridge error'));
    };
    window.parent.postMessage({ channel: CHANNEL, phase: 'request', requestId, command, args }, '*');
    setTimeout(() => {
      if (_pending[requestId]) { delete _pending[requestId]; reject(new Error('Bridge timeout')); }
    }, 8000);
  });
}

// ── TOAST ──────────────────────────────────────────────────────
let _toastTimer = null;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2500);
}

// ── TABS ───────────────────────────────────────────────────────
function switchTab(name) {
  ['painel','prompt','historico'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', ['painel','prompt','historico'][i] === name);
  });
  if (name === 'prompt') loadSuggestions();
  if (name === 'historico') loadHistory();
}

// ── COLLAPSIBLE CARDS ──────────────────────────────────────────
function toggleCard(id) {
  const body = document.getElementById('body-' + id);
  const arrow = document.getElementById('arrow-' + id);
  const open = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
}

// ── STATE ─────────────────────────────────────────────────────
let state = { activeTabId: null, projectId: null, authToken: null, guardianActive: false };

async function refreshState() {
  try {
    // Pegar a aba ativa
    const tabs = await bridge('tabs.query', { active: true, currentWindow: true });
    const tab = Array.isArray(tabs) ? tabs[0] : null;

    if (tab && /lovable\.dev/.test(tab.url || '')) {
      state.activeTabId = tab.id;
      document.getElementById('infoTabUrl').textContent = (tab.url || '').replace('https://','').slice(0,40) + '...';
    } else {
      state.activeTabId = null;
      document.getElementById('infoTabUrl').textContent = 'Nenhuma aba Lovable ativa';
    }

    // Pegar dados do storage
    const storage = await bridge('storage.get', ['projectId', 'authToken', 'lovable_token']);
    state.projectId = storage?.projectId || null;
    state.authToken = storage?.authToken || storage?.lovable_token || null;

    // Atualizar UI
    document.getElementById('infoProjectId').textContent = state.projectId ? state.projectId.slice(0, 20) + '...' : '—';
    document.getElementById('infoAuthToken').textContent = state.authToken ? '••••' + state.authToken.slice(-6) : '—';

    const hasPid = !!state.projectId;
    const hasAuth = !!state.authToken;
    const hasTab = !!state.activeTabId;

    document.getElementById('btnSend').disabled = !(hasPid && hasAuth);
    document.getElementById('btnApply').disabled = !(hasPid && hasAuth);
    document.getElementById('toggleGuardian').disabled = !hasTab;

    // Status bar
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const projectBadge = document.getElementById('projectBadge');

    if (hasPid && hasAuth) {
      dot.className = 'dot green';
      statusText.textContent = 'Pronto — interceptador ativo';
      projectBadge.innerHTML = '<span class="pill blue">Projeto detectado</span>';
    } else if (hasAuth && !hasPid) {
      dot.className = 'dot yellow';
      statusText.textContent = 'Aguardando projeto Lovable';
      projectBadge.innerHTML = '<span class="pill yellow">Abra um projeto</span>';
    } else {
      dot.className = 'dot red';
      statusText.textContent = 'Token não detectado';
      projectBadge.innerHTML = '<span class="pill red">Faça login no Lovable</span>';
    }

    // Guardian state via background
    if (hasTab) {
      const guardRes = await bridge('runtime.sendMessage', { action: 'getGuardianState', tabId: state.activeTabId });
      state.guardianActive = guardRes?.status === 'active';
      updateGuardianToggle();
    }

    // ApproveGuard
    const approveEl = document.getElementById('approveGuardStatus');
    if (hasTab) {
      approveEl.className = 'pill green';
      approveEl.textContent = '✅ Ativo';
    } else {
      approveEl.className = 'pill red';
      approveEl.textContent = '○ Inativo';
    }

    // Versão
    const manifest = await bridge('runtime.getManifest');
    if (manifest?.version) {
      document.getElementById('extVersion').textContent = 'v' + manifest.version;
    }

  } catch (e) {
    document.getElementById('statusDot').className = 'dot red';
    document.getElementById('statusText').textContent = 'Erro ao obter estado';
    console.error('refreshState error:', e);
  }
}

function updateGuardianToggle() {
  const btn = document.getElementById('toggleGuardian');
  btn.className = 'toggle' + (state.guardianActive ? ' on' : '');
}

// ── GUARDIAN ─────────────────────────────────────────────────
async function handleToggleGuardian() {
  if (!state.activeTabId) return toast('Nenhuma aba Lovable ativa', 'red');
  try {
    const res = await bridge('runtime.sendMessage', { action: 'toggleGuardian', tabId: state.activeTabId });
    state.guardianActive = res?.status === 'active';
    updateGuardianToggle();
    toast(state.guardianActive ? '🔒 Guardião ativado' : '🔓 Guardião desativado', state.guardianActive ? 'green' : '');
  } catch (e) {
    toast('Erro ao alternar guardião', 'red');
  }
}

// ── APPLY PLAN ───────────────────────────────────────────────
async function applyPlan() {
  if (!state.projectId || !state.authToken) return toast('Projeto ou token ausente', 'red');
  document.getElementById('btnApply').disabled = true;
  toast('Aplicando plano...', '');
  try {
    const res = await bridge('runtime.sendMessage', { action: 'applyPlanFromLatest', projectId: state.projectId });
    if (res?.success) toast('✅ Plano aplicado!', 'green');
    else toast(res?.detail || 'Falha ao aplicar plano', 'red');
  } catch (e) {
    toast('Erro: ' + e.message, 'red');
  } finally {
    document.getElementById('btnApply').disabled = false;
  }
}

// ── SEND PROMPT ──────────────────────────────────────────────
async function sendPrompt() {
  const text = document.getElementById('promptInput').value.trim();
  if (!text) return toast('Digite uma mensagem', 'red');
  if (!state.projectId || !state.authToken) return toast('Projeto ou token ausente', 'red');

  document.getElementById('btnSend').disabled = true;
  toast('Enviando...', '');

  try {
    const res = await bridge('runtime.sendMessage', {
      action: 'sendQuickPromptViaApi',
      projectId: state.projectId,
      promptText: text,
      files: [],
      plan: false,
    });
    if (res?.success) {
      toast('✅ Mensagem enviada!', 'green');
      document.getElementById('promptInput').value = '';
    } else {
      toast(res?.detail || 'Falha ao enviar', 'red');
    }
  } catch (e) {
    toast('Erro: ' + e.message, 'red');
  } finally {
    document.getElementById('btnSend').disabled = false;
  }
}

// ── SUGGESTIONS ──────────────────────────────────────────────
async function loadSuggestions() {
  if (!state.activeTabId) return;
  try {
    const suggestions = await bridge('lovable.fetchQuickSuggestions', state.activeTabId);
    const area = document.getElementById('suggestionsArea');
    const list = document.getElementById('suggestionsList');
    if (!Array.isArray(suggestions) || !suggestions.length) { area.style.display = 'none'; return; }
    area.style.display = '';
    list.innerHTML = suggestions.map(s =>
      '<button class="suggestion-btn" onclick="fillPrompt(this.textContent)">' + escHtml(s) + '</button>'
    ).join('');
  } catch (_) {}
}

function fillPrompt(text) {
  document.getElementById('promptInput').value = text;
  toast('Sugestão preenchida', '');
}

// ── HISTORY ─────────────────────────────────────────────────
async function loadHistory() {
  const list = document.getElementById('historyList');
  if (!state.activeTabId) {
    list.innerHTML = '<div class="history-empty">Nenhuma aba Lovable ativa</div>';
    return;
  }
  list.innerHTML = '<div class="history-empty">Carregando...</div>';
  try {
    const msgs = await bridge('lovable.fetchHistory', state.activeTabId);
    if (!Array.isArray(msgs) || !msgs.length) {
      list.innerHTML = '<div class="history-empty">Nenhuma mensagem encontrada</div>';
      return;
    }
    list.innerHTML = msgs.slice(-30).map(m => \`
      <div class="msg \${m.role === 'user' ? 'user' : 'assistant'}">
        <div class="msg-role">\${m.role === 'user' ? '👤 Você' : '🤖 Lovable'}</div>
        \${escHtml(m.text.slice(0, 300))}\${m.text.length > 300 ? '…' : ''}
      </div>
    \`).join('');
  } catch (e) {
    list.innerHTML = '<div class="history-empty">Erro ao carregar histórico</div>';
  }
}

// ── ABRIR LOVABLE ───────────────────────────────────────────
async function openLovableTab() {
  try {
    await bridge('tabs.create', { url: 'https://lovable.dev', active: true });
  } catch (_) {
    window.parent.postMessage({ channel: CHANNEL, phase: 'request', requestId: 'open1', command: 'window.open', args: ['https://lovable.dev', '_blank'] }, '*');
  }
}

// ── RELOAD ──────────────────────────────────────────────────
async function reloadExtension() {
  toast('Recarregando extensão...', '');
  try { await bridge('runtime.reload'); } catch (_) {}
}

// ── UTIL ────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── INIT ────────────────────────────────────────────────────
// Espera o bridge estar pronto (parent precisa ter carregado o sidepanel.js)
setTimeout(refreshState, 600);
// Auto-refresh a cada 15s
setInterval(refreshState, 15000);

// Enter para enviar prompt
document.getElementById('promptInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendPrompt(); }
});
</script>
</body>
</html>`;

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ilimitado-lov-server', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────
// MANIFESTO
// ─────────────────────────────────────────
app.get('/ext/runtime/manifest', (req, res) => {
  res.json({
    version: '1.0.0',
    bundle_url: `${BASE_URL}/ext/runtime/bundle.js`,
    hash_sha256: BUNDLE_HASH,
    signature: 'bypass',
  });
});

// ─────────────────────────────────────────
// BUNDLE
// ─────────────────────────────────────────
app.get('/ext/runtime/bundle.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(BUNDLE_CODE);
});

// ─────────────────────────────────────────
// UI REMOTA
// ─────────────────────────────────────────
app.get('/ext/runtime/ui/sidepanel.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store');
  res.send(SIDEPANEL_HTML);
});

// ─────────────────────────────────────────
// ENVIAR PROMPT
// ─────────────────────────────────────────
app.post('/send-msg/:projectId/', async (req, res) => {
  const { projectId } = req.params;
  const { message, authToken, files, plan } = req.body;

  if (!projectId || !message || !authToken) {
    return res.status(400).json({ success: false, detail: 'Campos obrigatórios ausentes.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        message,
        ...(Array.isArray(files) && files.length > 0 ? { files } : {}),
        ...(plan ? { plan: true } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await lovableRes.json().catch(() => ({}));
    if (!lovableRes.ok) {
      return res.status(lovableRes.status).json({ success: false, detail: data?.message || data?.error || `Lovable API ${lovableRes.status}` });
    }
    return res.json({ success: true, detail: 'Mensagem enviada via Infinity Credits.', payload: data });

  } catch (err) {
    return res.status(500).json({ success: false, detail: err.name === 'AbortError' ? 'Timeout.' : err.message });
  }
});

// ─────────────────────────────────────────
// APLICAR PLANO
// ─────────────────────────────────────────
app.post('/apply-plan-from-latest', async (req, res) => {
  const { authToken, projectId } = req.body;

  if (!authToken || !projectId) {
    return res.status(400).json({ success: false, detail: 'Campos obrigatórios ausentes.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/apply-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await lovableRes.json().catch(() => ({}));
    if (!lovableRes.ok) {
      return res.status(lovableRes.status).json({ success: false, detail: data?.message || data?.error || `Lovable API ${lovableRes.status}` });
    }
    return res.json({ success: true, detail: 'Plano aplicado com sucesso.', planFound: true, payload: data });

  } catch (err) {
    return res.status(500).json({ success: false, detail: err.name === 'AbortError' ? 'Timeout.' : err.message });
  }
});

// ─────────────────────────────────────────
// WEBHOOK LEGADO
// ─────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const { message, projectId, token } = req.body;
  if (message === '__ping__') return res.json({ status: 'ok', reply: 'pong' });
  if (!message || !projectId || !token) return res.status(400).json({ error: 'Campos obrigatórios: message, projectId, token' });

  try {
    const lovableRes = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    if (!lovableRes.ok) {
      const errText = await lovableRes.text().catch(() => '');
      return res.status(lovableRes.status).json({ error: `Lovable API ${lovableRes.status}`, details: errText.slice(0, 200) });
    }
    const data = await lovableRes.json();
    return res.json({ reply: data.reply || data.message || 'Enviado!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno', details: err.message });
  }
});

// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📦 Bundle hash: ${BUNDLE_HASH}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
});
