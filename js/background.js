"use strict";

importScripts('core/config.js');

const { MODE_KEYS, MODE_PRESETS, VALID_MODES, snapshot, detectMode } = ArrowConfig;
const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
const BLOCK_RULE_BASE_ID = 1000;
const BLOCK_RULE_RESOURCE_TYPES = ['sub_frame', 'xmlhttprequest', 'script', 'other'];

const redirectRules = {
  home: [
    { id: 1, condition: { urlFilter: 'youtube.com/feed/trending', resourceTypes: ['main_frame'] } },
    { id: 2, condition: { urlFilter: 'youtube.com/shorts', resourceTypes: ['main_frame'] } },
    { id: 3, condition: { regexFilter: '^https://(www\\.)?youtube\\.com/?$', resourceTypes: ['main_frame'] } }
  ],
  shorts: [{ id: 4, condition: { urlFilter: 'youtube.com/shorts', resourceTypes: ['main_frame'] } }]
};

function withSubscriptionsRedirect(rule) {
  return { ...rule, priority: 1, action: { type: 'redirect', redirect: { url: SUBSCRIPTIONS_URL } } };
}

async function replaceRules(rules, ids) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules.map(withSubscriptionsRedirect), removeRuleIds: ids
    });
  } catch (error) {
    console.error('[DNR] Failed to update redirect rules:', error);
  }
}

function setRedirectRules(kind, enabled) {
  const rules = redirectRules[kind];
  return replaceRules(enabled ? rules : [], rules.map(({ id }) => id));
}

function toBlockFilter(url) {
  const value = ArrowConfig.normalizeBlockTarget(url)
    || String(url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return value ? `||${value}` : null;
}

function buildBlockedWebsiteRules(blockedWebsites) {
  let id = BLOCK_RULE_BASE_ID;
  return (blockedWebsites || []).flatMap(({ url } = {}) => {
    const urlFilter = toBlockFilter(url);
    if (!urlFilter) return [];
    const action = { type: 'redirect', redirect: { url: 'https://www.google.com/' } };
    return [
      { id: id++, priority: 1, action, condition: { urlFilter, resourceTypes: ['main_frame'] } },
      { id: id++, priority: 2, action, condition: { urlFilter, resourceTypes: BLOCK_RULE_RESOURCE_TYPES } }
    ];
  });
}

let pendingBlockList = null;
let applyingBlockRules = false;

async function applyBlockedWebsiteRules(blockedWebsites) {
  pendingBlockList = Array.isArray(blockedWebsites) ? blockedWebsites : [];
  if (applyingBlockRules) return;
  applyingBlockRules = true;
  try {
    while (pendingBlockList) {
      const list = pendingBlockList;
      pendingBlockList = null;
      const [{ enable_website_blocking: enabled }, currentRules] = await Promise.all([
        chrome.storage.local.get('enable_website_blocking'), chrome.declarativeNetRequest.getDynamicRules()
      ]);
      const existingIds = currentRules.filter(({ id }) => id >= BLOCK_RULE_BASE_ID).map(({ id }) => id);
      const rules = enabled === false ? [] : buildBlockedWebsiteRules(list);
      if (existingIds.length || rules.length) {
        await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules, removeRuleIds: existingIds });
      }
      await chrome.storage.local.set({ arrow_block_rule_ids: rules.map(({ id }) => id) });
    }
  } catch (error) {
    console.error('[Blocks] Failed to update blocked-site rules:', error);
  } finally {
    applyingBlockRules = false;
    if (pendingBlockList) applyBlockedWebsiteRules(pendingBlockList);
  }
}

async function initializeSettings() {
  const existing = await chrome.storage.local.get(null);
  const { enable_channel_blocking, ...saved } = existing || {};
  const merged = { ...MODE_PRESETS.minimal, ...saved };
  const currentSnapshot = snapshot(merged, true);
  merged[MODE_KEYS.mode] = VALID_MODES.has(merged[MODE_KEYS.mode]) ? merged[MODE_KEYS.mode] : detectMode(currentSnapshot);
  merged[MODE_KEYS.snapshot] = currentSnapshot;
  merged[MODE_KEYS.updatedAt] ||= Date.now();
  await chrome.storage.local.set(merged);
}

function showNotification(message) {
  return chrome.notifications.create('', {
    type: 'basic', iconUrl: chrome.runtime.getURL('assets/logo_v2.png'),
    title: 'Arrow', message: String(message || ''), priority: 2
  });
}

chrome.runtime.onStartup.addListener(() => initializeSettings().catch(console.error));
chrome.runtime.onInstalled.addListener(() => initializeSettings().catch(console.error));
initializeSettings().catch((error) => console.warn('[Startup] Settings initialization failed:', error));

chrome.storage.local.get('blockedWebsites').then(({ blockedWebsites }) => applyBlockedWebsiteRules(blockedWebsites));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || (!changes.blockedWebsites && !changes.enable_website_blocking)) return;
  if (changes.blockedWebsites) return applyBlockedWebsiteRules(changes.blockedWebsites.newValue);
  chrome.storage.local.get('blockedWebsites').then(({ blockedWebsites }) => applyBlockedWebsiteRules(blockedWebsites));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'toggleRedirects') {
    setRedirectRules('home', !!message.enabled).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message?.type === 'toggleShorts') {
    setRedirectRules('shorts', !!message.enabled).then(() => sendResponse({ success: true }));
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
