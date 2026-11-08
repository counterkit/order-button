// Unit tests for the parts that need no browser: money, cart, order message,
// config checks and the menu markup. Run: npm test (Node's built-in runner).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createCart,
  createMoney,
  makeOrderId,
  buildOrderMessage,
  paymentSummary,
  waUrl,
  validateConfig,
  normalizeConfig,
  indexMenu,
  defaultVariant,
  menuHTML,
  prefixFromName,
  slug,
  esc,
  upiIntentUrl,
  LABELS,
} from '../src/order-button.js';

const memStorage = () => {
  const m = new Map();
  return { get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => m.set(k, JSON.stringify(v)), remove: (k) => m.delete(k), _m: m };
};
const catalog = {
  'chicken-dum-biryani': { price: 249, variants: { half: 149, full: 249 } },
  'double-ka-meetha': { price: 89 },
  'apollo-fish': { price: 269, available: false },
};
const money = createMoney({ locale: 'en-IN', currency: 'INR', symbol: '₹' });
const example = JSON.parse(fs.readFileSync(new URL('../examples/menu.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

test('money: rupee sign, Indian grouping, decimals only when needed', () => {
  assert.equal(money(298), '₹298');
  assert.equal(money(123456), '₹1,23,456');
  assert.equal(money(49.5), '₹49.50');
  assert.equal(money(0.1 + 0.2), '₹0.30');
  const brl = createMoney({ locale: 'pt-BR', currency: 'BRL', symbol: 'R$' });
  assert.match(brl(25.9), /^R\$\s?25,90$/);
  const bad = createMoney({ locale: 'en-IN', currency: 'NOPE!' });
  assert.equal(bad(10), 'NOPE! 10');
});

test('order ID = prefix + DDMM in the shop time zone + 4 digits', () => {
  // 7 Nov 2026 20:00 UTC is already 8 Nov in India.
  assert.equal(makeOrderId('LLK', { timeZone: 'Asia/Kolkata', date: new Date('2026-11-07T20:00:00Z'), random: 4821 }), 'LLK-0811-4821');
  assert.equal(makeOrderId('SP', { timeZone: 'UTC', date: new Date('2026-01-05T10:00:00Z'), random: 7 }), 'SP-0501-0007');
  assert.match(makeOrderId(), /^ORD-\d{4}-\d{4}$/);
});

test('default prefix and slug come from the shop name', () => {
  assert.equal(prefixFromName('Lantern Lane Kitchen'), 'LLK');
  assert.equal(prefixFromName('Second Proof Bakery & Co'), 'SPB');
  assert.equal(prefixFromName('Chaiwala'), 'CHA');
  assert.equal(prefixFromName('లాంటర్న్'), 'ORD');
  assert.equal(slug('Café Ñandú, Hyderabad!'), 'cafe-nandu-hyderabad');
  assert.equal(slug(''), 'shop');
});

test('cart: add, variants, quantities, remove, saved between visits', () => {
  const storage = memStorage();
  const cart = createCart({ storageKey: 'ob:test', catalog, storage });
  assert.equal(cart.add('chicken-dum-biryani', 'half'), true);
  cart.add('chicken-dum-biryani', 'half');
  cart.add('double-ka-meetha');
  assert.equal(cart.add('chicken-dum-biryani'), false, 'a variant is required when the item has variants');
  assert.equal(cart.add('apollo-fish'), false, 'sold-out items cannot be added');
  assert.equal(cart.add('nope'), false);
  assert.equal(cart.count(), 3);
  assert.equal(cart.subtotal(), 387);
  assert.equal(cart.itemQty('chicken-dum-biryani'), 2);
  const again = createCart({ storageKey: 'ob:test', catalog, storage });
  assert.equal(again.subtotal(), 387, 'restored from storage');
  again.setQty('chicken-dum-biryani', 'half', 1);
  again.remove('double-ka-meetha');
  assert.deepEqual(
    again.lines().map((l) => [l.itemId, l.variantId, l.qty, l.total]),
    [['chicken-dum-biryani', 'half', 1, 149]]
  );
  again.clear();
  assert.equal(storage._m.size, 0);
});

test('cart: prices come from the catalog, never from storage; old carts expire', () => {
  const storage = memStorage();
  storage.set('ob:p:cart', { v: 1, at: Date.now(), lines: [{ i: 'double-ka-meetha', v: null, q: 2 }, { i: 'gone', v: null, q: 1 }] });
  const cart = createCart({ storageKey: 'ob:p', catalog: { 'double-ka-meetha': { price: 99 } }, storage });
  assert.equal(cart.subtotal(), 198);
  assert.equal(cart.count(), 2, 'unknown items are dropped');
  storage.set('ob:old:cart', { v: 1, at: Date.now() - 13 * 3600e3, lines: [{ i: 'double-ka-meetha', v: null, q: 2 }] });
  assert.equal(createCart({ storageKey: 'ob:old', catalog, storage }).count(), 0);
});

test('cart: minimum order and delivery fee', () => {
  const cart = createCart({ storageKey: 'ob:m', catalog, minOrder: 200, deliveryFee: 30, storage: memStorage() });
  cart.add('double-ka-meetha');
  let t = cart.totals('delivery');
  assert.deepEqual([t.short, t.canOrder], [111, false]);
  cart.add('chicken-dum-biryani', 'full');
  t = cart.totals('delivery');
  assert.deepEqual([t.subtotal, t.deliveryFee, t.total, t.short, t.canOrder], [338, 30, 368, 0, true]);
  assert.equal(cart.totals('pickup').total, 338);
  let calls = 0;
  const off = cart.subscribe(() => calls++);
  cart.add('double-ka-meetha');
  off();
  cart.add('double-ka-meetha');
  assert.equal(calls, 1);
});

test('order message: the exact format', () => {
  const msg = buildOrderMessage({
    id: 'LLK-0811-4821',
    shopName: 'Lantern Lane Kitchen',
    lines: [
      { qty: 2, name: 'Chicken Dum Biryani', variant: 'Half', total: 298 },
      { qty: 1, name: 'Double Ka Meetha', total: 89 },
    ],
    totals: { subtotal: 387, deliveryFee: 0, total: 387 },
    customer: { name: 'Ravi', mode: 'delivery', address: '12-3-45, Ameerpet', note: 'less spicy' },
    payment: paymentSummary({ type: 'upi', upi: { vpa: 'sampleshop@example' } }),
    money,
  });
  assert.equal(
    msg,
    [
      'New order #LLK-0811-4821',
      'Lantern Lane Kitchen',
      '----------------',
      '2 x Chicken Dum Biryani (Half) = ₹298',
      '1 x Double Ka Meetha = ₹89',
      '----------------',
      'Total: ₹387',
      'Name: Ravi',
      'Delivery: 12-3-45, Ameerpet',
      'Note: less spicy',
      'Payment: UPI to sampleshop@example',
    ].join('\n')
  );
});

test('order message: pickup, no note, delivery fee, one-line fields, custom labels', () => {
  const base = { id: 'X-0101-0001', shopName: 'Shop', lines: [{ qty: 1, name: 'Tea', total: 20 }], money };
  const pickup = buildOrderMessage({ ...base, totals: { subtotal: 20, deliveryFee: 0, total: 20 }, customer: { name: 'A', mode: 'pickup', note: '  ' } });
  assert.deepEqual(pickup.split('\n').slice(-3), ['Total: ₹20', 'Name: A', 'Pickup']);
  const fee = buildOrderMessage({ ...base, totals: { subtotal: 20, deliveryFee: 30, total: 50 }, customer: { name: 'A', mode: 'delivery', address: 'Flat 2\nRoad 5' } });
  assert.ok(fee.includes('Item total: ₹20\nDelivery fee: ₹30\nTotal: ₹50'));
  assert.ok(fee.includes('Delivery: Flat 2, Road 5'), 'a multi-line address stays on one line');
  const pt = buildOrderMessage({
    ...base,
    totals: { subtotal: 20, deliveryFee: 0, total: 20 },
    customer: { name: 'A', mode: 'pickup' },
    labels: { 'msg.newOrder': 'Novo pedido', 'msg.pickup': 'Retirada' },
  });
  assert.ok(pt.startsWith('Novo pedido #X-0101-0001'));
  assert.ok(pt.endsWith('Retirada'));
  assert.ok(pt.includes('Total: ₹20'), 'labels that are not overridden stay English');
});

test('wa.me link encodes the whole message', () => {
  const url = waUrl('+91 98000-00000', 'New order #1\n2 x Tea = ₹40 & cake');
  assert.equal(url, 'https://wa.me/919800000000?text=New%20order%20%231%0A2%20x%20Tea%20%3D%20%E2%82%B940%20%26%20cake');
  assert.equal(new URL(url).searchParams.get('text'), 'New order #1\n2 x Tea = ₹40 & cake');
});

test('payment summary and the UPI intent link', () => {
  assert.equal(paymentSummary({ type: 'pix', pix: { key: 'loja@exemplo.com' } }), 'Pix to loja@exemplo.com');
  assert.equal(paymentSummary({ type: 'link', link: { url: 'https://x' } }), 'Online (payment link)');
  assert.equal(paymentSummary({ type: 'none' }), '');
  assert.equal(paymentSummary(undefined), '');
  assert.equal(upiIntentUrl({ vpa: 'shop@example', payeeName: 'Tea Shop', amount: 40, orderId: 'T-0101-0001' }), 'upi://pay?pa=shop%40example&pn=Tea%20Shop&am=40.00&cu=INR&tn=Order%20T-0101-0001');
});

test('normalizeConfig fills sensible defaults', () => {
  const c = normalizeConfig({ shop: { name: 'Chai Point Demo', whatsapp: '+91 98000 00000' }, menu: { categories: [{ id: 'tea', name: 'Tea', items: [{ id: 'chai', name: 'Chai', price: 20 }] }] } });
  assert.equal(c.shop.whatsapp, '919800000000');
  assert.deepEqual([c.shop.currency, c.shop.locale], ['INR', 'en-IN']);
  assert.deepEqual(c.ordering.modes, ['pickup', 'delivery']);
  assert.equal(c.ordering.orderPrefix, 'CPD');
  assert.equal(c.ordering.previewOnly, false);
  assert.deepEqual(c.payment, { type: 'none' });
  assert.deepEqual(normalizeConfig(c), c, 'normalizing twice changes nothing');
  const { items, catalog: cat } = indexMenu(normalizeConfig(example).menu);
  assert.deepEqual(cat['chicken-dum-biryani'], { price: 249, available: true, variants: { half: 149, full: 249 } });
  assert.equal(cat['apollo-fish'].available, false);
  assert.equal(defaultVariant(items['chicken-dum-biryani']), 'full');
  assert.equal(defaultVariant({ price: 1, variants: [{ id: 'a', price: 2 }, { id: 'b', price: 3 }] }), 'a');
  assert.equal(defaultVariant(items['double-ka-meetha']), null);
});

test('validateConfig: the example menu is clean', () => {
  assert.deepEqual(validateConfig(example), { errors: [], warnings: [] });
});

test('validateConfig: explains common mistakes by field', () => {
  const live = clone(example);
  live.ordering.previewOnly = false;
  const r0 = validateConfig(live);
  assert.ok(r0.warnings.some((w) => w.startsWith('shop.whatsapp:') && w.includes('placeholder')));

  const c = clone(example);
  c.ordering.previewOnly = false;
  c.shop.whatsapp = '09800012345';
  c.menu.categories[0].items[1].id = 'chicken-dum-biryani';
  c.menu.categories[1].items[0].price = '₹229';
  c.menu.categories[1].items[1].veg = 'yes';
  c.menu.categories[2].items[0].variants[0].name = '';
  c.menu.categories[3].items[0].colour = 'red';
  c.payment = { type: 'upi', upi: { vpa: 'not a vpa' } };
  c.labels = { 'menu.add': 5 };
  const { errors, warnings } = validateConfig(c);
  const has = (list, start) => assert.ok(list.some((e) => e.startsWith(start)), `expected a message starting "${start}" in:\n${list.join('\n')}`);
  has(errors, 'shop.whatsapp:');
  has(errors, 'menu.categories[0].items[1].id');
  has(errors, 'menu.categories[1].items[0].price ("Chicken 65")');
  has(errors, 'menu.categories[1].items[1].veg');
  has(errors, 'menu.categories[2].items[0].variants[0].name');
  has(errors, 'payment.upi.vpa');
  has(errors, 'labels.menu.add');
  has(warnings, 'menu.categories[3].items[0].colour: unknown field');

  assert.ok(validateConfig({ shop: { name: 'X' }, menu: { categories: [] } }).errors.some((e) => e.startsWith('shop.whatsapp')));
  assert.equal(validateConfig({ shop: { name: 'X' }, ordering: { previewOnly: true }, menu: { categories: [{ id: 'a', name: 'A', items: [] }] } }).errors.length, 0);
  assert.ok(validateConfig({ shop: { name: 'X', whatsapp: '9800012345' }, menu: { categories: [{ id: 'a', name: 'A', items: [{ id: 'i', name: 'I', price: 1 }] }] } }).warnings.some((w) => w.includes('country code')));
  assert.ok(validateConfig([]).errors.length === 1);
  assert.ok(validateConfig({ shop: { name: 'X', whatsapp: '919800012345', timezone: 'Mars/Base' }, menu: { categories: [{ id: 'a', name: 'A', items: [{ id: 'i', name: 'I', price: 1 }] }] } }).errors[0].startsWith('shop.timezone'));
  const sizes = validateConfig({ shop: { name: 'X', whatsapp: '919800012345' }, menu: { categories: [{ id: 'a', name: 'A', items: [{ id: 'i', name: 'I', price: 5, variants: [{ id: 's', name: 'S', price: 1 }] }] }] } });
  assert.ok(sizes.warnings.some((w) => w.includes('should equal one of its variant prices')));
});

test('menuHTML: hooks for every item, escaping, sold out, default size, labels', () => {
  const html = menuHTML(example);
  const items = example.menu.categories.flatMap((c) => c.items);
  for (const it of items) assert.ok(html.includes(`data-ob-item="${it.id}"`), it.id);
  assert.equal((html.match(/data-ob-item=/g) || []).length, items.length);
  assert.match(html, /<option value="full" selected>Full · ₹249<\/option>/);
  assert.match(html, /data-ob-item="apollo-fish" data-ob-auto data-ob-unavailable>.*?<button type="button" class="ob-add" disabled>Sold out<\/button>/);
  assert.ok(html.includes('aria-label="Vegetarian"') && html.includes('aria-label="Non-vegetarian"'));
  assert.ok(html.includes('Bestseller · Spicy'));
  assert.ok(html.includes('<h2 class="ob-cat__title" id="ob-cat-biryani-h">Biryani</h2>'));
  assert.ok(menuHTML(example, { heading: 3 }).includes('<h3 class="ob-cat__title"'));
  assert.ok(menuHTML(example, { labels: { 'menu.add': 'Adicionar' } }).includes('>Adicionar</button>'));

  const evil = { shop: { name: 'X' }, menu: { categories: [{ id: 'a', name: '<b>A</b>', items: [{ id: 'i', name: '<img src=x onerror=alert(1)>', description: '"quoted" & \'single\'', price: 1, tags: ['house-special'] }] }] } };
  const out = menuHTML(evil);
  assert.ok(!out.includes('<img src=x'), 'item names are escaped');
  assert.ok(out.includes('&lt;b&gt;A&lt;/b&gt;'));
  assert.ok(out.includes('&quot;quoted&quot; &amp; &#39;single&#39;'));
  assert.ok(out.includes('House special'), 'unknown tags are shown as plain words');
  assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('every label used in the code has English text', () => {
  const src = fs.readFileSync(new URL('../src/order-button.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/t\(\s*'([a-z]+\.[A-Za-z.-]+)'/g)].map((m) => m[1]));
  for (const key of used) assert.ok(key in LABELS, `missing label ${key}`);
});
