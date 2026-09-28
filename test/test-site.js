// Тест сайта через Playwright с системным Chrome
const { chromium } = require('playwright-core');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) { console.error('Chrome не найден'); process.exit(1); }
  console.log('Использую браузер:', chromePath);

  // запускаем локальный сервер
  const server = spawn('node', [path.join(ROOT, 'backend', 'server.js')], { cwd: ROOT });
  await new Promise(r => setTimeout(r, 1500));

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // 1. интро
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SHOTS, '1-intro.png') });
    console.log('1. Интро загружено');

    // 2. ввод пароля
    await page.fill('#entry-pass', 'дождь');
    await page.click('#entry-btn');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SHOTS, '2-office.png') });
    console.log('2. Кабинет открыт');

    // 3. ввод кода
    await page.fill('#term-input', 'ворон');
    await page.press('#term-input', 'Enter');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, '3-clue.png') });
    console.log('3. Улика вскрыта');

    // 4. закрыть попап
    await page.click('#m-close');
    await page.waitForTimeout(400);

    // 5. все коды
    for (const code of ['02:47', 'ключ', 'письмо', 'след']) {
      await page.fill('#term-input', code);
      await page.press('#term-input', 'Enter');
      await page.waitForTimeout(500);
      await page.click('#m-close');
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(SHOTS, '4-all-clues.png') });
    console.log('4. Все улики собраны');

    // 6. финальный пароль
    await page.fill('#final-input', 'noir1947');
    await page.click('#final-form button');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, '5-win.png') });
    console.log('5. Победа!');

    // 7. записать имя
    await page.fill('#win-name', 'Тестовый Детектив');
    await page.click('#win-form button');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SHOTS, '6-winner-saved.png') });
    console.log('6. Имя записано');

    // 8. мобильная версия
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SHOTS, '7-mobile.png') });
    console.log('7. Мобильная версия');

    console.log('\n=== РЕЗУЛЬТАТ ===');
    if (errors.length) {
      console.log('Ошибки консоли:', errors);
      process.exitCode = 1;
    } else {
      console.log('Ошибок нет. Скриншоты в site_agitation/test/screenshots/');
    }
  } catch (e) {
    console.error('Тест упал:', e.message);
    await page.screenshot({ path: path.join(SHOTS, 'error.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
}

main();
