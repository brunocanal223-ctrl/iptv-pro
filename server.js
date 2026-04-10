const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
app.use(express.json());

// 🔥 SUA URL DO RENDER
const BASE_URL = "https://iptv-cursos.onrender.com";

// ===== BANCO =====
const db = new Database('./database.db');

// ===== TABELAS =====
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password_hash TEXT,
  expires_at TEXT,
  created_at TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT,
  user_id INTEGER,
  expires_at TEXT
)
`).run();

// ===== PAINEL =====
app.get('/create-user', (req, res) => {
  res.send(`
  <html>
    <body style="font-family: Arial; text-align:center; margin-top:50px;">
      <h2>🎬 Painel IPTV</h2>

      <button style="padding:10px 20px; margin:5px;" onclick="criar(30)">🔥 30 dias</button>
      <button style="padding:10px 20px; margin:5px;" onclick="criar(60)">🚀 60 dias</button>
      <button style="padding:10px 20px; margin:5px;" onclick="criar(90)">💎 90 dias</button>

      <div id="resultado" style="margin-top:30px;"></div>

      <script>
        async function criar(dias) {
          const res = await fetch('/api/create-user?dias=' + dias);
          const data = await res.json();

          document.getElementById('resultado').innerHTML = \`
            <p><b>Usuário:</b> \${data.username}</p>
            <p><b>Senha:</b> \${data.password}</p>

            <input id="link" value="\${data.link}" style="width:80%; padding:10px;" readonly />

            <br><br>
            <button onclick="copiar()">📋 Copiar Link</button>
          \`;
        }

        function copiar() {
          const input = document.getElementById('link');
          input.select();
          document.execCommand('copy');
          alert('Copiado!');
        }
      </script>
    </body>
  </html>
  `);
});

// ===== CRIAR USUÁRIO =====
app.get('/api/create-user', async (req, res) => {
  const dias = parseInt(req.query.dias) || 30;

  const username = 'user_' + Math.random().toString(36).substring(2, 8);
  const password = Math.random().toString(36).substring(2, 10);

  const passwordHash = await bcrypt.hash(password, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + dias);

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(username, passwordHash, expiresAt.toISOString(), new Date().toISOString());

  const userId = result.lastInsertRowid;
  const token = uuidv4();

  db.prepare(`
    INSERT INTO tokens (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt.toISOString());

  const link = `${BASE_URL}/p/${token}`;

  res.json({
    username,
    password,
    link
  });
});

// ===== LINK CURTO =====
app.get('/p/:token', (req, res) => {
  res.redirect(`/playlist?token=${req.params.token}`);
});

// ===== PLAYLIST =====
app.get('/playlist', (req, res) => {
  const { token } = req.query;

  const tokenRow = db.prepare(`SELECT * FROM tokens WHERE token = ?`).get(token);

  if (!tokenRow) return res.status(403).send("Token inválido");

  if (new Date() > new Date(tokenRow.expires_at)) {
    return res.status(403).send("Expirado");
  }

  const playlist = `#EXTM3U
#EXTINF:-1 tvg-name="Dark S01E09" group-title="Séries",Dark S01E09
${BASE_URL}/proxy?url=http://topalfa.sbs:80/series/686926821/138484414/10819995.mp4&token=${token}

#EXTINF:-1 tvg-name="Dark S01E10" group-title="Séries",Dark S01E10
${BASE_URL}/proxy?url=http://topalfa.sbs:80/series/686926821/138484414/10819996.mp4&token=${token}

#EXTINF:-1 tvg-name="Dark S02E01" group-title="Séries",Dark S02E01
${BASE_URL}/proxy?url=http://topalfa.sbs:80/series/686926821/138484414/10819997.mp4&token=${token}
`;

  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.send(playlist);
});

// ===== PROXY =====
app.get('/proxy', async (req, res) => {
  const { url, token } = req.query;

  const tokenRow = db.prepare(`SELECT * FROM tokens WHERE token = ?`).get(token);

  if (!tokenRow) return res.status(403).send("Bloqueado");

  if (new Date() > new Date(tokenRow.expires_at)) {
    return res.status(403).send("Expirado");
  }

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Erro ao carregar vídeo");
  }
});

// ===== START (RENDER) =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Rodando na porta " + PORT);
});