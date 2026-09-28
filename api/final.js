// Vercel Serverless Function: проверка финального пароля
const fs = require('fs');
const path = require('path');

const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const strip = s => norm(s).replace(/[\s\-\.]/g, '');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backend', 'questions.json'), 'utf8'));
  const ok = strip(req.body.password) === strip(q.finalPassword) && strip(req.body.password) !== '';
  res.json({ win: ok });
};
