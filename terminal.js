// Логика: вход → терминал кодов → попапы улик → главный пароль → победа + книга имён.
// Работает БЕЗ бэкенда (проверка по questions.js) и С бэкендом (если запущен node backend/server.js).
(function () {
  const $ = id => document.getElementById(id);
  const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  const found = new Set(JSON.parse(localStorage.getItem('noir_found') || '[]'));
  let startTime = Date.now(), attempts = 0;

  function print(html, cls) {
    const out = $('term-output');
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  function refreshProgress() {
    $('found-count').textContent = found.size;
    $('total-count').textContent = QUEST_DATA.clues.length;
    $('bar-fill').style.width = (found.size / QUEST_DATA.clues.length * 100) + '%';
    const ul = $('clue-list');
    ul.innerHTML = '';
    if (!found.size) ul.innerHTML = '<li class="empty">пока пусто… вводи коды в терминал</li>';
    QUEST_DATA.clues.forEach((c, i) => {
      if (found.has(norm(c.code))) {
        const li = document.createElement('li');
        li.textContent = `№${i + 1} ${c.clue_title} → буква: ${c.piece}`;
        ul.appendChild(li);
      }
    });
    if (found.size >= QUEST_DATA.clues.length) {
      $('final-panel').classList.remove('hidden');
      $('final-hint').textContent = QUEST_DATA.finalHint;
      print('<span class="gold">★ ВСЕ УЛИКИ СОБРАНЫ. Введи ГЛАВНЫЙ ПАРОЛЬ ниже на столе.</span>');
    }
    localStorage.setItem('noir_found', JSON.stringify([...found]));
  }

  function openModal(clue, idx) {
    $('m-num').textContent = '№' + (idx + 1);
    $('m-title').textContent = clue.clue_title;
    $('m-text').textContent = clue.clue_text;
    $('m-piece').textContent = '🧩 Кусок пароля: «' + clue.piece + '» — запиши его. Порядок важен!';
    const mm = $('m-media');
    mm.innerHTML = '';
    if (clue.clue_media) {
      const img = document.createElement('img');
      img.src = clue.clue_media; img.alt = clue.clue_title;
      img.style.cssText = 'max-width:100%;border:4px solid #fff;transform:rotate(1deg)';
      img.onerror = () => mm.removeChild(img);
      mm.appendChild(img);
    }
    $('modal').classList.remove('hidden');
  }

  async function checkViaBackend(code) {
    try {
      const r = await fetch('/api/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; } // бэкенд не запущен — играем локально
  }

  async function submitCode(raw) {
    const code = norm(raw);
    if (!code) return;
    attempts++;
    print('&gt; ' + raw.replace(/</g, '&lt;'));
    if (found.has(code)) { print('— уже подшито к делу.', 'gold'); return; }

    // 1) пробуем бэкенд
    const server = await checkViaBackend(code);
    if (server) {
      if (server.ok) {
        window.NoirSound.blip(true);
        found.add(code);
        print('✔ ' + server.clue_title + ' — улика вскрыта!', 'gold');
        const idx = QUEST_DATA.clues.findIndex(c => norm(c.code) === code);
        openModal(server, idx < 0 ? found.size - 1 : idx);
        refreshProgress();
      } else {
        window.NoirSound.buzz();
        print('✕ тишина… терминал гудит. Такого кода нет.', 'bad');
      }
      return;
    }
    // 2) локальный фолбэк
    const idx = QUEST_DATA.clues.findIndex(c => norm(c.code) === code);
    if (idx >= 0) {
      window.NoirSound.blip(true);
      found.add(code);
      print('✔ ' + QUEST_DATA.clues[idx].clue_title + ' — улика вскрыта!', 'gold');
      openModal(QUEST_DATA.clues[idx], idx);
      refreshProgress();
    } else {
      window.NoirSound.buzz();
      print('✕ тишина… терминал гудит. Такого кода нет.', 'bad');
    }
  }

  async function submitFinal(raw) {
    const pw = norm(raw).replace(/[\s\-\.]/g, '');
    const target = norm(QUEST_DATA.finalPassword).replace(/[\s\-\.]/g, '');
    // бэкенд-первым
    try {
      const r = await fetch('/api/final', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: raw })
      });
      if (r.ok) {
        const j = await r.json();
        if (j.win) return win();
        $('final-err').classList.remove('hidden');
        window.NoirSound.buzz();
        return;
      }
    } catch (e) {}
    if (pw === target && pw) return win();
    $('final-err').classList.remove('hidden');
    window.NoirSound.buzz();
    setTimeout(() => $('final-err').classList.add('hidden'), 2000);
  }

  function win() {
    $('win-modal').classList.remove('hidden');
    window.NoirSound.blip(true);
    renderWinners();
  }

  async function saveWinner(name) {
    const rec = { name, date: new Date().toLocaleString('ru-RU'), attempts, secs: Math.round((Date.now() - startTime) / 1000) };
    try {
      await fetch('/api/winners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
    } catch (e) {}
    const arr = JSON.parse(localStorage.getItem('noir_winners') || '[]');
    arr.push(rec);
    localStorage.setItem('noir_winners', JSON.stringify(arr));
    renderWinners();
  }

  async function renderWinners() {
    let arr = [];
    try {
      const r = await fetch('/api/winners');
      if (r.ok) arr = await r.json();
      else throw 0;
    } catch (e) { arr = JSON.parse(localStorage.getItem('noir_winners') || '[]'); }
    const ol = $('winners-list');
    ol.innerHTML = '';
    if (!arr.length) ol.innerHTML = '<li>пока никого… стань первым!</li>';
    arr.slice(-10).reverse().forEach(w => {
      const li = document.createElement('li');
      li.textContent = `${w.name} — ${w.date || ''}`;
      ol.appendChild(li);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    // часы тикают для атмосферы
    setInterval(() => {
      const d = new Date();
      $('clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }, 10000);

    // вход
    const doEntry = () => {
      const v = norm($('entry-pass').value);
      window.NoirSound.unlock();
      if (v === norm(QUEST_DATA.entryPassword)) {
        $('intro').classList.add('hidden');
        $('office').classList.remove('hidden');
        window.initRain();
        print('McGUCKET LABS v1.3…');
        print('Дело №47 открыто. Вводи кодовые слова.');
        print('Подсказки — кнопка <b>?</b> на доске.', 'gold');
        refreshProgress();
        $('term-input').focus();
      } else {
        $('entry-err').classList.remove('hidden');
        $('entry-pass').classList.add('err-flash');
        window.NoirSound.buzz();
        setTimeout(() => { $('entry-err').classList.add('hidden'); $('entry-pass').classList.remove('err-flash'); }, 1500);
      }
    };
    $('entry-btn').onclick = doEntry;
    $('entry-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doEntry(); });

    $('term-form').addEventListener('submit', e => {
      e.preventDefault();
      submitCode($('term-input').value);
      $('term-input').value = '';
    });
    $('final-form').addEventListener('submit', e => {
      e.preventDefault();
      submitFinal($('final-input').value);
    });
    $('m-close').onclick = () => $('modal').classList.add('hidden');
    $('win-close').onclick = () => $('win-modal').classList.add('hidden');
    $('win-form').addEventListener('submit', e => {
      e.preventDefault();
      const n = $('win-name').value.trim();
      if (!n) return;
      saveWinner(n);
      $('win-name').value = '';
      $('win-text').textContent = `Имя «${n}» вписано в книгу. Дождь закончился. Ты — настоящий детектив.`;
    });
    $('mute-btn').onclick = e => {
      const m = window.NoirSound.toggleMute();
      e.target.textContent = m ? '🔇' : '🔊';
    };
    $('reset-btn').onclick = () => {
      if (!confirm('Начать дело заново? Улики сгорят.')) return;
      found.clear(); attempts = 0; startTime = Date.now();
      localStorage.removeItem('noir_found');
      $('final-panel').classList.add('hidden');
      $('term-output').innerHTML = '';
      print('Дело открыто заново.');
      refreshProgress();
    };
    $('help-btn').onclick = () => {
      const box = $('help-box');
      box.classList.toggle('hidden');
      box.innerHTML = '<b>Подсказки:</b><br>' + QUEST_DATA.clues.map((c, i) =>
        found.has(norm(c.code)) ? `✅ ${c.clue_title}` : `${i + 1}. ${c.hint}`
      ).join('<br>');
    };
    renderWinners();
  });
})();
