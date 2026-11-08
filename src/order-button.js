/**
 * order-button: a no-backend cart and "send order on WhatsApp" button for any static site.
 *
 * One file, no dependencies. Use it as an ES module (this file, or
 * dist/order-button.js) or as a classic script (dist/order-button.iife.js,
 * which sets a global `OrderButton` and starts itself from a
 * <script type="application/json" data-order-button> block).
 *
 * Nothing here talks to a server. The order becomes a ready-made chat message
 * that the customer sends to the shop through a https://wa.me/ link.
 *
 * Sections: labels, helpers, money, cart, order message, config + validation,
 * DOM helpers, payment block, checkout dialogs, menu markup, init.
 *
 * MIT License. Copyright (c) 2026 Halvex Labs.
 */

export const VERSION = '1.0.0';

/* ================================================================ labels */

/**
 * English text for everything the button shows or writes into the message.
 * Override any key with `labels` in the config (or in init options), e.g. to
 * translate: { "checkout.send": "Enviar pedido" }. {name} parts are filled in.
 */
export const LABELS = {
  // menu
  'menu.add': 'Add',
  'menu.addLabel': 'Add {item}',
  'menu.soldOut': 'Sold out',
  'menu.variant': 'Size for {item}',
  'menu.veg': 'Vegetarian',
  'menu.nonVeg': 'Non-vegetarian',
  'menu.qty': '{item} in your order',
  'menu.increase': 'One more {item}',
  'menu.decrease': 'One less {item}',
  'tag.bestseller': 'Bestseller',
  'tag.spicy': 'Spicy',
  'tag.new': 'New',
  'tag.jain': 'Jain',
  'tag.eggless': 'Eggless',
  'tag.chef-special': "Chef's special",
  // floating bar and announcements
  'bar.view': 'View order',
  'bar.items.one': '{count} item',
  'bar.items.other': '{count} items',
  'cart.added': '{item} added. {count} in your order.',
  'cart.updated': '{item}: {count} in your order.',
  // order sheet
  'cart.title': 'Your order',
  'cart.empty': 'Your order is empty. Add something from the menu.',
  'cart.close': 'Close',
  'cart.subtotal': 'Item total',
  'cart.deliveryFee': 'Delivery fee',
  'cart.total': 'Total',
  'cart.minOrder': 'The minimum order is {amount}. Add {short} more to order.',
  'cart.remove': 'Remove {item}',
  'checkout.details': 'Your details',
  'checkout.name': 'Your name',
  'checkout.mode': 'How do you want it?',
  'checkout.pickup': 'Pickup',
  'checkout.delivery': 'Delivery',
  'checkout.address': 'Delivery address',
  'checkout.addressHint': 'House number, street, landmark',
  'checkout.note': 'Note for the shop (optional)',
  'checkout.notePlaceholder': 'Less spicy, no onion, ring the bell...',
  'checkout.send': 'Send order on WhatsApp',
  'checkout.sendHint': 'WhatsApp opens with your order typed out. Press send there to place it.',
  'checkout.nameMissing': 'Add your name so the shop knows who ordered.',
  'checkout.addressMissing': 'Add the delivery address, or choose pickup.',
  // preview mode
  'preview.title': 'Order message',
  'preview.demo': 'Preview mode: on a live site this opens WhatsApp with the message below.',
  'preview.copy': 'Copy message',
  'preview.copied': 'Copied',
  'preview.continue': 'Continue to payment',
  // pay panel
  'pay.title': 'Pay now',
  'pay.intro': 'Order {id}. If you have not sent the WhatsApp message yet, send it first, then pay here.',
  'pay.introPreview': 'Order {id}. On a live site the message would now be open in WhatsApp, ready to send.',
  'pay.reopen': 'Open WhatsApp again',
  'pay.newOrder': 'Start a new order',
  'pay.resume': 'Order {id}: pay {amount}',
  'pay.amount': 'Amount to pay',
  'pay.upiScan': 'Scan with any UPI app',
  'pay.upiId': 'UPI ID',
  'pay.copyUpi': 'Copy UPI ID',
  'pay.copied': 'Copied',
  'pay.upiApp': 'Pay with a UPI app',
  'pay.upiNoteHint': 'Add {id} in the payment note so the shop can match it.',
  'pay.qrAlt': 'UPI QR code for {name}',
  'pay.pixKey': 'Pix key',
  'pay.copyPix': 'Copy Pix key',
  'pay.pixQrAlt': 'Pix QR code',
  'pay.link': 'Pay online',
  'pay.none': 'Pay the shop when you collect or receive your order.',
  // the order message
  'msg.newOrder': 'New order',
  'msg.subtotal': 'Item total',
  'msg.deliveryFee': 'Delivery fee',
  'msg.total': 'Total',
  'msg.name': 'Name',
  'msg.delivery': 'Delivery',
  'msg.pickup': 'Pickup',
  'msg.note': 'Note',
  'msg.payment': 'Payment',
  'msg.upiTo': 'UPI to {vpa}',
  'msg.pixTo': 'Pix to {key}',
  'msg.payLink': 'Online (payment link)',
};

/* =============================================================== helpers */

/** Replace {name} placeholders: fill('Hi {who}', { who: 'Ravi' }) -> 'Hi Ravi'. */
export const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));

/** Escape text for HTML (element content and quoted attributes). */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** "Lantern Lane Kitchen" -> "lantern-lane-kitchen". */
export const slug = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'shop';

/** Default order ID prefix from the shop name: "Lantern Lane Kitchen" -> "LLK", "Chaiwala" -> "CHA". */
export function prefixFromName(name) {
  const words = String(name || '').match(/[A-Za-z0-9]+/g) || [];
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return 'ORD';
}

/* ================================================================= money */

/** Round a price to minor units (paise, cents, centavos). */
export const toMinor = (n) => Math.round(Number(n || 0) * 100);
export const fromMinor = (m) => m / 100;

/**
 * Price formatter: money(1299) -> "₹1,299" (en-IN), "R$ 25,90" (pt-BR).
 * Whole amounts drop the decimals. `symbol` replaces the sign Intl picks.
 * @param {{locale?: string, currency?: string, symbol?: string}} [opts]
 * @returns {(amount: number) => string}
 */
export function createMoney({ locale = 'en-IN', currency = 'INR', symbol } = {}) {
  const make = (digits) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
    } catch {
      return null;
    }
  };
  const whole = make(0);
  const cents = make(2);
  return (amount) => {
    const minor = toMinor(amount);
    const f = minor % 100 === 0 ? whole : cents;
    if (!f) return `${symbol || currency + ' '}${(minor / 100).toFixed(minor % 100 ? 2 : 0)}`;
    return f
      .formatToParts(minor / 100)
      .map((p) => (p.type === 'currency' && symbol ? symbol : p.value))
      .join('');
  };
}

/* ================================================================== cart */

/** localStorage that never throws (private mode, blocked storage); falls back to memory. */
export function safeStorage() {
  const mem = new Map();
  let ls = null;
  try {
    ls = window.localStorage;
    const k = '__ob_probe__';
    ls.setItem(k, '1');
    ls.removeItem(k);
  } catch {
    ls = null;
  }
  return {
    get(key) {
      try {
        const raw = ls ? ls.getItem(key) : mem.get(key);
        return raw == null ? null : JSON.parse(raw);
      } catch {
        return null;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (ls) ls.setItem(key, raw);
        else mem.set(key, raw);
      } catch {
        mem.set(key, raw);
      }
    },
    remove(key) {
      try {
        if (ls) ls.removeItem(key);
      } catch {}
      mem.delete(key);
    },
  };
}

const lineKey = (itemId, variantId) => `${itemId}::${variantId || ''}`;

/**
 * Cart state, saved to localStorage. Prices always come from `catalog`, never
 * from storage, so a price change on the site never leaves a stale price behind.
 *
 * @typedef {{ price: number, available?: boolean, variants?: Record<string, number> }} CatalogItem
 * @param {object} opts
 * @param {string} opts.storageKey                  one per shop, e.g. "ob:lantern-lane-kitchen"
 * @param {Record<string, CatalogItem>} opts.catalog item id -> price info
 * @param {number} [opts.minOrder=0]                minimum item total before ordering
 * @param {number} [opts.deliveryFee=0]             added to the total for delivery orders
 * @param {number} [opts.ttlHours=12]               forget carts older than this
 * @param {number} [opts.maxQty=99]                 per line
 * @param {ReturnType<typeof safeStorage>} [opts.storage]
 */
export function createCart({ storageKey, catalog, minOrder = 0, deliveryFee = 0, ttlHours = 12, maxQty = 99, storage = safeStorage() }) {
  const KEY = `${storageKey}:cart`;
  const subs = new Set();

  const unitPrice = (itemId, variantId) => {
    const item = catalog[itemId];
    if (!item) return null;
    if (variantId) {
      const p = item.variants && item.variants[variantId];
      return typeof p === 'number' ? p : null;
    }
    if (item.variants && Object.keys(item.variants).length) return null; // a variant is required
    return item.price;
  };
  const valid = (l) => l && catalog[l.itemId] && catalog[l.itemId].available !== false && unitPrice(l.itemId, l.variantId) != null && l.qty > 0;

  /** @type {{itemId: string, variantId: string|null, qty: number}[]} */
  let lines = [];
  const saved = storage.get(KEY);
  if (saved && Array.isArray(saved.lines) && Date.now() - (saved.at || 0) < ttlHours * 3600e3) {
    lines = saved.lines
      .map((l) => ({ itemId: String(l.i), variantId: l.v ? String(l.v) : null, qty: Math.min(maxQty, Math.max(0, Math.floor(l.q))) }))
      .filter(valid);
  }

  const persist = () => {
    if (lines.length) storage.set(KEY, { v: 1, at: Date.now(), lines: lines.map((l) => ({ i: l.itemId, v: l.variantId, q: l.qty })) });
    else storage.remove(KEY);
  };
  const emit = () => {
    persist();
    subs.forEach((fn) => fn(api));
  };
  const find = (itemId, variantId) => lines.find((l) => lineKey(l.itemId, l.variantId) === lineKey(itemId, variantId || null));

  const api = {
    /** Add `qty` (default 1) of an item or one of its variants. Returns false if it cannot be ordered. */
    add(itemId, variantId = null, qty = 1) {
      return api.setQty(itemId, variantId, api.qty(itemId, variantId) + qty);
    },
    /** Set an exact quantity; 0 removes the line. */
    setQty(itemId, variantId = null, qty = 0) {
      const v = variantId || null;
      const q = Math.min(maxQty, Math.max(0, Math.floor(Number(qty) || 0)));
      if (q > 0 && !valid({ itemId, variantId: v, qty: q })) return false;
      const line = find(itemId, v);
      if (line && q === 0) lines = lines.filter((l) => l !== line);
      else if (line) line.qty = q;
      else if (q > 0) lines.push({ itemId, variantId: v, qty: q });
      emit();
      return true;
    },
    /** Remove a line completely. */
    remove(itemId, variantId = null) {
      return api.setQty(itemId, variantId, 0);
    },
    /** Quantity of one line (item + variant). */
    qty(itemId, variantId = null) {
      const l = find(itemId, variantId || null);
      return l ? l.qty : 0;
    },
    /** Quantity of an item across all its variants. */
    itemQty(itemId) {
      return lines.reduce((n, l) => n + (l.itemId === itemId ? l.qty : 0), 0);
    },
    /** [{ key, itemId, variantId, qty, unitPrice, total }] in the order they were added. */
    lines() {
      return lines.map((l) => {
        const p = unitPrice(l.itemId, l.variantId);
        return { key: lineKey(l.itemId, l.variantId), itemId: l.itemId, variantId: l.variantId, qty: l.qty, unitPrice: p, total: fromMinor(toMinor(p) * l.qty) };
      });
    },
    /** Total number of units. */
    count() {
      return lines.reduce((n, l) => n + l.qty, 0);
    },
    /** Item total before any delivery fee. */
    subtotal() {
      return fromMinor(lines.reduce((m, l) => m + toMinor(unitPrice(l.itemId, l.variantId)) * l.qty, 0));
    },
    /**
     * Totals for "pickup" or "delivery".
     * `short` is how much more the customer must add to reach minOrder (0 when met).
     */
    totals(mode = 'pickup') {
      const sub = toMinor(api.subtotal());
      const fee = mode === 'delivery' && sub > 0 ? toMinor(deliveryFee) : 0;
      const short = Math.max(0, toMinor(minOrder) - sub);
      return { subtotal: fromMinor(sub), deliveryFee: fromMinor(fee), total: fromMinor(sub + fee), minOrder, short: fromMinor(short), canOrder: sub > 0 && short === 0 };
    },
    clear() {
      lines = [];
      emit();
    },
    /** Call `fn(cart)` after every change. Returns an unsubscribe function. */
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    storageKey,
    storage,
  };
  return api;
}

/* ========================================================= order message */

export const SEPARATOR = '----------------';

/**
 * Order ID = prefix + DDMM (in the shop's time zone) + 4 random digits: "LLK-0811-4821".
 * @param {string} [prefix="ORD"]
 * @param {{timeZone?: string, date?: Date, random?: number}} [opts]
 */
export function makeOrderId(prefix = 'ORD', { timeZone, date = new Date(), random } = {}) {
  let dd, mm;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: '2-digit' }).formatToParts(date);
    dd = parts.find((p) => p.type === 'day').value;
    mm = parts.find((p) => p.type === 'month').value;
  } catch {
    dd = String(date.getDate()).padStart(2, '0');
    mm = String(date.getMonth() + 1).padStart(2, '0');
  }
  let n = random;
  if (n == null) {
    try {
      n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
    } catch {
      n = Math.floor(Math.random() * 10000);
    }
  }
  return `${prefix}-${dd}${mm}-${String(n).padStart(4, '0')}`;
}

const oneLine = (s) =>
  String(s || '')
    .replace(/\s*[\r\n]+\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Build the order message.
 *
 *   New order #LLK-0811-4821
 *   Lantern Lane Kitchen
 *   ----------------
 *   2 x Chicken Dum Biryani (Half) = ₹298
 *   1 x Double Ka Meetha = ₹89
 *   ----------------
 *   Total: ₹387
 *   Name: Ravi
 *   Delivery: 12-3-45, Ameerpet
 *   Note: less spicy
 *   Payment: UPI to sampleshop@example
 *
 * @param {object} o
 * @param {string} o.id                  from makeOrderId()
 * @param {string} o.shopName
 * @param {{qty: number, name: string, variant?: string|null, total: number}[]} o.lines
 * @param {{subtotal: number, deliveryFee: number, total: number}} o.totals
 * @param {{name: string, mode: 'pickup'|'delivery', address?: string, note?: string}} o.customer
 * @param {string} [o.payment]           text after "Payment: " (see paymentSummary); left out when empty
 * @param {(n: number) => string} o.money
 * @param {Record<string, string>} [o.labels]  label overrides (msg.* keys)
 * @returns {string}
 */
export function buildOrderMessage({ id, shopName, lines, totals, customer, payment, money, labels }) {
  const L = (k, vars) => fill((labels && labels[k]) ?? LABELS[k], vars);
  const out = [`${L('msg.newOrder')} #${id}`, oneLine(shopName), SEPARATOR];
  for (const l of lines) out.push(`${l.qty} x ${oneLine(l.name)}${l.variant ? ` (${oneLine(l.variant)})` : ''} = ${money(l.total)}`);
  out.push(SEPARATOR);
  if (totals.deliveryFee > 0) {
    out.push(`${L('msg.subtotal')}: ${money(totals.subtotal)}`);
    out.push(`${L('msg.deliveryFee')}: ${money(totals.deliveryFee)}`);
  }
  out.push(`${L('msg.total')}: ${money(totals.total)}`);
  out.push(`${L('msg.name')}: ${oneLine(customer.name)}`);
  out.push(customer.mode === 'delivery' ? `${L('msg.delivery')}: ${oneLine(customer.address)}` : L('msg.pickup'));
  if (oneLine(customer.note)) out.push(`${L('msg.note')}: ${oneLine(customer.note)}`);
  if (payment) out.push(`${L('msg.payment')}: ${payment}`);
  return out.join('\n');
}

/**
 * Text for the "Payment:" line: "UPI to <vpa>", "Pix to <key>", "Online (payment link)", or "".
 * @param {{type: string, upi?: {vpa: string}, pix?: {key: string}}} payment
 * @param {Record<string, string>} [labels]
 */
export function paymentSummary(payment, labels) {
  const L = (k, vars) => fill((labels && labels[k]) ?? LABELS[k], vars);
  if (!payment) return '';
  if (payment.type === 'upi' && payment.upi) return L('msg.upiTo', { vpa: payment.upi.vpa });
  if (payment.type === 'pix' && payment.pix) return L('msg.pixTo', { key: payment.pix.key });
  if (payment.type === 'link') return L('msg.payLink');
  return '';
}

/** https://wa.me/<digits>?text=<encoded message> */
export function waUrl(number, text) {
  return `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** Phones and tablets get a same-tab navigation (opens the app); desktops get a new tab. */
export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Open the wa.me link: location.href on mobile, window.open on desktop
 * (falls back to location.href if a popup blocker stops it).
 * @returns {'navigate'|'window'}
 */
export function openWhatsApp(url, { mobile = isMobile() } = {}) {
  if (!mobile) {
    const w = window.open(url, '_blank');
    if (w) {
      try {
        w.opener = null;
      } catch {}
      return 'window';
    }
  }
  window.location.href = url;
  return 'navigate';
}

/* ================================================== config + validation */

const MODES = ['pickup', 'delivery'];
const nonNeg = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const str = (v) => (v == null ? '' : String(v));

/** The variant used when none is chosen: the one whose price equals the item price, else the first. */
export function defaultVariant(item) {
  const vs = (item && item.variants) || [];
  if (!vs.length) return null;
  return (vs.find((v) => v.price === item.price) || vs[0]).id;
}

/**
 * Fill in defaults and tidy a config. Safe to call twice.
 * Defaults: currency INR, locale en-IN, modes pickup + delivery, payment none,
 * order prefix from the shop name, time zone = the visitor's.
 */
export function normalizeConfig(input) {
  const c = input && typeof input === 'object' ? input : {};
  const shop = c.shop || {};
  const ordering = c.ordering || {};
  const name = str(shop.name).trim() || 'Shop';
  const modes = Array.isArray(ordering.modes) ? ordering.modes.filter((m) => MODES.includes(m)) : [];
  const payment = c.payment && typeof c.payment === 'object' && c.payment.type ? { ...c.payment } : { type: 'none' };
  const categories = (c.menu && Array.isArray(c.menu.categories) ? c.menu.categories : []).filter((cat) => cat && typeof cat === 'object');
  return {
    shop: {
      name,
      whatsapp: str(shop.whatsapp).replace(/\D/g, ''),
      currency: shop.currency || 'INR',
      currencySymbol: shop.currencySymbol || undefined,
      locale: shop.locale || 'en-IN',
      timezone: shop.timezone || undefined,
    },
    ordering: {
      modes: modes.length ? [...new Set(modes)] : [...MODES],
      minOrder: nonNeg(ordering.minOrder),
      deliveryFee: nonNeg(ordering.deliveryFee),
      deliveryNote: str(ordering.deliveryNote),
      orderPrefix: str(ordering.orderPrefix) || prefixFromName(name),
      previewOnly: ordering.previewOnly === true,
    },
    payment,
    menu: {
      categories: categories.map((cat, ci) => ({
        id: str(cat.id) || `category-${ci + 1}`,
        name: str(cat.name),
        items: (Array.isArray(cat.items) ? cat.items : [])
          .filter((it) => it && typeof it === 'object' && it.id != null)
          .map((it) => ({
            ...it,
            id: str(it.id),
            name: str(it.name) || str(it.id),
            description: str(it.description),
            price: nonNeg(it.price),
            available: it.available !== false,
            tags: Array.isArray(it.tags) ? it.tags.map(str) : [],
            variants: Array.isArray(it.variants) && it.variants.length ? it.variants.filter((v) => v && v.id != null).map((v) => ({ id: str(v.id), name: str(v.name) || str(v.id), price: nonNeg(v.price) })) : null,
          })),
      })),
    },
    labels: c.labels && typeof c.labels === 'object' ? { ...c.labels } : {},
  };
}

/** Item lookup and the price catalog createCart() needs. */
export function indexMenu(menu) {
  const items = {};
  const catalog = {};
  for (const cat of (menu && menu.categories) || []) {
    for (const it of cat.items || []) {
      items[it.id] = it;
      catalog[it.id] = { price: it.price, available: it.available !== false, variants: it.variants ? Object.fromEntries(it.variants.map((v) => [v.id, v.price])) : undefined };
    }
  }
  return { items, catalog };
}

// #region validate (scripts/build.mjs copies this region into .claude/skills/menu-from-photo/check-menu.mjs)
/**
 * Check a config and explain problems in plain words.
 * Errors stop the button from working properly; warnings are worth a look.
 * @param {object} config
 * @param {{previewOnly?: boolean}} [opts]  previewOnly: treat the config as preview-only
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateConfig(config, opts = {}) {
  const errors = [];
  const warnings = [];
  const ID = /^[a-z0-9][a-z0-9_-]*$/;
  const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
  const isStr = (v) => typeof v === 'string' && v.trim() !== '';
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const known = (obj, path, keys) => {
    for (const k of Object.keys(obj)) if (!keys.includes(k) && !k.startsWith('_') && k !== '$schema') warnings.push(`${path}${k}: unknown field, ignored.`);
  };
  const textOrNothing = (v, path) => {
    if (v != null && typeof v !== 'string') errors.push(`${path}: must be text.`);
  };

  if (!isObj(config)) return { errors: ['The file must contain one JSON object: { "shop": ..., "menu": ... }.'], warnings };
  known(config, '', ['shop', 'ordering', 'payment', 'menu', 'labels']);
  const ordering = isObj(config.ordering) ? config.ordering : {};
  const preview = opts.previewOnly != null ? opts.previewOnly : ordering.previewOnly === true;

  // shop
  const shop = config.shop;
  if (!isObj(shop)) errors.push('shop: missing. Add at least { "name": "...", "whatsapp": "919800000000" }.');
  else {
    known(shop, 'shop.', ['name', 'whatsapp', 'currency', 'currencySymbol', 'locale', 'timezone']);
    if (!isStr(shop.name)) errors.push('shop.name: add the shop name.');
    const raw = shop.whatsapp;
    const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (raw == null || raw === '') {
      if (!preview) errors.push('shop.whatsapp: add the number that receives orders, digits only with the country code (919800000000). While testing, you can set ordering.previewOnly to true instead.');
    } else if (typeof raw !== 'string' && typeof raw !== 'number') errors.push('shop.whatsapp: must be text, like "919800000000".');
    else if (digits.length < 8 || digits.length > 15) errors.push(`shop.whatsapp: "${raw}" is not a phone number with country code (8 to 15 digits, like 919800000000).`);
    else if (digits.startsWith('0')) errors.push(`shop.whatsapp: "${raw}" starts with 0. Start with the country code instead (India 91, Brazil 55, UAE 971).`);
    else {
      if (typeof raw === 'number') warnings.push('shop.whatsapp: write the number as text in quotes, like "919800000000".');
      else if (/\D/.test(raw)) warnings.push(`shop.whatsapp: use digits only, like "${digits}". Spaces, + and dashes are removed for you.`);
      if (digits.length === 10) warnings.push(`shop.whatsapp: "${raw}" has 10 digits, which looks like a number without its country code. For India, put 91 in front.`);
      if (!preview && /^0+$/.test(digits.slice(-8))) warnings.push(`shop.whatsapp: "${raw}" looks like a placeholder. Put the shop's real number in before going live.`);
    }
    if (shop.currency != null && (typeof shop.currency !== 'string' || !/^[A-Z]{3}$/.test(shop.currency))) errors.push('shop.currency: use a 3-letter currency code such as INR, BRL, AED, NGN or USD.');
    textOrNothing(shop.currencySymbol, 'shop.currencySymbol');
    if (shop.locale != null) {
      try {
        new Intl.NumberFormat(shop.locale);
      } catch {
        errors.push(`shop.locale: "${shop.locale}" is not a locale. Use one like en-IN, pt-BR or en-AE.`);
      }
    }
    if (shop.timezone != null) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: shop.timezone });
      } catch {
        errors.push(`shop.timezone: "${shop.timezone}" is not a time zone. Use one like Asia/Kolkata or America/Sao_Paulo.`);
      }
    }
  }

  // ordering
  if (config.ordering != null) {
    if (!isObj(config.ordering)) errors.push('ordering: must be an object.');
    else {
      known(ordering, 'ordering.', ['modes', 'minOrder', 'deliveryFee', 'deliveryNote', 'orderPrefix', 'previewOnly']);
      const m = ordering.modes;
      if (m != null && (!Array.isArray(m) || !m.length || m.some((x) => x !== 'pickup' && x !== 'delivery'))) errors.push('ordering.modes: use ["pickup"], ["delivery"] or ["pickup", "delivery"].');
      for (const k of ['minOrder', 'deliveryFee']) if (ordering[k] != null && !isNum(ordering[k])) errors.push(`ordering.${k}: must be a number, 0 or more, without a currency sign.`);
      textOrNothing(ordering.deliveryNote, 'ordering.deliveryNote');
      if (ordering.orderPrefix != null && (typeof ordering.orderPrefix !== 'string' || !/^[A-Za-z0-9]{1,8}$/.test(ordering.orderPrefix))) errors.push('ordering.orderPrefix: 1 to 8 letters or digits, such as LLK.');
      if (ordering.previewOnly != null && typeof ordering.previewOnly !== 'boolean') errors.push('ordering.previewOnly: true or false.');
    }
  }

  // payment
  const pay = config.payment;
  if (pay != null) {
    if (!isObj(pay)) errors.push('payment: must be an object.');
    else {
      known(pay, 'payment.', ['type', 'upi', 'pix', 'link', 'note']);
      if (!['upi', 'pix', 'link', 'none'].includes(pay.type)) errors.push('payment.type: one of "upi", "pix", "link" or "none".');
      if (pay.type === 'upi') {
        if (!isObj(pay.upi) || !isStr(pay.upi.vpa) || !/^[\w.-]+@[\w.-]+$/.test(pay.upi.vpa)) errors.push('payment.upi.vpa: add the UPI ID, like shopname@example.');
        else {
          known(pay.upi, 'payment.upi.', ['vpa', 'payeeName', 'qrImage', 'intent']);
          textOrNothing(pay.upi.payeeName, 'payment.upi.payeeName');
          textOrNothing(pay.upi.qrImage, 'payment.upi.qrImage');
          if (pay.upi.intent === true) warnings.push('payment.upi.intent: the "Pay with a UPI app" button is for verified merchants only. NPCI disallowed P2P intent payments from 1 April 2024.');
        }
      }
      if (pay.type === 'pix') {
        if (!isObj(pay.pix) || !isStr(pay.pix.key)) errors.push('payment.pix.key: add the Pix key.');
        else {
          known(pay.pix, 'payment.pix.', ['key', 'qrImage']);
          textOrNothing(pay.pix.qrImage, 'payment.pix.qrImage');
        }
      }
      if (pay.type === 'link') {
        if (!isObj(pay.link) || !isStr(pay.link.url) || !/^https?:\/\/\S+$/.test(pay.link.url)) errors.push('payment.link.url: add the full payment link, starting with https://.');
        else {
          known(pay.link, 'payment.link.', ['url', 'label']);
          textOrNothing(pay.link.label, 'payment.link.label');
        }
      }
      textOrNothing(pay.note, 'payment.note');
    }
  }

  // menu
  const menu = config.menu;
  if (!isObj(menu) || !Array.isArray(menu.categories) || !menu.categories.length) errors.push('menu.categories: add at least one category with items.');
  else {
    known(menu, 'menu.', ['categories']);
    const catIds = new Set();
    const itemIds = new Map();
    menu.categories.forEach((c, ci) => {
      const p = `menu.categories[${ci}]`;
      if (!isObj(c)) return errors.push(`${p}: must be an object with id, name and items.`);
      known(c, `${p}.`, ['id', 'name', 'items']);
      if (!isStr(c.id) || !ID.test(c.id)) errors.push(`${p}.id: use lowercase letters, digits and dashes, like "biryani".`);
      else if (catIds.has(c.id)) errors.push(`${p}.id: "${c.id}" is used by two categories.`);
      else catIds.add(c.id);
      if (!isStr(c.name)) errors.push(`${p}.name: add the category name.`);
      if (!Array.isArray(c.items)) return errors.push(`${p}.items: must be a list of items.`);
      if (!c.items.length) warnings.push(`${p}.items: "${c.name || c.id}" has no items.`);
      c.items.forEach((it, ii) => {
        const q = `${p}.items[${ii}]`;
        if (!isObj(it)) return errors.push(`${q}: must be an object with id, name and price.`);
        const named = isStr(it.name) ? ` ("${it.name}")` : '';
        known(it, `${q}.`, ['id', 'name', 'description', 'price', 'veg', 'image', 'available', 'tags', 'variants']);
        if (!isStr(it.id) || !ID.test(it.id)) errors.push(`${q}.id${named}: use lowercase letters, digits and dashes, like "chicken-dum-biryani".`);
        else if (itemIds.has(it.id)) errors.push(`${q}.id${named}: "${it.id}" is already used by ${itemIds.get(it.id)}. Item ids must be unique across the whole menu.`);
        else itemIds.set(it.id, q);
        if (!isStr(it.name)) errors.push(`${q}.name: add the item name.`);
        if (!isNum(it.price)) errors.push(`${q}.price${named}: must be a number, 0 or more, without a currency sign.`);
        textOrNothing(it.description, `${q}.description`);
        textOrNothing(it.image, `${q}.image`);
        if (it.veg != null && typeof it.veg !== 'boolean') errors.push(`${q}.veg${named}: true, false, or leave it out.`);
        if (it.available != null && typeof it.available !== 'boolean') errors.push(`${q}.available${named}: true or false.`);
        if (it.tags != null && (!Array.isArray(it.tags) || it.tags.some((t) => typeof t !== 'string' || !ID.test(t)))) errors.push(`${q}.tags${named}: a list of lowercase words, like ["bestseller", "spicy"].`);
        if (it.variants != null) {
          if (!Array.isArray(it.variants) || !it.variants.length) return errors.push(`${q}.variants${named}: a list of sizes, or leave it out.`);
          const vids = new Set();
          it.variants.forEach((v, vi) => {
            const r = `${q}.variants[${vi}]`;
            if (!isObj(v)) return errors.push(`${r}: must be an object with id, name and price.`);
            known(v, `${r}.`, ['id', 'name', 'price']);
            if (!isStr(v.id) || !ID.test(v.id)) errors.push(`${r}.id: use lowercase letters, digits and dashes, like "half".`);
            else if (vids.has(v.id)) errors.push(`${r}.id: "${v.id}" is used twice in this item.`);
            else vids.add(v.id);
            if (!isStr(v.name)) errors.push(`${r}.name: add the size name, like "Half".`);
            if (!isNum(v.price)) errors.push(`${r}.price: must be a number, 0 or more, without a currency sign.`);
          });
          if (isNum(it.price) && it.variants.every((v) => isObj(v) && isNum(v.price)) && !it.variants.some((v) => v.price === it.price)) {
            warnings.push(`${q}.price${named}: should equal one of its variant prices (the size that is picked first). Until then the first variant is the default.`);
          }
        }
      });
    });
  }

  // labels
  if (config.labels != null) {
    if (!isObj(config.labels)) errors.push('labels: must be an object of "key": "text" pairs.');
    else for (const [k, v] of Object.entries(config.labels)) if (typeof v !== 'string') errors.push(`labels.${k}: must be text.`);
  }
  return { errors, warnings };
}
// #endregion validate

/* =========================================================== DOM helpers */

/**
 * h('button', { class: 'x', onclick: fn }, 'Label', childEl)
 * false/null attributes are skipped, true sets an empty attribute, on* adds a
 * listener. Text always goes in as text nodes.
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

const PATHS = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bag: '<path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  chat: '<path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8.5z"/>',
};

/** Inline SVG markup (decorative). Generic line icons only. */
export const svg = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] || ''}</svg>`;

/** Inline SVG icon element (decorative: aria-hidden). */
export function icon(name, size = 20) {
  const span = document.createElement('span');
  span.className = 'ob-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = svg(name, size);
  return span;
}

export function openDialog(d) {
  if (d.open) return;
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
}

export function closeDialog(d) {
  if (typeof d.close === 'function') d.close();
  else d.removeAttribute('open');
}

/** Close a modal dialog when the backdrop (outside its box) is clicked. */
function closeOnBackdrop(d) {
  d.addEventListener('click', (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeDialog(d);
  });
}

/** Copy text; works inside modal dialogs and without the async clipboard API. */
export async function copyText(text, container = document.body) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { readonly: true, 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;opacity:0;pointer-events:none' });
    ta.value = text;
    container.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}

/* ========================================================= payment block */

/**
 * UPI intent link (upi://pay). Used only when payment.upi.intent === true.
 * NPCI: peer-to-peer (P2P) "intent" payments were disallowed from 1 April 2024,
 * and intent is limited for offline, non-verified merchants. Turn intent on
 * ONLY for a verified merchant whose payment provider supports it. The default
 * (QR image + UPI ID + exact amount as text) works for everyone.
 */
export function upiIntentUrl({ vpa, payeeName, amount, orderId, currency = 'INR' }) {
  const q = new URLSearchParams({ pa: vpa, pn: payeeName || '', am: Number(amount).toFixed(2), cu: currency, tn: `Order ${orderId}` });
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}

function copyRow(label, value, buttonLabel, t, container) {
  const btnText = h('span', {}, buttonLabel);
  const status = h('span', { class: 'ob-sr', 'aria-live': 'polite' });
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'ob-btn ob-btn--ghost ob-copy',
      onclick: async () => {
        if (!(await copyText(value, container()))) return;
        btnText.textContent = t('pay.copied');
        status.textContent = t('pay.copied');
        btn.classList.add('is-done');
        setTimeout(() => {
          btnText.textContent = buttonLabel;
          status.textContent = '';
          btn.classList.remove('is-done');
        }, 2000);
      },
    },
    icon('copy', 18),
    btnText
  );
  return h('div', { class: 'ob-copyrow' }, h('div', { class: 'ob-copyrow__text' }, h('span', { class: 'ob-label' }, label), h('strong', { class: 'ob-copyrow__value' }, value)), btn, status);
}

const safeHref = (u) => (/^(https?:|mailto:|tel:|upi:)/i.test(String(u || '')) ? String(u) : '#');

/**
 * The block shown in the pay panel after an order is sent.
 *   upi : exact amount + QR image + UPI ID with a copy button (default for India)
 *   pix : amount + QR image + Pix key with a copy button (Brazil)
 *   link: amount + one button to any payment link
 *   none: amount + "pay the shop when you collect or receive your order"
 * @param {object} payment  { type, upi?, pix?, link?, note? }
 * @param {{amount: number, orderId: string, money: (n:number)=>string, t: (k:string, v?:object)=>string, currency?: string, mobile?: boolean}} o
 * @returns {HTMLElement}
 */
export function renderPayment(payment, { amount, orderId, money, t, currency = 'INR', mobile = false }) {
  const box = h('div', { class: `ob-paybox ob-paybox--${payment.type}` });
  const container = () => box.closest('dialog') || document.body;
  const amountEl = h('p', { class: 'ob-amount' }, h('span', { class: 'ob-label' }, t('pay.amount')), h('strong', {}, money(amount)));

  if (payment.type === 'upi' && payment.upi) {
    const u = payment.upi;
    box.append(amountEl);
    if (u.qrImage) {
      box.append(h('figure', { class: 'ob-qr' }, h('img', { src: u.qrImage, alt: t('pay.qrAlt', { name: u.payeeName || u.vpa }), width: 240, height: 240, decoding: 'async' }), h('figcaption', {}, t('pay.upiScan'))));
    }
    box.append(copyRow(t('pay.upiId'), u.vpa, t('pay.copyUpi'), t, container));
    if (u.payeeName) box.append(h('p', { class: 'ob-small' }, u.payeeName));
    // NPCI rule: only when payment.upi.intent is true (verified merchants). See upiIntentUrl().
    if (u.intent === true && mobile) {
      box.append(h('a', { class: 'ob-btn ob-btn--primary', href: upiIntentUrl({ vpa: u.vpa, payeeName: u.payeeName, amount, orderId, currency }) }, t('pay.upiApp')));
    }
    box.append(h('p', { class: 'ob-small' }, t('pay.upiNoteHint', { id: orderId })));
  } else if (payment.type === 'pix' && payment.pix) {
    const p = payment.pix;
    box.append(amountEl);
    if (p.qrImage) box.append(h('figure', { class: 'ob-qr' }, h('img', { src: p.qrImage, alt: t('pay.pixQrAlt'), width: 240, height: 240, decoding: 'async' })));
    box.append(copyRow(t('pay.pixKey'), p.key, t('pay.copyPix'), t, container));
  } else if (payment.type === 'link' && payment.link) {
    box.append(amountEl);
    box.append(h('a', { class: 'ob-btn ob-btn--primary', href: safeHref(payment.link.url), target: '_blank', rel: 'noopener' }, payment.link.label || t('pay.link'), icon('ext', 18)));
  } else {
    box.append(amountEl, h('p', {}, t('pay.none')));
  }
  if (payment.note) box.append(h('p', { class: 'ob-note' }, payment.note));
  return box;
}

/* ===================================================== checkout dialogs */

const RESUME_HOURS = 3;

/**
 * The order sheet (lines, totals, customer form), the preview modal and the
 * pay panel, each in a native <dialog>. init() calls this for you; use it
 * directly only if you build your own menu and cart wiring.
 *
 * @param {object} o
 * @param {ReturnType<typeof createCart>} o.cart
 * @param {string} o.whatsapp                shop number, digits with country code
 * @param {{modes?: string[], minOrder?: number, orderPrefix?: string, previewOnly?: boolean, deliveryNote?: string}} [o.ordering]
 * @param {object} [o.payment]               { type, upi, pix, link, note }
 * @param {string} [o.timeZone]              shop time zone, for the date in the order ID
 * @param {string} [o.currency]              ISO code, for the UPI intent link
 * @param {(n:number)=>string} o.money
 * @param {(itemId:string, variantId:string|null)=>{name:string, variant?:string|null}} o.describe
 * @param {string} o.shopName
 * @param {Record<string,string>} [o.labels] label overrides
 * @param {HTMLElement} [o.resumeSlot]       where "Order #...: pay ₹..." appears after an order
 * @param {(order: object)=>void} [o.onOrder]
 * @param {()=>void} [o.onChange]            called when the resume slot changes
 * @param {HTMLElement} [o.root]             where the dialogs go (default document.body)
 */
export function mountCheckout(o) {
  const { cart, money, describe, onOrder, onChange, resumeSlot, currency = 'INR', root = document.body } = o;
  const ordering = { ...(o.ordering || {}) };
  const payment = o.payment || { type: 'none' };
  let whatsapp = String(o.whatsapp || '').replace(/\D/g, '');
  const modes = ordering.modes && ordering.modes.length ? ordering.modes : ['pickup'];
  const labels = o.labels || {};
  const t = (k, vars) => fill(labels[k] ?? LABELS[k] ?? k, vars);
  const store = cart.storage;
  const KEY = cart.storageKey;
  const saved = store.get(`${KEY}:customer`) || {};
  const state = { name: saved.name || '', mode: modes.includes(saved.mode) ? saved.mode : modes[0], address: saved.address || '' };
  const uid = 'ob' + Math.random().toString(36).slice(2, 7);
  const T = (el, key, attr) => {
    if (attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
    return el;
  };

  // ---------- order sheet ----------
  const sheetTitle = T(h('h2', { id: `${uid}-title`, class: 'ob-sheet__title' }), 'cart.title');
  const closeBtn = (dialog) => T(h('button', { type: 'button', class: 'ob-x', onclick: () => closeDialog(dialog) }, icon('close', 22)), 'cart.close', 'aria-label');
  const linesEl = h('ul', { class: 'ob-lines' });
  const emptyEl = T(h('p', { class: 'ob-empty', tabindex: -1 }), 'cart.empty');
  const totalsEl = h('dl', { class: 'ob-totals' });
  const minEl = h('p', { class: 'ob-min', role: 'status', tabindex: -1, hidden: true });

  const field = (name, control, labelKey, hintEl) => {
    const err = h('p', { class: 'ob-err', id: `${uid}-${name}-err`, hidden: true });
    control.id = `${uid}-${name}`;
    const wrap = h('div', { class: 'ob-field' }, T(h('label', { for: control.id }), labelKey), control, hintEl, err);
    return { wrap, err, control };
  };
  const nameF = field('name', h('input', { name: 'name', type: 'text', autocomplete: 'name', maxlength: 60, enterkeyhint: 'next' }), 'checkout.name');
  nameF.control.value = state.name;
  const deliveryHint = h('p', { class: 'ob-hint' });
  const addrInput = T(h('textarea', { name: 'address', rows: 2, maxlength: 300, autocomplete: 'street-address' }), 'checkout.addressHint', 'placeholder');
  addrInput.value = state.address;
  const addrF = field('address', addrInput, 'checkout.address', deliveryHint);
  const noteInput = T(h('textarea', { name: 'note', rows: 2, maxlength: 300 }), 'checkout.notePlaceholder', 'placeholder');
  const noteF = field('note', noteInput, 'checkout.note');

  let modeEl;
  if (modes.length > 1) {
    modeEl = h(
      'fieldset',
      { class: 'ob-modes' },
      T(h('legend', { class: 'ob-label' }), 'checkout.mode'),
      h(
        'div',
        { class: 'ob-modes__row' },
        modes.map((m) =>
          h(
            'label',
            { class: 'ob-mode' },
            h('input', {
              type: 'radio',
              name: `${uid}-mode`,
              value: m,
              checked: state.mode === m,
              onchange: () => {
                state.mode = m;
                syncMode();
              },
            }),
            T(h('span', {}), `checkout.${m}`)
          )
        )
      )
    );
  } else {
    modeEl = h('p', { class: 'ob-mode-single' }, T(h('strong', {}), `checkout.${modes[0]}`));
  }

  const sendTotal = h('span', { class: 'ob-send__total' });
  const sendBtn = h('button', { type: 'submit', class: 'ob-btn ob-btn--primary ob-send' }, icon('send', 20), T(h('span', {}), 'checkout.send'), sendTotal);
  const form = h(
    'form',
    { class: 'ob-sheet__inner', novalidate: true },
    h('div', { class: 'ob-sheet__head' }, sheetTitle),
    h('div', { class: 'ob-sheet__body' }, linesEl, emptyEl, totalsEl, minEl, h('fieldset', { class: 'ob-fields' }, T(h('legend', { class: 'ob-sheet__sub' }), 'checkout.details'), nameF.wrap, modeEl, addrF.wrap, noteF.wrap)),
    h('div', { class: 'ob-sheet__foot' }, sendBtn, T(h('p', { class: 'ob-small' }), 'checkout.sendHint'))
  );
  const sheet = h('dialog', { class: 'ob-dialog ob-sheet', 'aria-labelledby': sheetTitle.id }, form);
  form.querySelector('.ob-sheet__head').append(closeBtn(sheet));

  // ---------- preview modal (previewOnly) ----------
  const previewTitle = T(h('h2', { id: `${uid}-ptitle`, class: 'ob-sheet__title' }), 'preview.title');
  const previewMsg = h('pre', { class: 'ob-msg', tabindex: 0 });
  const copyLabel = T(h('span', {}), 'preview.copy');
  const copyStatus = h('span', { class: 'ob-sr', 'aria-live': 'polite' });
  const copyBtn = h('button', { type: 'button', class: 'ob-btn ob-btn--ghost ob-copy' }, icon('copy', 18), copyLabel, copyStatus);
  const continueBtn = T(h('button', { type: 'button', class: 'ob-btn ob-btn--primary' }), 'preview.continue');
  const preview = h(
    'dialog',
    { class: 'ob-dialog ob-modal ob-preview', 'aria-labelledby': previewTitle.id },
    h(
      'div',
      { class: 'ob-sheet__inner' },
      h('div', { class: 'ob-sheet__head' }, previewTitle),
      h('div', { class: 'ob-sheet__body' }, T(h('p', { class: 'ob-demo-line' }), 'preview.demo'), previewMsg),
      h('div', { class: 'ob-sheet__foot ob-row' }, copyBtn, continueBtn)
    )
  );
  preview.querySelector('.ob-sheet__head').append(closeBtn(preview));

  // ---------- pay panel ----------
  const payTitle = T(h('h2', { id: `${uid}-paytitle`, class: 'ob-sheet__title' }), 'pay.title');
  const payBody = h('div', { class: 'ob-sheet__body' });
  const reopenBtn = h('a', { class: 'ob-btn ob-btn--ghost', href: '#', target: '_blank', rel: 'noopener' }, icon('chat', 18), T(h('span', {}), 'pay.reopen'));
  const newOrderBtn = T(h('button', { type: 'button', class: 'ob-btn ob-btn--quiet' }), 'pay.newOrder');
  const pay = h(
    'dialog',
    { class: 'ob-dialog ob-sheet ob-pay', 'aria-labelledby': payTitle.id },
    h('div', { class: 'ob-sheet__inner' }, h('div', { class: 'ob-sheet__head' }, payTitle), payBody, h('div', { class: 'ob-sheet__foot ob-row' }, reopenBtn, newOrderBtn))
  );
  pay.querySelector('.ob-sheet__head').append(closeBtn(pay));

  for (const d of [sheet, preview, pay]) {
    closeOnBackdrop(d);
    root.append(d);
  }

  // ---------- rendering ----------
  const lineLabel = (d) => (d.variant ? `${d.name} (${d.variant})` : d.name);
  function renderLines() {
    linesEl.replaceChildren(
      ...cart.lines().map((l) => {
        const d = describe(l.itemId, l.variantId);
        const label = lineLabel(d);
        const data = { 'data-i': l.itemId, 'data-v': l.variantId || '' };
        return h(
          'li',
          { class: 'ob-line' },
          h('div', { class: 'ob-line__name' }, d.name, d.variant ? h('span', { class: 'ob-line__var' }, d.variant) : null),
          h(
            'div',
            { class: 'ob-step', role: 'group', 'aria-label': label },
            h('button', { type: 'button', class: 'ob-step__btn', 'data-act': 'dec', 'aria-label': t(l.qty === 1 ? 'cart.remove' : 'menu.decrease', { item: label }), ...data }, icon('minus', 18)),
            h('output', { class: 'ob-step__n' }, String(l.qty)),
            h('button', { type: 'button', class: 'ob-step__btn', 'data-act': 'inc', 'aria-label': t('menu.increase', { item: label }), ...data }, icon('plus', 18))
          ),
          h('div', { class: 'ob-line__total' }, money(l.total))
        );
      })
    );
    emptyEl.hidden = cart.count() > 0;
  }

  function renderTotals() {
    const tot = cart.totals(state.mode);
    const row = (key, value, strong) => [h('dt', { class: strong ? 'is-total' : '' }, t(key)), h('dd', { class: strong ? 'is-total' : '' }, money(value))];
    totalsEl.replaceChildren(...(cart.count() ? [...row('cart.subtotal', tot.subtotal), ...(tot.deliveryFee > 0 ? row('cart.deliveryFee', tot.deliveryFee) : []), ...row('cart.total', tot.total, true)] : []));
    minEl.hidden = !(tot.short > 0 && cart.count() > 0);
    minEl.textContent = t('cart.minOrder', { amount: money(ordering.minOrder || 0), short: money(tot.short) });
    sendTotal.textContent = cart.count() ? money(tot.total) : '';
    sendBtn.setAttribute('aria-disabled', String(!tot.canOrder));
  }

  function syncMode() {
    addrF.wrap.hidden = state.mode !== 'delivery';
    const note = ordering.deliveryNote || '';
    deliveryHint.textContent = note;
    deliveryHint.hidden = !note;
    renderTotals();
  }

  function renderSheet() {
    renderLines();
    syncMode();
  }

  linesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { i, v, act } = btn.dataset;
    cart.setQty(i, v || null, cart.qty(i, v || null) + (act === 'inc' ? 1 : -1));
    const again = linesEl.querySelector(`button[data-act="${act}"][data-i="${CSS.escape(i)}"][data-v="${CSS.escape(v)}"]`);
    (again || (cart.count() ? linesEl.querySelector('button') : nameF.control) || sheetTitle).focus();
  });

  const setErr = (f, key) => {
    f.err.textContent = key ? t(key) : '';
    f.err.hidden = !key;
    if (key) {
      f.control.setAttribute('aria-invalid', 'true');
      f.control.setAttribute('aria-describedby', f.err.id);
    } else {
      f.control.removeAttribute('aria-invalid');
      f.control.removeAttribute('aria-describedby');
    }
  };
  nameF.control.addEventListener('input', () => setErr(nameF, null));
  addrInput.addEventListener('input', () => setErr(addrF, null));

  // ---------- last order / resume chip ----------
  const LAST = `${KEY}:last`;
  const lastOrder = () => {
    const l = store.get(LAST);
    return l && Date.now() - l.at < RESUME_HOURS * 3600e3 ? l : null;
  };
  function renderResume() {
    if (!resumeSlot) return;
    const l = payment.type !== 'none' ? lastOrder() : null;
    resumeSlot.replaceChildren(l ? h('button', { type: 'button', class: 'ob-resume', onclick: () => showPay(l) }, t('pay.resume', { id: '#' + l.id, amount: money(l.total) })) : '');
    resumeSlot.hidden = !l;
    if (onChange) onChange();
  }

  let payOrder = null;
  function renderPay() {
    if (!payOrder) return;
    payBody.replaceChildren(
      h('p', { class: 'ob-pay__intro' }, t(payOrder.preview ? 'pay.introPreview' : 'pay.intro', { id: '#' + payOrder.id })),
      renderPayment(payment, { amount: payOrder.total, orderId: payOrder.id, money, t, currency, mobile: isMobile() })
    );
    reopenBtn.hidden = !!payOrder.preview;
    reopenBtn.href = payOrder.url;
  }
  function showPay(order) {
    payOrder = order;
    renderPay();
    closeDialog(sheet);
    closeDialog(preview);
    openDialog(pay);
  }
  newOrderBtn.addEventListener('click', () => {
    cart.clear();
    store.remove(LAST);
    payOrder = null;
    renderResume();
    closeDialog(pay);
  });

  // ---------- preview ----------
  let previewOrder = null;
  copyBtn.addEventListener('click', async () => {
    if (!previewOrder) return;
    if (await copyText(previewOrder.text, preview)) {
      copyLabel.textContent = t('preview.copied');
      copyStatus.textContent = t('preview.copied');
      setTimeout(() => {
        copyLabel.textContent = t('preview.copy');
        copyStatus.textContent = '';
      }, 2000);
    }
  });
  continueBtn.addEventListener('click', () => previewOrder && showPay(previewOrder));

  // ---------- submit ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.name = nameF.control.value.trim();
    state.address = addrInput.value.trim();
    const note = noteInput.value.trim();
    const tot = cart.totals(state.mode);
    let firstBad = null;
    if (!state.name) {
      setErr(nameF, 'checkout.nameMissing');
      firstBad = firstBad || nameF.control;
    }
    if (state.mode === 'delivery' && !state.address) {
      setErr(addrF, 'checkout.addressMissing');
      firstBad = firstBad || addrInput;
    }
    if (!tot.canOrder) {
      (minEl.hidden ? emptyEl : minEl).focus();
      minEl.classList.remove('is-flash');
      void minEl.offsetWidth;
      minEl.classList.add('is-flash');
      return;
    }
    if (firstBad) {
      firstBad.focus();
      return;
    }
    store.set(`${KEY}:customer`, { name: state.name, mode: state.mode, address: state.address });

    const id = makeOrderId(ordering.orderPrefix || 'ORD', { timeZone: o.timeZone });
    const lines = cart.lines().map((l) => {
      const d = describe(l.itemId, l.variantId);
      return { qty: l.qty, name: d.name, variant: d.variant || null, total: l.total };
    });
    const text = buildOrderMessage({
      id,
      shopName: o.shopName,
      lines,
      totals: tot,
      customer: { name: state.name, mode: state.mode, address: state.address, note },
      payment: paymentSummary(payment, labels),
      money,
      labels,
    });
    const url = waUrl(whatsapp, text);
    const order = { id, text, url, total: tot.total, mode: state.mode, lines, at: Date.now(), preview: !!ordering.previewOnly };
    store.set(LAST, { id, total: tot.total, url, at: order.at, preview: order.preview });
    noteInput.value = '';
    renderResume();
    try {
      window.dispatchEvent(new CustomEvent('orderbutton:order', { detail: order }));
    } catch {}
    if (onOrder) onOrder(order);

    if (ordering.previewOnly) {
      previewOrder = order;
      previewMsg.textContent = text;
      closeDialog(sheet);
      openDialog(preview);
    } else {
      showPay(order);
      openWhatsApp(url);
    }
  });

  const unsubscribe = cart.subscribe(() => {
    if (sheet.open) renderSheet();
  });
  renderResume();

  return {
    /** Open the order sheet. */
    open() {
      renderSheet();
      openDialog(sheet);
    },
    /** Close every dialog. */
    close() {
      for (const d of [sheet, preview, pay]) closeDialog(d);
    },
    /** Show the pay panel for an order ({id, total, url, preview}) or the last one. */
    openPay(order = lastOrder()) {
      if (order) showPay(order);
    },
    lastOrder,
    /** Change the number or preview mode after start: set({ whatsapp, previewOnly }). */
    set(patch = {}) {
      if ('whatsapp' in patch) whatsapp = String(patch.whatsapp || '').replace(/\D/g, '');
      if ('previewOnly' in patch) ordering.previewOnly = !!patch.previewOnly;
    },
    /** Current number and preview mode. */
    get settings() {
      return { whatsapp, previewOnly: !!ordering.previewOnly };
    },
    /** Remove the dialogs from the page. */
    destroy() {
      unsubscribe();
      for (const d of [sheet, preview, pay]) d.remove();
    },
    elements: { sheet, preview, pay },
  };
}

/* ========================================================== menu markup */

const humanTag = (tag) => tag.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

/**
 * The menu as an HTML string, with the data-ob-* hooks init() wires up.
 * Needs no DOM, so it also runs at build time (the Astro component uses it).
 * @param {object} config   the menu config (normalized or not)
 * @param {{labels?: Record<string,string>, heading?: number}} [opts]  heading: level for category titles (default 2)
 * @returns {string}
 */
export function menuHTML(config, opts = {}) {
  const cfg = normalizeConfig(config);
  const labels = { ...cfg.labels, ...(opts.labels || {}) };
  const t = (k, vars) => fill(labels[k] ?? LABELS[k] ?? k, vars);
  const money = createMoney({ locale: cfg.shop.locale, currency: cfg.shop.currency, symbol: cfg.shop.currencySymbol });
  const hl = Math.min(5, Math.max(1, Number(opts.heading) || 2));
  const out = ['<div class="ob-menu">'];
  for (const cat of cfg.menu.categories) {
    const cid = `ob-cat-${slug(cat.id)}`;
    out.push(`<section class="ob-cat" id="${esc(cid)}" aria-labelledby="${esc(cid)}-h"><h${hl} class="ob-cat__title" id="${esc(cid)}-h">${esc(cat.name)}</h${hl}><ul class="ob-items" role="list">`);
    for (const it of cat.items) {
      const vid = defaultVariant(it);
      const v = vid ? it.variants.find((x) => x.id === vid) : null;
      const label = v ? `${it.name} (${v.name})` : it.name;
      const tags = it.tags.map((tag) => (LABELS[`tag.${tag}`] || labels[`tag.${tag}`] ? t(`tag.${tag}`) : humanTag(tag)));
      const veg = typeof it.veg === 'boolean' ? `<span class="ob-veg ob-veg--${it.veg ? 'yes' : 'no'}" role="img" aria-label="${esc(t(it.veg ? 'menu.veg' : 'menu.nonVeg'))}"></span>` : '';
      const img = it.image ? `<img class="ob-item__img" src="${esc(it.image)}" alt="" width="88" height="88" loading="lazy" decoding="async">` : '';
      const select = it.variants
        ? `<select class="ob-variant" data-ob-variant aria-label="${esc(t('menu.variant', { item: it.name }))}">${it.variants
            .map((x) => `<option value="${esc(x.id)}"${x.id === vid ? ' selected' : ''}>${esc(x.name)} · ${esc(money(x.price))}</option>`)
            .join('')}</select>`
        : '';
      const buy = it.available
        ? `<button type="button" class="ob-add" data-ob-add aria-label="${esc(t('menu.addLabel', { item: label }))}">${esc(t('menu.add'))}</button>` +
          `<span class="ob-step" data-ob-stepper role="group" aria-label="${esc(t('menu.qty', { item: label }))}" hidden>` +
          `<button type="button" class="ob-step__btn" data-ob-dec aria-label="${esc(t('menu.decrease', { item: label }))}">${svg('minus', 18)}</button>` +
          `<output class="ob-step__n" data-ob-qty>0</output>` +
          `<button type="button" class="ob-step__btn" data-ob-inc aria-label="${esc(t('menu.increase', { item: label }))}">${svg('plus', 18)}</button></span>`
        : `<button type="button" class="ob-add" disabled>${esc(t('menu.soldOut'))}</button>`;
      out.push(
        `<li class="ob-item" data-ob-item="${esc(it.id)}" data-ob-auto${it.available ? '' : ' data-ob-unavailable'}>` +
          `<div class="ob-item__body"><h${hl + 1} class="ob-item__name">${veg}${esc(it.name)}</h${hl + 1}>` +
          (it.description ? `<p class="ob-item__desc">${esc(it.description)}</p>` : '') +
          (tags.length ? `<p class="ob-item__tags">${tags.map(esc).join(' · ')}</p>` : '') +
          `</div>${img}` +
          `<div class="ob-item__buy"><span class="ob-item__price" data-ob-price>${esc(money(v ? v.price : it.price))}</span>${select}${buy}</div></li>`
      );
    }
    out.push('</ul></section>');
  }
  out.push('</div>');
  return out.join('');
}

/** Render the menu into an element (replaces its content). Returns the element. */
export function renderMenu(target, config, opts) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`[order-button] renderMenu: no element matches ${target}`);
  el.innerHTML = menuHTML(config, opts);
  return el;
}

/* ================================================================== init */

/** Every instance started by init(), oldest first. */
export const instances = [];

/**
 * Start the order button on this page.
 *
 *   const ob = init(config, { menu: '#menu' });
 *
 * - renders the menu into `options.menu` (default: an empty [data-ob-menu] element, if any)
 * - wires every [data-ob-item] / [data-ob-add] / [data-ob-open] hook on the page
 * - adds a floating "View order" bar (turn off with bar: false)
 * - mounts the order sheet, preview modal and pay panel
 *
 * @param {object} config  the menu config (see README or order-button.schema.json)
 * @param {object} [options]
 * @param {string|Element|false} [options.menu]   where to render the menu; false = never render
 * @param {boolean} [options.bar=true]            show the floating bar
 * @param {Document|Element} [options.root]       where to look for data-ob-* hooks (default document)
 * @param {Record<string,string>} [options.labels] label overrides (on top of config.labels)
 * @param {string} [options.storageKey]           default "ob:<shop-name-slug>"
 * @param {boolean} [options.previewOnly]         overrides config.ordering.previewOnly
 * @param {(order: object)=>void} [options.onOrder]
 * @param {boolean} [options.quiet]               don't log config problems to the console
 */
export function init(config, options = {}) {
  if (typeof document === 'undefined') throw new Error('[order-button] init() needs a browser. On the server, use menuHTML().');
  const report = validateConfig(config, { previewOnly: options.previewOnly });
  if (!options.quiet) {
    for (const e of report.errors) console.error(`[order-button] ${e}`);
    for (const w of report.warnings) console.warn(`[order-button] ${w}`);
  }
  const cfg = normalizeConfig(config);
  if (options.previewOnly != null) cfg.ordering.previewOnly = !!options.previewOnly;
  const labels = { ...cfg.labels, ...(options.labels || {}) };
  const t = (k, vars) => fill(labels[k] ?? LABELS[k] ?? k, vars);
  const money = createMoney({ locale: cfg.shop.locale, currency: cfg.shop.currency, symbol: cfg.shop.currencySymbol });
  const { items, catalog } = indexMenu(cfg.menu);
  const scope = options.root || document;
  const $$ = (sel) => [...scope.querySelectorAll(sel)];
  const cart = createCart({ storageKey: options.storageKey || `ob:${slug(cfg.shop.name)}`, catalog, minOrder: cfg.ordering.minOrder, deliveryFee: cfg.ordering.deliveryFee });

  const describe = (itemId, variantId) => {
    const it = items[itemId];
    const v = variantId && it && it.variants ? it.variants.find((x) => x.id === variantId) : null;
    return { name: it ? it.name : itemId, variant: v ? v.name : null };
  };
  const labelOf = (id, vid) => {
    const d = describe(id, vid);
    return d.variant ? `${d.name} (${d.variant})` : d.name;
  };

  // ---------- menu ----------
  let menuEl = null;
  if (options.menu !== false) {
    const m = options.menu || '[data-ob-menu]';
    menuEl = typeof m === 'string' ? scope.querySelector(m) : m;
    if (menuEl && (options.menu || !menuEl.querySelector('[data-ob-item]'))) menuEl.innerHTML = menuHTML(cfg, { labels, heading: options.heading });
    else if (options.menu && !menuEl) console.warn(`[order-button] menu: no element matches ${m}`);
  }

  // ---------- floating bar + live region ----------
  const announcer = h('div', { class: 'ob-sr', role: 'status', 'aria-live': 'polite' });
  const resumeSlot = h('div', { class: 'ob-resume-slot', hidden: true });
  const barCount = h('span', { class: 'ob-bar__count' });
  const barTotal = h('span', { class: 'ob-bar__total' });
  const barBtn = h('button', { type: 'button', class: 'ob-bar__btn', 'data-ob-open': '' }, icon('bag', 20), h('span', { class: 'ob-bar__sum' }, barCount, barTotal), h('span', { class: 'ob-bar__cta' }, t('bar.view'), icon('arrow', 18)));
  const bar = options.bar === false ? null : h('div', { class: 'ob-bar-wrap', hidden: true }, h('div', { class: 'ob-bar' }, resumeSlot, barBtn));
  document.body.append(announcer);
  if (bar) document.body.append(bar);

  const checkout = mountCheckout({
    cart,
    whatsapp: cfg.shop.whatsapp,
    ordering: cfg.ordering,
    payment: cfg.payment,
    timeZone: cfg.shop.timezone,
    currency: cfg.shop.currency,
    money,
    describe,
    shopName: cfg.shop.name,
    labels,
    resumeSlot: bar ? resumeSlot : null,
    onOrder: options.onOrder,
    onChange: () => syncBar(),
  });

  const announce = (msg) => {
    announcer.textContent = '';
    setTimeout(() => (announcer.textContent = msg), 30);
  };

  // ---------- item state ----------
  const selectedVariant = (el) => {
    const sel = el.querySelector('select[data-ob-variant]');
    if (sel) return sel.value || null;
    const r = el.querySelector('input[data-ob-variant]:checked');
    return r ? r.value : null;
  };
  const variantFor = (id, el, btn) => {
    const it = items[id];
    if (!it || !it.variants) return null;
    const fromBtn = btn && btn.getAttribute('data-ob-variant');
    return fromBtn || (el && selectedVariant(el)) || defaultVariant(it);
  };

  function syncItem(el) {
    const id = el.getAttribute('data-ob-item');
    const it = items[id];
    if (!it) return;
    const vid = variantFor(id, el);
    const q = cart.qty(id, vid);
    const add = el.querySelector('[data-ob-add]');
    const stepper = el.querySelector('[data-ob-stepper]');
    if (add && stepper) {
      add.hidden = q > 0;
      stepper.hidden = q === 0;
    }
    el.querySelectorAll('[data-ob-qty]').forEach((n) => (n.textContent = String(q)));
    const priceEl = el.querySelector('[data-ob-price]');
    if (priceEl && vid) {
      const v = it.variants.find((x) => x.id === vid);
      if (v) priceEl.textContent = money(v.price);
    }
    if (it.available === false) {
      el.setAttribute('data-ob-unavailable', '');
      if (add) add.disabled = true;
    }
    if (el.hasAttribute('data-ob-auto')) {
      const label = labelOf(id, vid);
      const set = (sel, key) => el.querySelector(sel)?.setAttribute('aria-label', t(key, { item: label }));
      set('[data-ob-add]', 'menu.addLabel');
      set('[data-ob-stepper]', 'menu.qty');
      set('[data-ob-inc]', 'menu.increase');
      set('[data-ob-dec]', q === 1 ? 'cart.remove' : 'menu.decrease');
    }
    el.toggleAttribute('data-ob-in-cart', cart.itemQty(id) > 0);
  }

  function syncBar() {
    const n = cart.count();
    const sub = money(cart.subtotal());
    $$('[data-ob-count]').forEach((el) => (el.textContent = String(n)));
    $$('[data-ob-total]').forEach((el) => (el.textContent = sub));
    if (!bar) return;
    barBtn.hidden = n === 0;
    barCount.textContent = t(n === 1 ? 'bar.items.one' : 'bar.items.other', { count: n });
    barTotal.textContent = sub;
    bar.hidden = n === 0 && resumeSlot.hidden;
    document.documentElement.classList.toggle('ob-has-bar', !bar.hidden);
  }

  function sync() {
    $$('[data-ob-item]').forEach(syncItem);
    $$('[data-ob-add]:not([data-ob-item] [data-ob-add])').forEach((b) => b.toggleAttribute('data-ob-in-cart', cart.itemQty(b.getAttribute('data-ob-add')) > 0));
    syncBar();
  }

  // ---------- events ----------
  const inScope = (el) => scope === document || scope.contains(el);
  const onClick = (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const opener = target.closest('[data-ob-open]');
    if (opener && inScope(opener)) {
      e.preventDefault();
      checkout.open();
      return;
    }
    const btn = target.closest('[data-ob-add], [data-ob-inc], [data-ob-dec]');
    if (!btn || !inScope(btn) || btn.disabled) return;
    const el = btn.closest('[data-ob-item]');
    const own = btn.getAttribute('data-ob-add') || btn.getAttribute('data-ob-inc') || btn.getAttribute('data-ob-dec');
    const id = own || (el && el.getAttribute('data-ob-item'));
    if (!id) return;
    if (!items[id]) {
      console.warn(`[order-button] No menu item with id "${id}".`);
      return;
    }
    e.preventDefault();
    const vid = variantFor(id, own ? null : el, btn);
    const label = labelOf(id, vid);
    if (btn.hasAttribute('data-ob-dec')) {
      if (!cart.qty(id, vid)) return;
      cart.setQty(id, vid, cart.qty(id, vid) - 1);
      announce(t('cart.updated', { item: label, count: cart.qty(id, vid) }));
    } else if (cart.add(id, vid)) {
      announce(t('cart.added', { item: label, count: cart.qty(id, vid) }));
    }
    // Keep keyboard focus on the control the person is using.
    if (el && !own) {
      if (btn.hasAttribute('data-ob-add')) el.querySelector('[data-ob-inc]')?.focus();
      else if (cart.qty(id, vid) === 0) el.querySelector('[data-ob-add]')?.focus();
    }
  };
  const onChangeEvt = (e) => {
    const input = e.target instanceof Element ? e.target.closest('[data-ob-variant]') : null;
    const el = input && input.closest('[data-ob-item]');
    if (el && inScope(el)) syncItem(el);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChangeEvt);
  const unsubscribe = cart.subscribe(sync);
  sync();

  const instance = {
    config: cfg,
    cart,
    checkout,
    money,
    labels,
    t,
    describe,
    /** Open the order sheet. */
    open: () => checkout.open(),
    /** Close the order dialogs. */
    close: () => checkout.close(),
    /** Add an item (and variant) to the cart. Returns false if it cannot be ordered. */
    add: (id, variantId, qty = 1) => cart.add(id, variantId || (items[id] && items[id].variants ? defaultVariant(items[id]) : null), qty),
    /** Re-read the page: call after you add menu markup yourself. */
    sync,
    /** Change the number or preview mode: set({ whatsapp: '919800000000', previewOnly: false }). */
    set: (patch) => {
      checkout.set(patch);
      if (patch && 'whatsapp' in patch) cfg.shop.whatsapp = checkout.settings.whatsapp;
      if (patch && 'previewOnly' in patch) cfg.ordering.previewOnly = checkout.settings.previewOnly;
    },
    /** Remove everything this instance added (listeners, dialogs, bar). The cart stays saved. */
    destroy() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('change', onChangeEvt);
      unsubscribe();
      checkout.destroy();
      announcer.remove();
      if (bar) bar.remove();
      document.documentElement.classList.remove('ob-has-bar');
      const i = instances.indexOf(instance);
      if (i >= 0) instances.splice(i, 1);
    },
    problems: report,
  };
  instances.push(instance);
  try {
    window.dispatchEvent(new CustomEvent('orderbutton:ready', { detail: instance }));
  } catch {}
  return instance;
}

/**
 * Start from every <script type="application/json" data-order-button> block on
 * the page. The IIFE build calls this for you. Optional attributes on the block:
 * data-menu="#selector" (where to render the menu), data-bar="false".
 */
export function autoInit() {
  if (typeof document === 'undefined') return;
  const run = () => {
    document.querySelectorAll('script[type="application/json"][data-order-button]').forEach((s) => {
      if (s.hasAttribute('data-ob-ready')) return;
      s.setAttribute('data-ob-ready', '');
      let config;
      try {
        config = JSON.parse(s.textContent);
      } catch (e) {
        console.error(`[order-button] The JSON inside <script data-order-button> is not valid: ${e.message}`);
        return;
      }
      const opts = {};
      const menu = s.getAttribute('data-menu');
      if (menu) opts.menu = menu === 'false' ? false : menu;
      if (s.getAttribute('data-bar') === 'false') opts.bar = false;
      init(config, opts);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}
