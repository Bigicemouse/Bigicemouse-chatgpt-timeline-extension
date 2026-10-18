const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function environment({ url = 'https://chatgpt.com/', loaded = false, loadError = false } = {}) {
  const calls = [];
  let listener;
  const chrome = {
    runtime: { id: 'timeline-test', getURL: name => 'chrome-extension://timeline-test/' + name, onMessage: { addListener(fn) { listener = fn; } } },
    tabs: { async get(id) { return { id, url }; } },
    scripting: { async executeScript(options) {
      calls.push(options);
      if (options.files) {
        if (loadError) throw new Error('injection failed');
        loaded = true;
        return [{ result: undefined }];
      }
      return [{ result: options.args ? loaded : { ok: loaded } }];
    } }
  };
  const context = vm.createContext({ chrome, URL, Map, Promise, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'src/background/exporter.js'), 'utf8'), context);
  return { calls, listener, bridge: context.TLExporterBridge };
}

test('popup export card follows the reading width and vendors load only on demand', () => {
  const html = fs.readFileSync(path.join(__dirname, 'src/popup/popup.html'), 'utf8');
  assert.match(html, /id="tl-open-exporter"/);
  assert.ok(html.indexOf('id="tl-open-exporter"') > html.indexOf('id="tl-reading-width-slider"'));
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
  assert.ok(manifest.permissions.includes('scripting'));
  assert.ok(!JSON.stringify(manifest.content_scripts).includes('vendor'));
});

test('exporter bridge remains idle at startup and lazily loads local files in MAIN', async () => {
  const env = environment();
  assert.equal(env.calls.length, 0);
  const result = await env.bridge.open(42);
  assert.equal(result.ok, true);
  const injection = env.calls.find(call => call.files);
  assert.deepEqual(Array.from(injection.files), ['src/vendor/jszip.min.js', 'src/vendor/chatgpt-exporter.js']);
  assert.equal(injection.world, 'MAIN');
  assert.equal(injection.target.tabId, 42);
});

test('an already loaded exporter opens without loading it twice', async () => {
  const env = environment({ loaded: true });
  assert.equal((await env.bridge.open(42)).ok, true);
  assert.equal(env.calls.filter(call => call.files).length, 0);
});

test('concurrent open requests share the same load', async () => {
  const env = environment();
  await Promise.all([env.bridge.open(42), env.bridge.open(42)]);
  assert.equal(env.calls.filter(call => call.files).length, 1);
});

test('other sites and missing tabs are rejected before script execution', async () => {
  const env = environment({ url: 'https://example.com/' });
  await assert.rejects(env.bridge.open(42), /ChatGPT/);
  await assert.rejects(env.bridge.open(-1), /标签页/);
  assert.equal(env.calls.length, 0);
});

test('runtime messaging reports load failure and allows retry', async () => {
  const env = environment({ loadError: true });
  const result = await new Promise(resolve => {
    assert.equal(env.listener({ type: 'tl-open-exporter', tabId: 42 }, { id: 'timeline-test', url: 'chrome-extension://timeline-test/src/popup/popup.html' }, resolve), true);
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /injection failed/);
  await assert.rejects(env.bridge.open(42), /injection failed/);
  assert.equal(env.calls.filter(call => call.files).length, 2);
  assert.equal(env.listener({ type: 'other' }, {}, () => {}), false);
});

test('the open command is restricted to this extension popup', () => {
  const env = environment();
  assert.equal(env.listener({ type: 'tl-open-exporter', tabId: 42 }, {
    id: 'timeline-test', url: 'https://chatgpt.com/'
  }, () => {}), false);
  assert.equal(env.calls.length, 0);
});
