// Checks that the shipped files match the source, that both builds expose the
// same API, and that the examples and the skill's checker agree with the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { buildOutputs, buildMinified, ROOT } from '../scripts/build.mjs';
import * as esm from '../src/order-button.js';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

test('dist/ and the skill checker are built from the current source', async () => {
  const outputs = { ...buildOutputs(), ...(await buildMinified()) };
  for (const [rel, content] of Object.entries(outputs)) assert.ok(read(rel) === content, `${rel} is out of date: run npm run build`);
});

test('the IIFE builds expose the same API as the ES module', () => {
  const names = Object.keys(esm).sort();
  for (const file of ['dist/order-button.iife.js', 'dist/order-button.iife.min.js']) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const ctx = { console, Intl, crypto: globalThis.crypto };
    vm.createContext(ctx);
    vm.runInContext(read(file), ctx);
    assert.deepEqual(Object.keys(ctx.OrderButton).sort(), names, file);
    assert.equal(ctx.OrderButton.VERSION, esm.VERSION);
  }
});

test('package.json points at files that exist', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const target of Object.values(pkg.exports)) assert.ok(fs.existsSync(path.join(ROOT, target)), target);
  assert.equal(pkg.license, 'MIT');
  assert.equal(Object.keys(pkg.dependencies || {}).length, 0, 'no runtime dependencies');
});

test('examples/index.html carries the same config as examples/menu.json', () => {
  const html = read('examples/index.html');
  const block = html.match(/<script type="application\/json" id="menu-data">([\s\S]*?)<\/script>/);
  assert.ok(block, 'config block found');
  const { $schema, ...file } = JSON.parse(read('examples/menu.json'));
  assert.deepEqual(JSON.parse(block[1]), file);
});

test('examples/existing-markup.html only uses item ids from its config', () => {
  const html = read('examples/existing-markup.html');
  const config = JSON.parse(html.match(/<script type="application\/json" data-order-button[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(esm.validateConfig(config), { errors: [], warnings: [] });
  const ids = new Set(config.menu.categories.flatMap((c) => c.items.map((i) => i.id)));
  const used = [...html.matchAll(/data-ob-(?:item|add)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length >= 6);
  for (const id of used) assert.ok(ids.has(id), `unknown id ${id}`);
});

test('the schema file is valid JSON and covers the same fields as validateConfig', () => {
  const schema = JSON.parse(read('order-button.schema.json'));
  assert.deepEqual(Object.keys(schema.properties).sort(), ['$schema', 'labels', 'menu', 'ordering', 'payment', 'shop']);
  const item = schema.$defs.item.properties;
  assert.deepEqual(Object.keys(item).sort(), ['available', 'description', 'id', 'image', 'name', 'price', 'tags', 'variants', 'veg']);
});

test('the README lists every label and every file it links to exists', () => {
  const readme = read('README.md');
  for (const key of Object.keys(esm.LABELS)) assert.ok(readme.includes(`| \`${key}\` |`), `README label table is missing ${key}`);
  for (const [, link] of readme.matchAll(/\]\(((?!https?:|#)[^)\s]+)\)/g)) assert.ok(fs.existsSync(path.join(ROOT, link)), `README links to a missing file: ${link}`);
  for (const [, src] of readme.matchAll(/<img src="((?!https?:)[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, src)), `README shows a missing file: ${src}`);
});

test("the skill's check-menu.mjs: OK, field errors, missing file", () => {
  const checker = path.join(ROOT, '.claude', 'skills', 'menu-from-photo', 'check-menu.mjs');
  const run = (...args) => spawnSync(process.execPath, [checker, ...args], { encoding: 'utf8' });

  const ok = run(path.join(ROOT, 'examples', 'menu.json'));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /OK\. 4 categories, 15 items, 4 with sizes\./);
  assert.match(ok.stdout, /check {4}\(top\): Sample data/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ob-check-'));
  const bad = path.join(dir, 'menu.json');
  fs.writeFileSync(bad, '﻿' + JSON.stringify({ shop: { name: 'Tea' , whatsapp: '919800012345' }, menu: { categories: [{ id: 'tea', name: 'Tea', items: [{ id: 'Masala Chai', name: 'Masala chai', price: '20', _note: 'price hard to read: 20 or 25?' }] }] } }));
  const res = run(bad);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /error {4}menu\.categories\[0\]\.items\[0\]\.id/);
  assert.match(res.stdout, /error {4}menu\.categories\[0\]\.items\[0\]\.price \("Masala chai"\)/);
  assert.match(res.stdout, /check {4}menu\.categories\[0\]\.items\[0\] \("Masala chai"\): price hard to read/);

  assert.equal(run(path.join(dir, 'missing.json')).status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});
