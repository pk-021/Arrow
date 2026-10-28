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
  assert.match(body, /height:\s*560px\s*;/);
  assert.match(body, /width:\s*380px\s*;/);
  assert.doesNotMatch(body, /(?:width|height)\s*:\s*[^;]*(?:\bvw\b|\bvh\b)/i,
    "the action popup must not derive intrinsic dimensions from its own viewport");
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
    hide_comments: false
  };

  const highFocusSettings = { ...minimalSettings, hide_comments: true };
  assert.equal(readMode({ ...highFocusSettings, arrow_mode: "high-focus" }), "high-focus");
  assert.equal(readMode({ ...minimalSettings, arrow_mode: "not-a-mode" }), "minimal");
  assert.equal(resolveMode(
    { ...highFocusSettings, arrow_mode: "high-focus" },
    highFocusSettings,
    undefined
  ), "high-focus");
});

test("comment visibility defaults are mode-specific", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(read("js/core/config.js"), context);
  const { MODE_PRESETS } = context.globalThis.ArrowConfig;

  assert.equal(MODE_PRESETS.minimal.hide_comments, false);
  assert.equal(MODE_PRESETS["high-focus"].hide_comments, true);
  assert.equal(MODE_PRESETS.off.hide_comments, false);
});
