#!/usr/bin/env node
/**
 * Records docs/demo.gif from examples/index.html: add two dishes, open the
 * order, fill the form, send, see the message and the pay panel.
 *
 *   npm run gif
 *
 * Needs Edge or Chrome (driven by playwright-core) and ffmpeg on the PATH.
 * Frames are screenshots taken while the steps run, timed by when they were
 * taken, so the GIF plays at real speed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'demo.gif');
const WIDTH = 360; // GIF width in px
const FPS = 12;

if (spawnSync('ffmpeg', ['-version']).status !== 0) {
  console.error('ffmpeg was not found on the PATH. Install it, then run npm run gif again.');
  process.exit(1);
}

const { chromium } = await import('playwright-core');
let browser;
for (const t of process.env.CHROME_PATH ? [{ executablePath: process.env.CHROME_PATH }] : [{ channel: 'msedge' }, { channel: 'chrome' }]) {
  try {
    browser = await chromium.launch({ headless: true, ...t });
    break;
  } catch {}
}
if (!browser) {
  console.error('No Edge or Chrome found. Set CHROME_PATH to a Chromium-based browser.');
  process.exit(1);
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(path.join(ROOT, 'examples', 'index.html')).href);
await page.evaluate(() => localStorage.clear());
await page.reload();
// A soft circle where each tap lands, so the GIF is easy to follow.
await page.addStyleTag({
  content:
    '.demo-tap{position:fixed;z-index:2147483647;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;' +
    'background:rgb(36 36 143/.22);border:2px solid rgb(36 36 143/.55);pointer-events:none;animation:demo-tap .55s ease-out forwards}' +
    '@keyframes demo-tap{from{transform:scale(.35);opacity:1}to{transform:scale(1.25);opacity:0}}',
});

const wait = (ms) => page.waitForTimeout(ms);
async function tap(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.evaluate(({ x, y }) => {
    const host = [...document.querySelectorAll('dialog[open]')].pop() || document.body;
    const r = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'demo-tap';
    // Inside a dialog, position: fixed can be relative to the dialog while it animates.
    dot.style.left = `${x - (getComputedStyle(host).translate !== 'none' ? r.left : 0)}px`;
    dot.style.top = `${y - (getComputedStyle(host).translate !== 'none' ? r.top : 0)}px`;
    host.append(dot);
    setTimeout(() => dot.remove(), 700);
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await wait(200);
  await locator.click();
}
async function scrollTo(selector, offset = 70) {
  await page.evaluate(
    ({ selector, offset }) => {
      const el = document.querySelector(selector);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    },
    { selector, offset }
  );
  await wait(900);
}
async function type(locator, text) {
  await tap(locator);
  await locator.pressSequentially(text, { delay: 75 });
}

// ---------- capture loop ----------
const frames = [];
let recording = true;
const t0 = Date.now();
const capture = (async () => {
  while (recording) {
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    frames.push({ t: Date.now() - t0, buf });
  }
})();

// ---------- the story ----------
await wait(1400);
await scrollTo('#ob-cat-biryani');
const biryani = page.locator('[data-ob-item="chicken-dum-biryani"]');
await tap(biryani.locator('select'));
await biryani.locator('select').selectOption('half');
await wait(700);
await tap(biryani.locator('[data-ob-add]'));
await wait(500);
await tap(biryani.locator('[data-ob-inc]'));
await wait(800);
await scrollTo('[data-ob-item="double-ka-meetha"]', 220);
await tap(page.locator('[data-ob-item="double-ka-meetha"] [data-ob-add]'));
await wait(1100);
await tap(page.locator('.ob-bar__btn'));
await wait(1300);
const sheet = page.locator('dialog.ob-sheet:not(.ob-pay)');
await type(sheet.locator('input[name="name"]'), 'Ravi');
await wait(300);
await tap(sheet.locator('.ob-mode', { hasText: 'Delivery' }));
await wait(400);
await type(sheet.locator('textarea[name="address"]'), '12-3-45, Ameerpet');
await wait(200);
await type(sheet.locator('textarea[name="note"]'), 'less spicy');
await wait(600);
await tap(sheet.locator('button[type="submit"]'));
await wait(3600);
await tap(page.locator('dialog.ob-preview button', { hasText: 'Continue to payment' }));
await wait(2600);

recording = false;
await capture;
await browser.close();

// ---------- encode ----------
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ob-gif-'));
const list = [];
frames.forEach((f, i) => {
  const name = `f${String(i).padStart(4, '0')}.jpg`;
  fs.writeFileSync(path.join(dir, name), f.buf);
  const next = frames[i + 1] ? frames[i + 1].t : f.t + 1500; // hold the last frame
  list.push(`file '${name}'`, `duration ${((next - f.t) / 1000).toFixed(3)}`);
});
list.push(`file 'f${String(frames.length - 1).padStart(4, '0')}.jpg'`);
fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const filter = `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
const res = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filter, '-loop', '0', OUT], { cwd: dir, encoding: 'utf8' });
fs.rmSync(dir, { recursive: true, force: true });
if (res.status !== 0) {
  console.error(res.stderr);
  process.exit(1);
}
const secs = (frames[frames.length - 1].t / 1000 + 1.5).toFixed(1);
console.log(`${path.relative(ROOT, OUT)}: ${frames.length} frames, ${secs} s, ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB`);
