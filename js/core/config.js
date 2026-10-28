"use strict";

// Shared domain rules. This file deliberately has no DOM or Chrome API calls so
// it can be loaded by the service worker, extension pages, and content scripts.
globalThis.ArrowConfig = (() => {
  const SETTINGS_KEYS = Object.freeze([
    'ArrowOn',
    'redirect_home',
    'hide_shorts',
    'minimal_homepage',
    'enable_website_blocking',
    'hide_sidebar_recommendations'
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
      minimal_homepage: false, enable_website_blocking: false,
      hide_sidebar_recommendations: false
    }),
    minimal: Object.freeze({
      ArrowOn: true, redirect_home: false, hide_shorts: true,
      minimal_homepage: true, enable_website_blocking: true,
      hide_sidebar_recommendations: true
    }),
    'high-focus': Object.freeze({
      ArrowOn: true, redirect_home: false, hide_shorts: true,
      minimal_homepage: true, enable_website_blocking: true,
      hide_sidebar_recommendations: true
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

  function normalizeBlockTarget(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      return `${url.hostname.replace(/^www\./i, '').toLowerCase()}${url.pathname.replace(/\/$/, '')}${url.search}${url.hash}`;
    } catch {
      return '';
    }
  }

  return Object.freeze({
    SETTINGS_KEYS, MODE_KEYS, MODE_PRESETS, VALID_MODES,
    snapshot, detectMode, normalizeMode, createModeMetadata, normalizeBlockTarget
  });
})();
