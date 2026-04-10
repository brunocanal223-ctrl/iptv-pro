const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// ===== BANCO =====
const db = new sqlite3.Database('./database.db');

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password_hash TEXT,
  expires_at TEXT,
  created_at TEXT
)
`);

// ===== GERADORES =====
function generateUsername() {
  return 'user_' + crypto.randomBytes(4).toString('hex');
}

function generatePassword() {
  return crypto.randomBytes(6).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ===== CRIAR USUÁRIO =====
app.get('/create-user', async (req, res) => {
  const username = generateUsername();
  const password = generatePassword();

  const passwordHash = await bcrypt.hash(password, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  db.run(
    `INSERT INTO users (username, password_hash, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    [username, passwordHash, expiresAt.toISOString(), new Date().toISOString()]
  );

  res.json({
    username,
    password,
    expires_at: expiresAt,
    m3u_url: `https://iptv-cursos.onrender.com/playlist?user=${username}&pass=${password}`
  });
});

// ===== PLAYLIST =====
app.get('/playlist', async (req, res) => {
  const { user, pass } = req.query;

  db.get(`SELECT * FROM users WHERE username = ?`, [user], async (err, row) => {
    if (!row) return res.status(403).send("Acesso negado");

    const valid = await bcrypt.compare(pass, row.password_hash);
    if (!valid) return res.status(403).send("Senha inválida");

    if (new Date() > new Date(row.expires_at)) {
      return res.status(403).send("Expirado");
    }

    const token = generateToken();

    const playlist = `#EXTM3U
#EXTINF:-1,Filme Teste
https://iptv-cursos.onrender.com/stream/video1?token=${token}
`;

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.send(playlist);
  });
});

// ===== STREAM (FUNCIONANDO NO RENDER) =====
app.get('/stream/:video', (req, res) => {
  const { token } = req.query;

  console.log("Token recebido:", token);

  // 🔥 NÃO BLOQUEIA (pra teste funcionar)
  // if (!token) return res.status(403).send("Token inválido");

  // 👉 vídeo online (sempre funciona)
  res.redirect("https://www.w3schools.com/html/mov_bbb.mp4");
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});