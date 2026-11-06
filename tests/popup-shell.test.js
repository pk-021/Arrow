"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("action popup uses a stable intrinsic size, not its own viewport", () => {
  const css = read("css/popup.css");
  const body = css.match(/body\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.ok(body, "popup stylesheet must define body dimensions");
  assert.match(body, /height:\s*600px\s*;/);
  assert.match(body, /width:\s*420px\s*;/);
  assert.doesNotMatch(body, /(?:width|height)\s*:\s*[^;]*(?:\bvw\b|\bvh\b)/i,
    "the action popup must not derive intrinsic dimensions from its own viewport");
});

test("later popup styles keep a definite body width during initial sizing", () => {
  const css = read("css/visual-system.css");
  const popupBodyRules = [...css.matchAll(/body:has\(#popup\)\s*\{([^}]*)\}/g)];

  assert.equal(popupBodyRules.length, 1,
    "popup body width must not change inside viewport media queries");
  assert.match(popupBodyRules[0][1], /width:\s*420px\s*;/);
  assert.doesNotMatch(popupBodyRules[0][1], /width:\s*[^;]*(?:%|vw|vh)/i);
});

test("popup loads shared dependencies before the popup controller", () => {
  const html = read("popup.html");
  const config = html.indexOf('src="js/core/config.js"');
  const state = html.indexOf('src="js/core/state.js"');
  const popup = html.indexOf('src="js/popup.js"');

  assert.ok(config >= 0, "popup must load ArrowConfig");
  assert.ok(state > config, "popup state client must load after ArrowConfig");
  assert.ok(popup > state, "popup controller must load after its shared dependencies");
});

test("manifest declares the expected action popup", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action?.default_popup, "popup.html");
});

test("popup reserves its footer and protects daily allowance increases", () => {
  const css = read("css/popup.css");
  const visualSystem = read("css/visual-system.css");
  const popup = read("js/popup.js");

  assert.match(css, /\.popup-footer\s*\{[\s\S]*?min-height:\s*64px\s*;/);
  assert.doesNotMatch(visualSystem, /\.popup-footer\[hidden\]/,
    "the footer must remain rendered when it has no pending actions");
  assert.doesNotMatch(popup, /footer\.hidden\s*=/,
    "idle state must not hide the footer");
  assert.match(popup, /requestedBudget\s*>\s*initialDailySessionMinutes/);
  assert.match(popup, /pendingDailySessionMinutes\s*>\s*initialDailySessionMinutes/);
});

test("off-state Home provides an animated durable activation path", () => {
  const html = read("popup.html");
  const popup = read("js/popup.js");
  const css = read("css/visual-system.css");

  assert.match(html, /id="arrow-off-home"/);
  assert.match(html, /id="turn-on-arrow-btn"/);
  assert.match(popup, /ArrowState\.commit\(\{ ArrowOn: true \}\)/);
  assert.match(popup, /data-closing/);
  assert.match(popup, /data-entering/);
  assert.match(html, /class="home-body-layer"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("login clears sensitive fields after successful submission or dismissal", () => {
  const login = read("js/login.js");

  assert.match(login, /function clearPasswordFields\(\)/);
  assert.match(login, /clearPasswordFields\(\);/);
});

test("password verification awaits its commit without chaining from callback storage access", () => {
  const login = read("js/login.js");

  assert.doesNotMatch(login, /ArrowState\.commit\(toSet\)\.then/);
  assert.match(login, /await ArrowState\.commit\(toSet\)/);
});

test("website blocking is absent from extension surfaces and APIs", () => {
  const popup = read("popup.html");
  const config = read("js/core/config.js");
  const state = read("js/core/state.js");
  const background = read("js/background.js");

  assert.doesNotMatch(popup, /blocked websites|website blocking|add block/i);
  assert.doesNotMatch(config, /enable_website_blocking|blockedWebsites|normalizeBlockTarget/);
  assert.doesNotMatch(state, /arrow:block|BlockedWebsite/);
  assert.doesNotMatch(background, /arrow:block|addBlocked|buildBlocked|applyBlocked/);
  assert.equal(fs.existsSync(path.join(root, "add-block.html")), false);
  assert.equal(fs.existsSync(path.join(root, "js", "add-block.js")), false);
});

test("persisted mode remains authoritative and validates its settings", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { readMode, resolveMode } = context.globalThis.ArrowConfig;
  const minimalSettings = {
    ArrowOn: true,
    redirect_home: false,
    hide_shorts: true,
    minimal_homepage: true,
    hide_sidebar_recommendations: true,
    hide_sidebar_recommended: true,
    hide_sidebar_live_chat: true,
    hide_sidebar_playlist: true,
    hide_sidebar_fundraiser: true,
    hide_comments: false
  };

  const highFocusSettings = { ...minimalSettings, redirect_home: true, hide_comments: true };
  assert.equal(readMode({ ...highFocusSettings, arrow_mode: "high-focus" }), "high-focus");
  assert.equal(readMode({ ...minimalSettings, arrow_mode: "not-a-mode" }), "minimal");
  assert.equal(resolveMode(
    { ...highFocusSettings, arrow_mode: "high-focus" },
    highFocusSettings,
    undefined
  ), "high-focus");
});

test("an off cycle restores the canonical mode and settings that preceded it", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { MODE_KEYS, readOffResumeState } = context.globalThis.ArrowConfig;
  const minimalSettings = {
    ArrowOn: true,
    redirect_home: false,
    hide_shorts: true,
    minimal_homepage: true,
    hide_sidebar_recommendations: true,
    hide_sidebar_recommended: true,
    hide_sidebar_live_chat: true,
    hide_sidebar_playlist: true,
    hide_sidebar_fundraiser: true,
    hide_comments: false
  };

  const resume = readOffResumeState({
    [MODE_KEYS.resume]: { mode: "minimal", settings: minimalSettings }
  });
  assert.equal(resume.mode, "minimal");
  assert.deepEqual({ ...resume.settings }, minimalSettings);
});

test("comment visibility defaults are mode-specific", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { MODE_PRESETS } = context.globalThis.ArrowConfig;

  assert.equal(MODE_PRESETS.minimal.hide_comments, false);
  assert.equal(MODE_PRESETS["high-focus"].hide_comments, true);
  assert.equal(MODE_PRESETS.off.hide_comments, false);
});

test("high focus enables every feature setting", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { MODE_PRESETS, SETTINGS_KEYS } = context.globalThis.ArrowConfig;

  for (const key of SETTINGS_KEYS) {
    assert.equal(MODE_PRESETS["high-focus"][key], true, `${key} must be enabled in High Focus`);
  }
});

test("sidebar controls are visible while content projects the master attribute", () => {
  const html = read("popup.html");
  const content = read("js/content.js");
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { MODE_PRESETS, SIDEBAR_CHILD_KEYS } = context.globalThis.ArrowConfig;

  assert.match(html, /<label for="hide-sidebar-recommendations">Hide sidebar<\/label>/);
  for (const key of SIDEBAR_CHILD_KEYS) {
    assert.match(html, new RegExp(`id="${key.replaceAll('_', '-')}"`));
    assert.equal(MODE_PRESETS.minimal[key], true);
    assert.equal(MODE_PRESETS["high-focus"][key], true);
    assert.equal(MODE_PRESETS.off[key], false);
  }
  assert.match(content, /"hide_sidebar_recommendations", "hide_comments"/);
  assert.match(content, /sidebarChildAttributeKeys\.forEach\(key => document\.documentElement\.removeAttribute\(key\)\)/);
});

test("content script exposes live chat availability as a root attribute", () => {
  const content = read("js/content.js");

  assert.match(content, /function updateChatExists\(\)/);
  assert.match(content, /document\.querySelector\("ytd-live-chat-frame"\)/);
  assert.match(content, /!chatFrame\.hasAttribute\("hide-chat-frame"\)/);
  assert.match(content, /!chatFrame\.hasAttribute\("collapsed"\)/);
  assert.match(content, /setAttribute\("chat_exists", String\(chatExists\)\)/);
  assert.match(content, /attributeFilter: \["hide-chat-frame", "collapsed"\]/);
});

test("content script derives playlist state from the visible playlist panel", () => {
  const content = read("js/content.js");

  assert.match(content, /document\.querySelector\("ytd-playlist-panel-renderer#playlist"\)/);
  assert.match(content, /!!playlistPanel && !playlistPanel\.hasAttribute\("hidden"\)/);
  assert.match(content, /setAttribute\("has_playlist", hasPlaylist\)/);
  assert.doesNotMatch(content, /setAttribute\("is_playlist"/);
  assert.match(content, /\/\*[\s\S]*?\[\?&\]list=[\s\S]*?\*\//);
});
