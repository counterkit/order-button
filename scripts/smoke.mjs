#!/usr/bin/env node
/**
 * Browser smoke test. Opens the examples straight from disk (file://) in
 * headless Edge or Chrome and goes through whole orders:
 *   1. examples/index.html on a phone, preview mode: menu, sizes, cart, form
 *      checks, the exact message, the pay panel, saved cart, "start a new order"
 *   2. examples/index.html on a desktop, live mode: the wa.me link in a new tab
 *   3. examples/index.html on an Android phone, live mode: same-tab wa.me navigation
 *   4. examples/existing-markup.html: data-ob-* hooks, radio sizes, minimum
 *      order, delivery fee, payment link
 *
 *   npm run smoke
 *   npm run smoke -- --shots ./shots     also save screenshots
 *
 * Needs Edge or Chrome installed (playwright-core drives it and downloads
 * nothing). Set CHROME_PATH to use another Chromium-based browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileUrl = (p) => pathToFileURL(path.join(ROOT, p)).href;
const argv = process.argv.slice(2);
const shotsDir = argv.includes('--shots') ? path.resolve(argv[argv.indexOf('--shots') + 1] || 'shots') : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${msg}`);
  if (!cond) failures++;
  return cond;
};
const shot = async (page, name) => {
  if (!shotsDir) return;
  await page.waitForTimeout(350); // let the open animation finish
  await page.screenshot({ path: path.join(shotsDir, `${name}.png`) });
};

async function launch() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    throw new Error('playwright-core is not installed. Run npm install first.');
  }
  const tries = process.env.CHROME_PATH ? [{ executablePath: process.env.CHROME_PATH }] : [{ channel: 'msedge' }, { channel: 'chrome' }];
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: true, ...t });
    } catch {}
  }
  throw new Error('No Edge or Chrome found. Install one, or set CHROME_PATH to a Chromium-based browser.');
}

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true };
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

/** Watch a page for console errors, page errors and requests that leave the disk. */
function watch(page, { allow = [] } = {}) {
  const errors = [];
  const external = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(file|data|blob|about):/.test(u) && !allow.some((a) => u.startsWith(a))) external.push(u);
  });
  return { errors, external };
}

const browser = await launch();
try {
  // ------------------------------------------------------------------ 1
  console.log('\n1. examples/index.html, phone, preview mode');
  {
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(fileUrl('examples/index.html'));
    await page.evaluate(() => {
      window.__orders = [];
      window.addEventListener('orderbutton:order', (e) => window.__orders.push(e.detail));
    });

    ok((await page.locator('.ob-item').count()) === 15, 'renders all 15 menu items from the JSON block');
    ok((await page.locator('#cats a').count()) === 4, 'category chips link to the 4 sections');
    ok(await page.locator('[data-ob-item="apollo-fish"] .ob-add').isDisabled(), 'sold-out item has a disabled button');
    ok(await page.locator('.ob-bar-wrap').isHidden(), 'no order bar while the cart is empty');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at 390 px');
    await shot(page, '1-menu');

    const biryani = page.locator('[data-ob-item="chicken-dum-biryani"]');
    ok((await biryani.locator('[data-ob-price]').textContent()) === '₹249', 'sized item starts on its default size (Full, ₹249)');
    await biryani.locator('select[data-ob-variant]').selectOption('half');
    ok((await biryani.locator('[data-ob-price]').textContent()) === '₹149', 'price follows the chosen size (Half, ₹149)');
    await biryani.locator('[data-ob-add]').click();
    ok(await biryani.locator('[data-ob-stepper]').isVisible(), 'Add turns into a stepper');
    ok(await biryani.locator('[data-ob-inc]').evaluate((b) => b === document.activeElement), 'keyboard focus moves to the + button');
    await biryani.locator('[data-ob-inc]').click();
    ok((await biryani.locator('[data-ob-qty]').textContent()) === '2', 'stepper shows 2');
    await page.locator('[data-ob-item="double-ka-meetha"] [data-ob-add]').click();
    await page.waitForTimeout(80);
    ok((await page.locator('.ob-sr[role="status"]').textContent()).includes('Double Ka Meetha added'), 'adds are announced to screen readers');
    ok((await page.locator('.ob-bar__count').textContent()) === '3 items', 'bar: 3 items');
    ok((await page.locator('.ob-bar__total').textContent()) === '₹387', 'bar: ₹387');
    await shot(page, '2-bar');

    await biryani.locator('select[data-ob-variant]').selectOption('full');
    ok(await biryani.locator('[data-ob-add]').isVisible(), 'switching to a size not in the cart shows Add again');
    await biryani.locator('select[data-ob-variant]').selectOption('half');
    ok((await biryani.locator('[data-ob-qty]').textContent()) === '2', 'switching back shows the 2 Half in the cart');

    await page.reload();
    await page.evaluate(() => {
      window.__orders = [];
      window.addEventListener('orderbutton:order', (e) => window.__orders.push(e.detail));
    });
    ok((await page.locator('.ob-bar__count').textContent()) === '3 items', 'the cart survives a reload');

    await page.locator('.ob-bar__btn').click();
    const sheet = page.locator('dialog.ob-sheet:not(.ob-pay)');
    ok(await sheet.isVisible(), 'the bar opens the order sheet');
    ok((await sheet.locator('.ob-line').count()) === 2, 'sheet lists 2 lines');
    ok((await sheet.locator('.ob-totals dd.is-total').textContent()) === '₹387', 'sheet total ₹387');
    await shot(page, '3-sheet');

    await sheet.locator('button[type="submit"]').click();
    ok(await sheet.locator('.ob-err').first().isVisible(), 'sending without a name shows an error');
    ok(await sheet.locator('input[name="name"]').evaluate((i) => i === document.activeElement && i.getAttribute('aria-invalid') === 'true'), 'focus goes to the name field, marked invalid');
    await sheet.locator('input[name="name"]').fill('Ravi');
    await sheet.locator('.ob-mode', { hasText: 'Delivery' }).click();
    ok((await sheet.locator('.ob-hint').textContent()).startsWith('Delivery within 4 km'), 'delivery note shows under the address');
    await sheet.locator('button[type="submit"]').click();
    ok(await sheet.locator('textarea[name="address"][aria-invalid="true"]').isVisible(), 'delivery without an address shows an error');
    await sheet.locator('textarea[name="address"]').fill('12-3-45, Ameerpet');
    await sheet.locator('textarea[name="note"]').fill('less spicy');
    await sheet.locator('button[type="submit"]').click();

    const preview = page.locator('dialog.ob-preview');
    ok(await preview.isVisible(), 'preview mode shows the message instead of opening WhatsApp');
    const msg = await preview.locator('.ob-msg').textContent();
    const lines = msg.split('\n');
    ok(/^New order #LLK-\d{4}-\d{4}$/.test(lines[0]), `first line "${lines[0]}"`);
    ok(
      JSON.stringify(lines.slice(1)) ===
        JSON.stringify(['Lantern Lane Kitchen', '----------------', '2 x Chicken Dum Biryani (Half) = ₹298', '1 x Double Ka Meetha = ₹89', '----------------', 'Total: ₹387', 'Name: Ravi', 'Delivery: 12-3-45, Ameerpet', 'Note: less spicy', 'Payment: UPI to sampleshop@example']),
      'the message matches the format line by line'
    );
    const orders = await page.evaluate(() => window.__orders);
    ok(orders.length === 1 && orders[0].preview === true && orders[0].total === 387, 'orderbutton:order event fired once with the order');
    ok(orders.length === 1 && new URL(orders[0].url).searchParams.get('text') === msg && orders[0].url.startsWith('https://wa.me/910000000000?text='), 'the wa.me link carries exactly this message');
    await shot(page, '4-preview');

    await preview.locator('.ob-copy').click();
    await page.waitForTimeout(150);
    ok(/Copied/.test(await preview.locator('.ob-copy').textContent()), 'Copy message works (shows "Copied")');

    await preview.locator('button', { hasText: 'Continue to payment' }).click();
    const pay = page.locator('dialog.ob-pay');
    ok(await pay.isVisible(), 'Continue to payment opens the pay panel');
    const payText = await pay.textContent();
    ok(payText.includes('₹387') && payText.includes('sampleshop@example'), 'pay panel shows the exact amount and the UPI ID');
    // The QR <img> starts loading when the pay panel opens, so wait for it (up to 5 s) instead of checking at once.
    ok(await pay.locator('.ob-qr img').evaluate((img) => (img.complete && img.naturalWidth > 0) || new Promise((resolve) => {
      img.addEventListener('load', () => resolve(img.naturalWidth > 0), { once: true });
      img.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(img.complete && img.naturalWidth > 0), 5000);
    })), 'the QR image loads from disk');
    ok(await pay.locator('a', { hasText: 'Open WhatsApp again' }).isHidden(), 'no "Open WhatsApp again" in preview mode');
    await shot(page, '5-pay');

    await page.keyboard.press('Escape');
    ok(await pay.isHidden(), 'Esc closes the pay panel');
    const resume = page.locator('.ob-resume');
    ok(await resume.isVisible(), 'a "pay" chip stays in the bar after the order');
    ok(/^Order #LLK-\d{4}-\d{4}: pay ₹387$/.test(await resume.textContent()), `chip text "${await resume.textContent()}"`);
    await resume.click();
    await pay.locator('button', { hasText: 'Start a new order' }).click();
    ok(await page.locator('.ob-bar-wrap').isHidden(), 'Start a new order empties the cart and hides the bar');
    ok((await page.locator('[data-ob-item="chicken-dum-biryani"] [data-ob-add]').isVisible()) === true, 'menu steppers reset');

    await page.reload();
    await page.locator('[data-ob-item="irani-chai"] [data-ob-add]').click();
    await page.locator('.ob-bar__btn').click();
    ok((await sheet.locator('input[name="name"]').inputValue()) === 'Ravi', 'the name is remembered for next time');
    ok(await sheet.locator('.ob-mode input[value="delivery"]').isChecked(), 'so is delivery and the address');

    ok(w.errors.length === 0, `no console errors${w.errors.length ? ': ' + w.errors.join(' | ') : ''}`);
    ok(w.external.length === 0, `no network requests outside the disk${w.external.length ? ': ' + w.external.join(', ') : ''}`);
    await ctx.close();
  }

  // ------------------------------------------------------------------ 2
  console.log('\n2. examples/index.html, desktop, live mode (your own number)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>wa.me stub</title>' }));
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(fileUrl('examples/index.html'));
    const chai = page.locator('[data-ob-item="irani-chai"]');
    await chai.locator('[data-ob-add]').click();
    await chai.locator('[data-ob-inc]').click();
    await page.locator('.demo summary').click();
    await page.locator('#live-number').fill('91 99999 99999');
    await page.locator('#live-form button[type="submit"]').click();
    ok((await page.locator('#live-status').textContent()).startsWith('Live mode'), 'the demo strip switches to live mode');
    await page.locator('.ob-bar__btn').click();
    const sheet = page.locator('dialog.ob-sheet:not(.ob-pay)');
    await sheet.locator('input[name="name"]').fill('Asha');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), sheet.locator('button[type="submit"]').click()]);
    await popup.waitForLoadState();
    const url = popup.url();
    ok(url.startsWith('https://wa.me/919999999999?text='), 'desktop: wa.me opens in a new tab, to the number entered');
    const text = new URL(url).searchParams.get('text');
    ok(text.includes('\n2 x Irani Chai = ₹50\n') && text.includes('\nTotal: ₹50\nName: Asha\nPickup\nPayment: UPI to sampleshop@example'), 'the new tab carries the full message');
    const pay = page.locator('dialog.ob-pay');
    ok(await pay.isVisible(), 'the pay panel is open behind it');
    ok((await pay.locator('a', { hasText: 'Open WhatsApp again' }).getAttribute('href')) === url, '"Open WhatsApp again" points to the same link');
    ok(w.errors.length === 0, `no console errors${w.errors.length ? ': ' + w.errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // ------------------------------------------------------------------ 3
  console.log('\n3. examples/index.html, Android phone, live mode');
  {
    const ctx = await browser.newContext({ ...PHONE, userAgent: ANDROID_UA, isMobile: true });
    await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>wa.me stub</title>' }));
    const page = await ctx.newPage();
    await page.goto(fileUrl('examples/index.html'));
    await page.evaluate(() => OrderButton.instances[0].set({ whatsapp: '919999999999', previewOnly: false }));
    await page.locator('[data-ob-item="paneer-tikka"] [data-ob-add]').click();
    await page.locator('.ob-bar__btn').click();
    const sheet = page.locator('dialog.ob-sheet:not(.ob-pay)');
    await sheet.locator('input[name="name"]').fill('Meena');
    await Promise.all([page.waitForURL(/^https:\/\/wa\.me\//), sheet.locator('button[type="submit"]').click()]);
    const text = new URL(page.url()).searchParams.get('text');
    ok(page.url().startsWith('https://wa.me/919999999999?text='), 'phone: the same tab goes to wa.me (opens the app)');
    ok(text.includes('1 x Paneer Tikka = ₹219') && text.includes('Name: Meena'), 'with the full message');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 4
  console.log('\n4. examples/existing-markup.html, your own markup + auto start');
  {
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(fileUrl('examples/existing-markup.html'));
    ok((await page.locator('.ob-bar-wrap').count()) === 0, 'data-bar="false": no floating bar');
    ok((await page.locator('[data-ob-total]').textContent()) === '₹0', 'header total starts at ₹0');

    const special = page.locator('.special [data-ob-add]');
    await special.click();
    ok((await page.locator('[data-ob-count]').textContent()) === '1', 'a lone data-ob-add="id" button adds the item');
    ok(await special.evaluate((b) => b.hasAttribute('data-ob-in-cart')), 'and gets data-ob-in-cart for styling');

    const truffle = page.locator('[data-ob-item="chocolate-truffle"]');
    await truffle.locator('input[value="1kg"]').check();
    ok((await truffle.locator('[data-ob-price]').textContent()) === '₹850', 'radio sizes update the price');
    await truffle.locator('[data-ob-add]').click();
    ok(await truffle.locator('[data-ob-stepper]').isVisible(), 'Add turns into the page\'s own stepper');

    const sourdough = page.locator('[data-ob-item="sourdough"]');
    await sourdough.locator('[data-ob-inc]').click();
    await sourdough.locator('[data-ob-inc]').click();
    ok((await sourdough.locator('[data-ob-qty]').textContent()) === '2', 'table rows with +/- only work too');
    ok((await page.locator('[data-ob-count]').textContent()) === '4', 'header count: 4');
    ok((await page.locator('[data-ob-total]').textContent()) === '₹1,270', 'header total: ₹1,270');
    await shot(page, '6-existing-markup');

    await page.locator('.cart-btn').click();
    const sheet = page.locator('dialog.ob-sheet:not(.ob-pay)');
    ok(await sheet.isVisible(), 'data-ob-open opens the order sheet');
    await sheet.locator('.ob-mode', { hasText: 'Delivery' }).click();
    const totals = await sheet.locator('.ob-totals').textContent();
    ok(totals.includes('Delivery fee₹40') && totals.includes('Total₹1,310'), 'delivery adds the ₹40 fee');
    await sheet.locator('input[name="name"]').fill('Kiran');
    await sheet.locator('textarea[name="address"]').fill('Flat 4\nRoad 2, Banjara Hills');
    await sheet.locator('button[type="submit"]').click();
    const msg = await page.locator('dialog.ob-preview .ob-msg').textContent();
    ok(/^New order #SP-\d{4}-\d{4}\nSecond Proof Bakery\n/.test(msg), 'custom order prefix SP');
    ok(msg.includes('1 x Chocolate truffle cake (1 kg) = ₹850') && msg.includes('2 x Sourdough loaf = ₹360'), 'sizes and quantities in the message');
    ok(msg.includes('Item total: ₹1,270\nDelivery fee: ₹40\nTotal: ₹1,310'), 'item total, fee and total lines');
    ok(msg.includes('Delivery: Flat 4, Road 2, Banjara Hills') && msg.endsWith('Payment: Online (payment link)'), 'one-line address and the payment line');
    await page.locator('dialog.ob-preview button', { hasText: 'Continue to payment' }).click();
    const pay = page.locator('dialog.ob-pay');
    ok((await pay.locator('a.ob-btn--primary').getAttribute('href')) === 'https://example.com/pay', 'link payment: one button to the payment link');
    ok((await pay.locator('.ob-note').textContent()) === 'Cake orders are confirmed once paid.', 'payment note shows');
    await pay.locator('button', { hasText: 'Start a new order' }).click();

    await page.locator('[data-ob-item="veg-puff"] [data-ob-inc]').click();
    await page.locator('.cart-btn').click();
    ok((await sheet.locator('.ob-min').textContent()) === 'The minimum order is ₹150. Add ₹120 more to order.', 'minimum order message');
    ok((await sheet.locator('button[type="submit"]').getAttribute('aria-disabled')) === 'true', 'send is marked disabled under the minimum');
    await sheet.locator('button[type="submit"]').click({ force: true }); // aria-disabled: Playwright would wait, a person can still press it
    ok((await page.locator('dialog.ob-preview').isHidden()) && (await sheet.locator('.ob-min').evaluate((el) => el.classList.contains('is-flash'))), 'pressing it anyway sends nothing and flags the minimum');
    ok(w.errors.length === 0, `no console errors${w.errors.length ? ': ' + w.errors.join(' | ') : ''}`);
    ok(w.external.length === 0, `no network requests outside the disk${w.external.length ? ': ' + w.external.join(', ') : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll browser checks passed.');
process.exit(failures ? 1 : 0);
