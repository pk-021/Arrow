const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Shorts history navigation respects route, settings, and active passes', async () => {
  const state = { ArrowOn: true, hide_shorts: true, redirect_home: false };
  const updates = [];
  let currentUrl = '';
  let historyListener;
  const chrome = {
    storage: { local: {
      get: async () => ({ ...state }),
      set: async () => {},
      remove: async () => {}
    } },
    alarms: {
      clear: async () => {}, create: async () => {},
      onAlarm: { addListener: () => {} }
    },
    declarativeNetRequest: {
      getDynamicRules: async () => [], updateDynamicRules: async () => {}
    },
    tabs: {
      get: async () => ({ url: currentUrl }),
      update: async (tabId, change) => updates.push({ tabId, ...change })
    },
    webNavigation: { onHistoryStateUpdated: { addListener: listener => { historyListener = listener; } } },
    runtime: {
      onStartup: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      getURL: value => value
    },
    notifications: { create: async () => '' }
  };
  const context = vm.createContext({ chrome, console, importScripts: () => {} });
  const root = path.join(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'js/core/config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/background.js'), 'utf8'), context);
  const redirect = vm.runInContext('redirectHistoryShorts', context);
  assert.equal(typeof historyListener, 'function');

  const visit = async (url, frameId = 0) => {
    currentUrl = url;
    await redirect({ tabId: 7, frameId, url });
  };
  await visit('https://www.youtube.com/shorts/abc');
  assert.deepEqual(updates.pop(), { tabId: 7, url: 'https://www.youtube.com/' });

  state.redirect_home = true;
  await visit('https://www.youtube.com/@creator/shorts?view=1');
  assert.deepEqual(updates.pop(), { tabId: 7, url: 'https://www.youtube.com/feed/subscriptions' });

  for (const url of ['https://www.youtube.com/watch?v=abc', 'https://www.youtube.com/shortstop', 'https://other.example/shorts/abc']) {
    await visit(url);
  }
  await visit('https://www.youtube.com/shorts/abc', 1);
  assert.equal(updates.length, 0);

  state.hide_shorts = false;
  await visit('https://www.youtube.com/shorts/abc');
  state.hide_shorts = true;
  state.ArrowOn = false;
  await visit('https://www.youtube.com/shorts/abc');
  state.ArrowOn = true;
  const now = new Date();
  state.arrow_session_day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  state.arrow_session_end_at = Date.now() + 60_000;
  await visit('https://www.youtube.com/shorts/abc');
  assert.equal(updates.length, 0);

  state.arrow_session_end_at = 0;
  currentUrl = 'https://www.youtube.com/watch?v=abc';
  await redirect({ tabId: 7, frameId: 0, url: 'https://www.youtube.com/shorts/abc' });
  assert.equal(updates.length, 0);
});
