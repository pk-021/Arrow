"use strict";

importScripts('core/config.js');

const { MODE_KEYS, MODE_PRESETS, SETTINGS_KEYS, SIDEBAR_SETTING_KEY, SIDEBAR_CHILD_KEYS, snapshot, detectMode, readMode, readOffResumeState, resolveMode } = ArrowConfig;
const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
const YOUTUBE_HOME_URL = 'https://www.youtube.com/';
const SHORTS_URL = /^https:\/\/www\.youtube\.com\/(?:[^/?#]+\/)*shorts(?:[/?#]|$)/;
const LEGACY_BLOCK_RULE_BASE_ID = 1000;
const STATE_REVISION_KEY = 'arrow_state_revision';
const PENDING_TRANSACTION_KEY = 'arrow_pending_transaction';
const SESSION_ALARM = 'arrow-session-end';
const SESSION_KEYS = ['arrow_daily_session_minutes', 'arrow_session_day', 'arrow_session_used_minutes', 'arrow_session_end_at'];
const SYNC_PREFERENCES_KEY = 'arrow_sync_preferences';
const SYNC_STATUS_ERROR_KEY = 'arrow_sync_status_error';
const SYNC_SCHEMA_VERSION = 1;
const SYNC_MAX_ITEM_BYTES = 8 * 1024;
const SYNC_MAX_TOTAL_BYTES = 100 * 1024;
const SYNC_PREFERENCE_KEYS = Object.freeze([
  ...SETTINGS_KEYS,
  'arrow_daily_session_minutes',
  'themeSetting',
  MODE_KEYS.mode,
  MODE_KEYS.snapshot,
  MODE_KEYS.customSettings,
  MODE_KEYS.resume
]);
let commitQueue = Promise.resolve();
const localDay = (time = Date.now()) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
function sessionView(state, now = Date.now()) {
  const day = localDay(now);
  const budget = [15, 30, 45, 60].includes(state.arrow_daily_session_minutes) ? state.arrow_daily_session_minutes : 30;
  const sameDay = state.arrow_session_day === day;
  const used = sameDay ? Math.min(budget, Math.max(0, Number(state.arrow_session_used_minutes) || 0)) : 0;
  const endAt = sameDay && Number(state.arrow_session_end_at) > now ? Number(state.arrow_session_end_at) : 0;
  return { day, budget, used, remaining: Math.max(0, budget - used), endAt };
}

function enqueueCommit(work) {
  const next = commitQueue.then(work, work);
  commitQueue = next.catch(() => undefined);
  return next;
}

function isSettingsPatch(patch) {
  return SETTINGS_KEYS.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
}

function synchronizeSidebarPatch(current, patch) {
  const hasMaster = Object.prototype.hasOwnProperty.call(patch, SIDEBAR_SETTING_KEY);
  const changedChildren = SIDEBAR_CHILD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(patch, key));
  if (!hasMaster && !changedChildren.length) return patch;

  const synchronized = { ...patch };
  if (hasMaster && !changedChildren.length) {
    for (const key of SIDEBAR_CHILD_KEYS) synchronized[key] = !!patch[SIDEBAR_SETTING_KEY];
    return synchronized;
  }

  const next = { ...current, ...synchronized };
  synchronized[SIDEBAR_SETTING_KEY] = SIDEBAR_CHILD_KEYS.every((key) => !!next[key]);
  return synchronized;
}

function syncStorageCall(method, ...args) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync[method](...args, (result) => {
      const error = chrome.runtime.lastError;
      if (error) return reject(new Error(error.message));
      resolve(result);
    });
  });
}

async function setSyncStatusError(message = '') {
  try {
    if (message) await chrome.storage.session.set({ [SYNC_STATUS_ERROR_KEY]: message });
    else await chrome.storage.session.remove(SYNC_STATUS_ERROR_KEY);
  } catch (error) {
    console.warn('[Sync] Could not update sync status:', error);
  }
}

function makeSyncPreferences(state) {
  const preferences = {};
  for (const key of SYNC_PREFERENCE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(state, key)) preferences[key] = state[key];
  }
  return { version: SYNC_SCHEMA_VERSION, updatedAt: Date.now(), preferences };
}

function syncEnvelopeBytes(envelope) {
  return new TextEncoder().encode(JSON.stringify({ [SYNC_PREFERENCES_KEY]: envelope })).byteLength;
}

function validSyncPreferences(envelope) {
  if (!envelope || envelope.version !== SYNC_SCHEMA_VERSION || !envelope.preferences || typeof envelope.preferences !== 'object') return null;
  const patch = {};
  for (const key of SETTINGS_KEYS) {
    if (typeof envelope.preferences[key] === 'boolean') patch[key] = envelope.preferences[key];
  }
  if ([15, 30, 45, 60].includes(envelope.preferences.arrow_daily_session_minutes)) {
    patch.arrow_daily_session_minutes = envelope.preferences.arrow_daily_session_minutes;
  }
  if (['light', 'dark', 'system'].includes(envelope.preferences.themeSetting)) patch.themeSetting = envelope.preferences.themeSetting;
  if (ArrowConfig.VALID_MODES.has(envelope.preferences[MODE_KEYS.mode])) patch[MODE_KEYS.mode] = envelope.preferences[MODE_KEYS.mode];
  if (envelope.preferences[MODE_KEYS.snapshot] && typeof envelope.preferences[MODE_KEYS.snapshot] === 'object') {
    patch[MODE_KEYS.snapshot] = snapshot(envelope.preferences[MODE_KEYS.snapshot], true);
  }
  if (envelope.preferences[MODE_KEYS.customSettings] && typeof envelope.preferences[MODE_KEYS.customSettings] === 'object') {
    patch[MODE_KEYS.customSettings] = snapshot(envelope.preferences[MODE_KEYS.customSettings], true);
  }
  const resume = envelope.preferences[MODE_KEYS.resume];
  if (resume && ArrowConfig.VALID_MODES.has(resume.mode) && resume.mode !== 'off' && resume.settings && typeof resume.settings === 'object') {
    patch[MODE_KEYS.resume] = { mode: resume.mode, settings: snapshot(resume.settings, true) };
  }
  return Object.keys(patch).length ? patch : null;
}

async function mirrorPreferencesToSync(state) {
  const envelope = makeSyncPreferences(state);
  const itemBytes = syncEnvelopeBytes(envelope);
  if (itemBytes >= SYNC_MAX_ITEM_BYTES) throw new Error('Sync preference item exceeds Chrome’s 8 KB limit.');
  const [totalBytes, oldItemBytes] = await Promise.all([
    syncStorageCall('getBytesInUse', null),
    syncStorageCall('getBytesInUse', SYNC_PREFERENCES_KEY)
  ]);
  if (totalBytes - oldItemBytes + itemBytes >= SYNC_MAX_TOTAL_BYTES) {
    throw new Error('Chrome sync storage is full (100 KB limit).');
  }
  await syncStorageCall('set', { [SYNC_PREFERENCES_KEY]: envelope });
  await setSyncStatusError();
}

async function applyRemoteSyncPreferences(envelope) {
  const patch = validSyncPreferences(envelope);
  if (!patch) return;
  const current = await chrome.storage.local.get(SYNC_PREFERENCE_KEYS);
  const localPreferences = makeSyncPreferences(current).preferences;
  if (JSON.stringify(localPreferences) === JSON.stringify(envelope.preferences)) return;
  await commitPatch(patch, { mirrorToSync: false });
}

function prepareStatePatch(current, patch) {
  patch = synchronizeSidebarPatch(current, patch);
  const hasExplicitMode = Object.prototype.hasOwnProperty.call(patch, MODE_KEYS.mode);
  const resume = readOffResumeState(current);
  const restorePreviousMode = patch.ArrowOn === true && current.ArrowOn === false && !hasExplicitMode && resume;
  const effectivePatch = restorePreviousMode
    ? { ...patch, ...resume.settings, [MODE_KEYS.mode]: resume.mode }
    : patch;
  const next = { ...current, ...effectivePatch };
  if (!isSettingsPatch(effectivePatch) && !Object.prototype.hasOwnProperty.call(effectivePatch, MODE_KEYS.mode)) return effectivePatch;
  const settings = snapshot(next, true);
  const mode = resolveMode(current, settings, effectivePatch[MODE_KEYS.mode]);
  const prepared = {
    ...effectivePatch,
    [MODE_KEYS.mode]: mode,
    [MODE_KEYS.snapshot]: settings,
    [MODE_KEYS.updatedAt]: Date.now(),
    ...(mode === 'custom' ? { [MODE_KEYS.customSettings]: settings } : {})
  };
  if (patch.ArrowOn === false && current.ArrowOn !== false && mode === 'off') {
    prepared[MODE_KEYS.resume] = { mode: readMode(current), settings: snapshot(current, true) };
  }
  return prepared;
}

async function recoverPendingTransaction() {
  const pending = (await chrome.storage.local.get(PENDING_TRANSACTION_KEY))[PENDING_TRANSACTION_KEY];
  if (!pending?.patch || !Number.isInteger(pending.revision)) return;
  const current = await chrome.storage.local.get(STATE_REVISION_KEY);
  if ((current[STATE_REVISION_KEY] || 0) < pending.revision) {
    await chrome.storage.local.set({ ...pending.patch, [STATE_REVISION_KEY]: pending.revision });
  }
  await chrome.storage.local.remove(PENDING_TRANSACTION_KEY);
}

async function commitPatch(patch, { mirrorToSync = true } = {}) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings change.');
  if ('arrow_daily_session_minutes' in patch && ![15, 30, 45, 60].includes(patch.arrow_daily_session_minutes)) throw new Error('Invalid daily allowance.');
  return enqueueCommit(async () => {
    const result = await commitCurrent(await chrome.storage.local.get(null), patch);
    await syncSessionProjection(result.state);
    if (mirrorToSync && SYNC_PREFERENCE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(result.state, key))) {
      try {
        await mirrorPreferencesToSync(result.state);
      } catch (error) {
        await setSyncStatusError(error.message);
        console.warn('[Sync] Preference sync failed:', error);
      }
    }
    return result;
  });
}

async function commitCurrent(current, patch) {
    const prepared = prepareStatePatch(current, patch);
    const revision = (Number.isInteger(current[STATE_REVISION_KEY]) ? current[STATE_REVISION_KEY] : 0) + 1;
    const transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      revision,
      patch: prepared,
      createdAt: Date.now()
    };
    await chrome.storage.local.set({ [PENDING_TRANSACTION_KEY]: transaction });
    await chrome.storage.local.set({ ...prepared, [STATE_REVISION_KEY]: revision });
    await chrome.storage.local.remove(PENDING_TRANSACTION_KEY);
    return { revision, state: { ...current, ...prepared, [STATE_REVISION_KEY]: revision } };
}

async function syncSessionProjection(state) {
  const view = sessionView(state);
  await chrome.alarms.clear(SESSION_ALARM);
  if (view.endAt) await chrome.alarms.create(SESSION_ALARM, { when: view.endAt });
  const paused = !!view.endAt || !state.ArrowOn;
  await Promise.all([
    setRedirectRules('home', !paused && !!state.redirect_home),
    setRedirectRules('shorts', !paused && !!state.hide_shorts,
      state.redirect_home ? SUBSCRIPTIONS_URL : YOUTUBE_HOME_URL)
  ]);
}

function mutateSession(kind, minutes) {
  return enqueueCommit(async () => {
    const current = await chrome.storage.local.get(null);
    const view = sessionView(current);
    let patch;
    if (kind === 'start') {
      if (![5, 10, 15].includes(minutes) || view.endAt || minutes > view.remaining) throw new Error('Session unavailable.');
      patch = { arrow_session_day: view.day, arrow_session_used_minutes: view.used + minutes,
        arrow_session_duration_minutes: minutes,
        arrow_session_end_at: Date.now() + minutes * 60000 };
    } else {
      if (!view.endAt) throw new Error('No active session.');
      patch = { arrow_session_end_at: 0 };
    }
    const result = await commitCurrent(current, patch);
    await syncSessionProjection(result.state);
    return sessionView(result.state);
  });
}

const redirectRules = {
  home: {
    destination: SUBSCRIPTIONS_URL,
    rules: [
      { id: 1, condition: { urlFilter: 'youtube.com/feed/trending', resourceTypes: ['main_frame'] } },
      { id: 2, condition: { urlFilter: 'youtube.com/shorts', resourceTypes: ['main_frame'] } },
      { id: 3, condition: { regexFilter: '^https://(www\\.)?youtube\\.com/?$', resourceTypes: ['main_frame'] } }
    ]
  },
  shorts: {
    destination: YOUTUBE_HOME_URL,
    rules: [
      {
        id: 4,
        priority: 2,
        condition: {
          regexFilter: '^https://([a-z0-9-]+\\.)?youtube\\.com/(?:[^/?#]+/)*shorts(?:[/?#]|$)',
          resourceTypes: ['main_frame']
        }
      }
    ]
  }
};

function withRedirect(rule, destination) {
  return { ...rule, priority: rule.priority || 1, action: { type: 'redirect', redirect: { url: destination } } };
}

async function replaceRules(rules, ids, destination) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules.map((rule) => withRedirect(rule, destination)), removeRuleIds: ids
    });
  } catch (error) {
    console.error('[DNR] Failed to update redirect rules:', error);
  }
}

function setRedirectRules(kind, enabled, destination) {
  const ruleSet = redirectRules[kind];
  return replaceRules(
    enabled ? ruleSet.rules : [],
    ruleSet.rules.map(({ id }) => id),
    destination || ruleSet.destination
  );
}

async function removeLegacyBlockRules() {
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const legacyRuleIds = currentRules
    .filter(({ id }) => id >= LEGACY_BLOCK_RULE_BASE_ID)
    .map(({ id }) => id);
  if (legacyRuleIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: legacyRuleIds });
  }
}

async function initializeSettings() {
  await enqueueCommit(async () => {
    await recoverPendingTransaction();
    const existing = await chrome.storage.local.get(null);
    const patch = {};
    const savedMode = ArrowConfig.VALID_MODES.has(existing[MODE_KEYS.mode])
      ? existing[MODE_KEYS.mode]
      : 'minimal';
    const defaults = MODE_PRESETS[savedMode] || MODE_PRESETS.minimal;
    for (const [key, value] of Object.entries(defaults)) {
      if (typeof existing[key] === 'undefined') patch[key] = value;
    }
    for (const key of SIDEBAR_CHILD_KEYS) {
      if (typeof existing[key] === 'undefined') patch[key] = !!existing[SIDEBAR_SETTING_KEY];
    }
    if (!ArrowConfig.VALID_MODES.has(existing[MODE_KEYS.mode])) {
      patch[MODE_KEYS.mode] = detectMode(snapshot({ ...existing, ...patch }, true));
    }
    if (!existing[MODE_KEYS.snapshot]) {
      patch[MODE_KEYS.snapshot] = snapshot({ ...existing, ...patch }, true);
    }
    if (!existing[MODE_KEYS.updatedAt]) patch[MODE_KEYS.updatedAt] = Date.now();
    if (!Number.isInteger(existing[STATE_REVISION_KEY])) patch[STATE_REVISION_KEY] = 0;
    if (Object.keys(patch).length) await chrome.storage.local.set(patch);
    await chrome.storage.local.remove([
      'enable_channel_blocking', 'enable_website_blocking', 'blockedWebsites',
      'arrow_block_rule_ids', 'arrow_pending_block_updates',
      'arrow_has_pending_block_deletions', 'arrow_original_block_lists', 'targetTab'
    ]);
  });
}

function showNotification(message) {
  return chrome.notifications.create('', {
    type: 'basic', iconUrl: chrome.runtime.getURL('assets/logo_v2.png'),
    title: 'Arrow', message: String(message || ''), priority: 2
  });
}

function initializeAndReconcile() {
  return (async () => {
    await initializeSettings();
    await removeLegacyBlockRules();
    let synced = {};
    try {
      synced = await syncStorageCall('get', SYNC_PREFERENCES_KEY);
    } catch (error) {
      await setSyncStatusError(error.message);
    }
    await applyRemoteSyncPreferences(synced[SYNC_PREFERENCES_KEY]);
    await syncSessionProjection(await chrome.storage.local.get(null));
  })();
}

async function redirectHistoryShorts(details) {
  if (details.frameId !== 0 || details.tabId < 0 || !SHORTS_URL.test(details.url)) return;
  const state = await chrome.storage.local.get(null);
  if (!state.ArrowOn || !state.hide_shorts || sessionView(state).endAt) return;
  const tab = await chrome.tabs.get(details.tabId);
  if (tab.url !== details.url) return;
  await chrome.tabs.update(details.tabId, {
    url: state.redirect_home ? SUBSCRIPTIONS_URL : YOUTUBE_HOME_URL
  });
}

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  redirectHistoryShorts(details).catch((error) => console.warn('[Shorts] History redirect failed:', error));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SESSION_ALARM) enqueueCommit(async () => syncSessionProjection(await chrome.storage.local.get(null))).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => initializeAndReconcile().catch(console.error));
chrome.runtime.onInstalled.addListener(() => initializeAndReconcile().catch(console.error));
initializeAndReconcile().catch((error) => console.warn('[Startup] Settings initialization failed:', error));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes[SYNC_PREFERENCES_KEY]?.newValue) return;
  (async () => {
    try {
      await applyRemoteSyncPreferences(changes[SYNC_PREFERENCES_KEY].newValue);
    } catch (error) {
      await setSyncStatusError(error.message);
      console.warn('[Sync] Remote preference update failed:', error);
    }
  })();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'arrow:commit') {
    commitPatch(message.patch).then(
      ({ revision }) => sendResponse({ success: true, revision }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  if (message?.type === 'arrow:session-start' || message?.type === 'arrow:session-skip') {
    mutateSession(message.type === 'arrow:session-start' ? 'start' : 'skip', message.minutes).then(
      (session) => sendResponse({ success: true, session }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  if (message?.type === 'toggleRedirects') {
    chrome.storage.local.get(null).then(syncSessionProjection).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message?.type === 'toggleShorts') {
    chrome.storage.local.get(null).then(syncSessionProjection).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message?.type === 'showNotification') {
    showNotification(message.message).then(
      (notificationId) => sendResponse({ success: true, notificationId }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  if (message?.type === 'arrow:sync-status') {
    (async () => {
      try {
        const [usedBytes, status] = await Promise.all([
          syncStorageCall('getBytesInUse', null),
          chrome.storage.session.get(SYNC_STATUS_ERROR_KEY)
        ]);
        sendResponse({ success: true, usedBytes, error: status[SYNC_STATUS_ERROR_KEY] || '' });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  return false;
});
