// Vercel Serverless Function: книга победителей (in-memory)
let winners = [];

module.exports = (req, res) => {
  if (req.method === 'GET') return res.json(winners);
  if (req.method === 'POST') {
    const name = (req.body.name || '').toString().trim().slice(0, 30);
    if (!name) return res.status(400).json({ error: 'пустое имя' });
    winners.push({ name, date: new Date().toLocaleString('ru-RU'), attempts: req.body.attempts || 0, secs: req.body.secs || 0 });
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
};
