// Vercel Serverless Function: проверка кодового слова
const fs = require('fs');
const path = require('path');

const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backend', 'questions.json'), 'utf8'));
  const code = norm(req.body.code);
  const clue = q.clues.find(c => norm(c.code) === code);
  if (!clue) return res.json({ ok: false });
  res.json({ ok: true, clue_title: clue.clue_title, clue_text: clue.clue_text, piece: clue.piece, clue_media: clue.clue_media || '' });
};
