// Бэкенд: проверка кодов на сервере (чтобы ответы не светились в исходниках),
// хранение книги победителей. Запуск: node backend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');

const qPath = path.join(__dirname, 'questions.json');
const wPath = path.join(__dirname, 'winners.json');

function loadQuestions() {
  return JSON.parse(fs.readFileSync(qPath, 'utf8'));
}
function loadWinners() {
  try { return JSON.parse(fs.readFileSync(wPath, 'utf8')); }
  catch (e) { return []; }
}
function saveWinners(a) {
  fs.writeFileSync(wPath, JSON.stringify(a, null, 2), 'utf8');
}

const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const strip = s => norm(s).replace(/[\s\-\.]/g, '');

// простой антибрутфорс: не чаще 20 запросов в минуту с IP
const hits = {};
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const ip = req.ip;
    const now = Date.now();
    hits[ip] = (hits[ip] || []).filter(t => now - t < 60000);
    hits[ip].push(now);
    if (hits[ip].length > 20) return res.status(429).json({ error: 'слишком часто, подожди минуту' });
  }
  next();
});

// отдаём фронт
app.use(express.static(ROOT));

// GET /api/questions — только подсказки, БЕЗ ответов
app.get('/api/questions', (req, res) => {
  const q = loadQuestions();
  res.json({
    total: q.clues.length,
    hints: q.clues.map((c, i) => ({ n: i + 1, hint: c.hint })),
    finalHint: q.finalHint
  });
});

// POST /api/check {code} — проверка кодового слова
app.post('/api/check', (req, res) => {
  const q = loadQuestions();
  const code = norm(req.body.code);
  const clue = q.clues.find(c => norm(c.code) === code);
  if (!clue) return res.json({ ok: false });
  res.json({ ok: true, clue_title: clue.clue_title, clue_text: clue.clue_text, piece: clue.piece, clue_media: clue.clue_media || '' });
});

// POST /api/final {password}
app.post('/api/final', (req, res) => {
  const q = loadQuestions();
  const ok = strip(req.body.password) === strip(q.finalPassword) && strip(req.body.password) !== '';
  res.json({ win: ok });
});

// книга победителей
app.get('/api/winners', (req, res) => res.json(loadWinners()));
app.post('/api/winners', (req, res) => {
  const name = (req.body.name || '').toString().trim().slice(0, 30);
  if (!name) return res.status(400).json({ error: 'пустое имя' });
  const arr = loadWinners();
  arr.push({ name, date: new Date().toLocaleString('ru-RU'), attempts: req.body.attempts || 0, secs: req.body.secs || 0 });
  saveWinners(arr);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`🕵️ Кабинет открыт: http://localhost:${PORT}`));
