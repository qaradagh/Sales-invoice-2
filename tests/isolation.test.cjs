const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const scope = 'https://qaradagh.github.io/Sales-invoice-2/';
function worker(overrides = {}) {
  const events = {};
  const deleted = [];
  const opened = [];
  const context = {
    URL,
    self: { registration: { scope }, location: { origin: new URL(scope).origin },
      addEventListener: (name, handler) => { events[name] = handler; },
      clients: { claim: async () => {} }, skipWaiting: async () => {} },
    caches: {
      keys: async () => ['faktor-v6', 'unrelated-app', 'sales-invoice-2-https://example.com/-old', 'sales-invoice-2-' + scope + '-old', context.CACHE],
      delete: async key => { deleted.push(key); },
      open: async key => { opened.push(key); return { match: async () => 'version-2-only', addAll: async () => {} }; }
    },
    fetch: async () => { throw new Error('offline'); },
    ...overrides
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), context);
  return { context, events, deleted, opened };
}
test('activating v2 only removes outdated caches owned by its own scope', async () => {
  const w = worker();
  let done;
  w.events.activate({ waitUntil: p => { done = p; } });
  await done;
  assert.deepEqual(w.deleted, ['sales-invoice-2-' + scope + '-old']);
});
test('offline navigation uses only the v2 cache', async () => {
  const w = worker();
  let response;
  w.events.fetch({ request: { method: 'GET', url: scope, mode: 'navigate' }, respondWith: p => { response = p; } });
  assert.equal(await response, 'version-2-only');
  assert.ok(w.opened.every(key => key.startsWith('sales-invoice-2-' + scope)));
});
test('offline shell includes every local dependency, including compact navigation', () => {
  const { context } = worker();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const cached = new Set(context.SHELL.map(file => new URL(file, scope).href));
  for (const [, resource] of html.matchAll(/(?:src|href)="((?:assets\/|manifest\.)[^"#]+)"/g)) {
    assert.ok(cached.has(new URL(resource, scope).href), 'Missing offline dependency: ' + resource);
  }
  const exporter = fs.readFileSync(path.join(root, 'assets/js/export.js'), 'utf8');
  const exportStyles = exporter.match(/fetch\('(assets\/css\/[^']+)'\)/)[1];
  assert.ok(cached.has(new URL(exportStyles, scope).href), 'Missing export stylesheet');
  for (const file of context.SHELL) assert.ok(fs.existsSync(path.join(root, file.split('?')[0])), file);
});
test('draft, archive, contacts, preferences, and folder connection have separate v2 keys', () => {
  const app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
  const keys = [...app.matchAll(/var (?:STORAGE_KEY|THEME_KEY|ZOOM_KEY|ARCHIVE_KEY|CONTACTS_KEY|FOLDER_DB_NAME) = '([^']+)'/g)].map(m => m[1]);
  assert.equal(keys.length, 6);
  assert.equal(new Set(keys).size, 6);
  assert.ok(keys.every(key => key.startsWith('shilan-invoice-v2')));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(new URL(manifest.id, scope).href, scope);
});
