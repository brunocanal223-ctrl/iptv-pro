const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
app.use(express.json());

const BASE_URL = "https://iptv-cursos.onrender.com";

// ===== BANCO =====
const db = new Database('./database.db');

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

      <button onclick="criar(30)">🔥 30 dias</button>
      <button onclick="criar(60)">🚀 60 dias</button>
      <button onclick="criar(90)">💎 90 dias</button>

      <div id="res"></div>

      <script>
        async function criar(dias){
          const r = await fetch('/api/create-user?dias=' + dias);
          const d = await r.json();

          document.getElementById('res').innerHTML = \`
            <p><b>User:</b> \${d.username}</p>
            <p><b>Pass:</b> \${d.password}</p>

            <input id="link" value="\${d.link}" style="width:80%" />
            <br><br>
            <button onclick="copy()">Copiar</button>
          \`;
        }

        function copy(){
          const i = document.getElementById('link');
          i.select();
          document.execCommand('copy');
          alert('Copiado!');
        }
      </script>
    </body>
  </html>
  `);
});

// ===== CRIAR USER =====
app.get('/api/create-user', async (req, res) => {
  const dias = parseInt(req.query.dias) || 30;

  const username = 'user_' + Math.random().toString(36).substring(2, 8);
  const password = Math.random().toString(36).substring(2, 10);

  const hash = await bcrypt.hash(password, 10);

  const expires = new Date();
  expires.setDate(expires.getDate() + dias);

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(username, hash, expires.toISOString(), new Date().toISOString());

  const token = uuidv4();

  db.prepare(`
    INSERT INTO tokens (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, result.lastInsertRowid, expires.toISOString());

  res.json({
    username,
    password,
    link: BASE_URL + '/p/' + token
  });
});

// ===== LINK CURTO =====
app.get('/p/:token', (req, res) => {
  res.redirect('/playlist?token=' + req.params.token);
});

// ===== PLAYLIST =====
app.get('/playlist', (req, res) => {
  const token = req.query.token;

  const tokenRow = db.prepare("SELECT * FROM tokens WHERE token = ?").get(token);

  if (!tokenRow) return res.status(403).send("Token inválido");

  if (new Date() > new Date(tokenRow.expires_at)) {
    return res.status(403).send("Expirado");
  }

  const playlist = `#EXTM3U

#EXTINF:-1 tvg-name="Dark S01E02" group-title="Séries",Dark S01E02
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819988.mp4

#EXTINF:-1 tvg-name="Dark S01E03" group-title="Séries",Dark S01E03
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819989.mp4

#EXTINF:-1 tvg-name="Dark S01E04" group-title="Séries",Dark S01E04
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819990.mp4

#EXTINF:-1 tvg-name="Dark S01E05" group-title="Séries",Dark S01E05
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819991.mp4

#EXTINF:-1 tvg-name="Dark S01E06" group-title="Séries",Dark S01E06
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819992.mp4

#EXTINF:-1 tvg-name="Dark S01E07" group-title="Séries",Dark S01E07
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819993.mp4

#EXTINF:-1 tvg-name="Dark S01E08" group-title="Séries",Dark S01E08
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819994.mp4

#EXTINF:-1 tvg-name="Dark S01E09" group-title="Séries",Dark S01E09
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819995.mp4

#EXTINF:-1 tvg-name="Dark S01E10" group-title="Séries",Dark S01E10
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819996.mp4

#EXTINF:-1 tvg-name="Dark S02E01" group-title="Séries",Dark S02E01
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819997.mp4

#EXTINF:-1 tvg-name="Dark S02E02" group-title="Séries",Dark S02E02
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819998.mp4

#EXTINF:-1 tvg-name="Dark S02E03" group-title="Séries",Dark S02E03
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10819999.mp4

#EXTINF:-1 tvg-name="Dark S02E04" group-title="Séries",Dark S02E04
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820000.mp4

#EXTINF:-1 tvg-name="Dark S02E05" group-title="Séries",Dark S02E05
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820001.mp4

#EXTINF:-1 tvg-name="Dark S02E06" group-title="Séries",Dark S02E06
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820002.mp4

#EXTINF:-1 tvg-name="Dark S02E07" group-title="Séries",Dark S02E07
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820003.mp4

#EXTINF:-1 tvg-name="Dark S02E08" group-title="Séries",Dark S02E08
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820004.mp4

#EXTINF:-1 tvg-name="Dark S03E01" group-title="Séries",Dark S03E01
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820005.mp4

#EXTINF:-1 tvg-name="Dark S03E02" group-title="Séries",Dark S03E02
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820006.mp4

#EXTINF:-1 tvg-name="Dark S03E03" group-title="Séries",Dark S03E03
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820007.mp4

#EXTINF:-1 tvg-name="Dark S03E04" group-title="Séries",Dark S03E04
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820008.mp4

#EXTINF:-1 tvg-name="Dark S03E05" group-title="Séries",Dark S03E05
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820009.mp4

#EXTINF:-1 tvg-name="Dark S03E06" group-title="Séries",Dark S03E06
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820010.mp4

#EXTINF:-1 tvg-name="Dark S03E07" group-title="Séries",Dark S03E07
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820011.mp4

#EXTINF:-1 tvg-name="Dark S03E08" group-title="Séries",Dark S03E08
${BASE_URL}/proxy/${token}?url=http://topalfa.sbs:80/series/686926821/138484414/10820012.mp4
`;

  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.send(playlist);
});

// ===== PROXY =====
app.get('/proxy/:token', async (req, res) => {
  const token = req.params.token;
  const { url } = req.query;

  const tokenRow = db.prepare("SELECT * FROM tokens WHERE token = ?").get(token);

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

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 Rodando...");
});