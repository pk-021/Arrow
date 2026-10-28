"use strict";

importScripts('core/config.js');

const { MODE_KEYS, MODE_PRESETS, SETTINGS_KEYS, snapshot, detectMode, resolveMode } = ArrowConfig;
const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
const YOUTUBE_HOME_URL = 'https://www.youtube.com/';
const LEGACY_BLOCK_RULE_BASE_ID = 1000;
const STATE_REVISION_KEY = 'arrow_state_revision';
const PENDING_TRANSACTION_KEY = 'arrow_pending_transaction';
let commitQueue = Promise.resolve();

function enqueueCommit(work) {
  const next = commitQueue.then(work, work);
  commitQueue = next.catch(() => undefined);
  return next;
}

function isSettingsPatch(patch) {
  return SETTINGS_KEYS.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
}

function prepareStatePatch(current, patch) {
  const next = { ...current, ...patch };
  if (!isSettingsPatch(patch) && !Object.prototype.hasOwnProperty.call(patch, MODE_KEYS.mode)) return patch;
  const settings = snapshot(next, true);
  const mode = resolveMode(current, settings, patch[MODE_KEYS.mode]);
  return {
    ...patch,
    [MODE_KEYS.mode]: mode,
    [MODE_KEYS.snapshot]: settings,
    [MODE_KEYS.updatedAt]: Date.now(),
    ...(mode === 'custom' ? { [MODE_KEYS.customSettings]: settings } : {})
  };
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

async function commitPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings change.');
  return enqueueCommit(async () => {
    const current = await chrome.storage.local.get(null);
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
  return initializeSettings().then(removeLegacyBlockRules);
}

chrome.runtime.onStartup.addListener(() => initializeAndReconcile().catch(console.error));
chrome.runtime.onInstalled.addListener(() => initializeAndReconcile().catch(console.error));
initializeAndReconcile().catch((error) => console.warn('[Startup] Settings initialization failed:', error));
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'arrow:commit') {
    commitPatch(message.patch).then(
      ({ revision }) => sendResponse({ success: true, revision }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  if (message?.type === 'toggleRedirects') {
    setRedirectRules('home', !!message.enabled).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message?.type === 'toggleShorts') {
    setRedirectRules(
      'shorts',
      !!message.enabled,
      message.redirectToSubscriptions ? SUBSCRIPTIONS_URL : YOUTUBE_HOME_URL
    ).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message?.type === 'showNotification') {
    showNotification(message.message).then(
      (notificationId) => sendResponse({ success: true, notificationId }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  return false;
});
