"use strict";

// Shared domain rules. This file deliberately has no DOM or Chrome API calls so
// it can be loaded by the service worker, extension pages, and content scripts.
globalThis.ArrowConfig = (() => {
  const SETTINGS_KEYS = Object.freeze([
    'ArrowOn',
    'redirect_home',
    'hide_shorts',
    'minimal_homepage',
    'hide_sidebar_recommendations',
    'hide_comments'
  ]);

  const MODE_KEYS = Object.freeze({
    mode: 'arrow_mode',
    snapshot: 'arrow_mode_settings_snapshot',
    updatedAt: 'arrow_mode_updated_at',
    customSettings: 'arrow_custom_settings'
  });

  // Keep the current product behaviour: Minimal and High Focus have the same
  // settings, but remain distinct choices in the UI and persisted metadata.
  const MODE_PRESETS = Object.freeze({
    off: Object.freeze({
      ArrowOn: false, redirect_home: false, hide_shorts: false,
      minimal_homepage: false, hide_sidebar_recommendations: false,
      hide_comments: false
    }),
    minimal: Object.freeze({
      ArrowOn: true, redirect_home: false, hide_shorts: true,
      minimal_homepage: true, hide_sidebar_recommendations: true,
      hide_comments: false
    }),
    'high-focus': Object.freeze({
      ArrowOn: true, redirect_home: false, hide_shorts: true,
      minimal_homepage: true, hide_sidebar_recommendations: true,
      hide_comments: true
    })
  });

  const VALID_MODES = new Set([...Object.keys(MODE_PRESETS), 'custom']);

  function snapshot(settings, includeMissing = false) {
    return SETTINGS_KEYS.reduce((result, key) => {
      if (includeMissing || key in settings) result[key] = !!settings[key];
      return result;
    }, {});
  }

  function detectMode(settings) {
    for (const [name, preset] of Object.entries(MODE_PRESETS)) {
      if (Object.keys(preset).every((key) => settings[key] === preset[key])) return name;
    }
    return 'custom';
  }

  function readMode(settings) {
    const persisted = settings?.[MODE_KEYS.mode];
    return VALID_MODES.has(persisted) ? persisted : detectMode(settings || {});
  }

  function resolveMode(currentSettings, nextSettings, requestedMode) {
    if (VALID_MODES.has(requestedMode)) return requestedMode;
    const persisted = readMode(currentSettings);
    const persistedPreset = MODE_PRESETS[persisted];
    if (persistedPreset && Object.entries(persistedPreset).every(([key, value]) => nextSettings[key] === value)) {
      return persisted;
    }
    return detectMode(nextSettings);
  }

  function normalizeMode(mode, fallback = 'minimal') {
    return VALID_MODES.has(mode) ? mode : fallback;
  }

  function createModeMetadata(mode, settings) {
    return {
      [MODE_KEYS.mode]: normalizeMode(mode, 'custom'),
      [MODE_KEYS.snapshot]: snapshot(settings, true),
      [MODE_KEYS.updatedAt]: Date.now()
    };
  }

  return Object.freeze({
    SETTINGS_KEYS, MODE_KEYS, MODE_PRESETS, VALID_MODES,
    snapshot, detectMode, readMode, resolveMode, normalizeMode, createModeMetadata
  });
})();
