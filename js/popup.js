"use strict";

const SETTINGS = {
  "redirect-subscriptions": "redirect_home",
  "disable-shorts": "hide_shorts",
  "minimal-homepage": "minimal_homepage",
  "hide-sidebar-recommendations": "hide_sidebar_recommendations",
  "hide-comments": "hide_comments"
};
const { MODE_KEYS, MODE_PRESETS, readMode, createModeMetadata } = ArrowConfig;
let initialValues = {};
let initialMode = "minimal";
let activeTab = "home";
let activeSettingsView = "modes";
let hasPendingSettings = false;
let arrowOn = true;

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.toggleAttribute("dark_mode", dark);
}

function setPending(pending) {
  hasPendingSettings = pending;
  const footer = document.querySelector(".popup-footer");
  const save = document.getElementById("save-settings-btn");
  const cancel = document.getElementById("cancel-changes-btn");
  footer?.classList.toggle("has-pending", pending);
  if (footer) footer.hidden = !pending;
  if (save) { save.disabled = !pending; save.classList.toggle("is-hidden", !pending); }
  if (cancel) cancel.disabled = !pending;
}

function formatMode(mode) {
  return String(mode).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function updateHomeMode(settings) {
  const mode = readMode(settings);
  const label = document.getElementById("home-mode-value");
  if (label) label.textContent = formatMode(mode);
  return mode;
}

async function refreshHomeMode() {
  const settings = await chrome.storage.local.get(["ArrowOn", ...Object.values(SETTINGS), MODE_KEYS.mode]);
  return updateHomeMode(settings);
}

function currentSettings() {
  return {
    ArrowOn: arrowOn,
    ...Object.fromEntries(Object.entries(SETTINGS).map(([id, key]) => [key, !!document.getElementById(id)?.checked]))
  };
}

function markActiveMode(mode) {
  document.querySelectorAll(".mode-option").forEach((option) => option.classList.toggle(
    "mode-active", option.querySelector(`input[value="${mode}"]`) !== null
  ));
}

function showTab(name) {
  ["home", "settings"].forEach((tab) => {
    const view = document.getElementById(`tab-${tab}`);
    if (!view) return;
    const visible = tab === name;
    view.hidden = !visible;
    view.classList.toggle("active", visible);
  });
  activeTab = name;
}

function showSettingsView(name) {
  activeSettingsView = name;
  const modes = document.querySelector(".settings-mode-view");
  const custom = document.querySelector(".settings-custom-view");
  if (modes) modes.hidden = name !== "modes";
  if (custom) custom.hidden = name !== "custom";
}

async function loadSettings() {
  const result = await chrome.storage.local.get(["ArrowOn", ...Object.values(SETTINGS), MODE_KEYS.mode]);
  arrowOn = !!result.ArrowOn;
  initialValues = {};
  Object.entries(SETTINGS).forEach(([id, key]) => {
    const value = !!result[key];
    const control = document.getElementById(id);
    if (control) control.checked = value;
    initialValues[id] = value;
  });
  initialMode = updateHomeMode(result);
  const selectedModeControl = document.querySelector(`input[name="settings-mode"][value="${initialMode}"]`);
  if (selectedModeControl) selectedModeControl.checked = true;
  document.getElementById("edit-custom-btn").hidden = initialMode !== "custom";
  markActiveMode(initialMode);
  setPending(false);
}

function stageChange() {
  const selected = document.querySelector('input[name="settings-mode"]:checked')?.value || "custom";
  const valuesChanged = Object.keys(SETTINGS).some((id) => document.getElementById(id)?.checked !== initialValues[id]);
  setPending(selected !== initialMode || valuesChanged);
}

function applyPreset(mode) {
  if (mode === "custom") return;
  const preset = MODE_PRESETS[mode] || {};
  arrowOn = !!preset.ArrowOn;
  Object.entries(preset).forEach(([key, value]) => {
    const id = Object.entries(SETTINGS).find(([, setting]) => setting === key)?.[0];
    if (id && document.getElementById(id)) document.getElementById(id).checked = value;
  });
}

async function saveSettings() {
  if (!hasPendingSettings) return;
  const selected = document.querySelector('input[name="settings-mode"]:checked')?.value || "custom";
  const values = currentSettings();
  const isProtected = selected === "custom" || initialMode === "custom" || selected === "off";
  const featurePatch = selected === "custom" ? values : { ...MODE_PRESETS[selected] };
  const patch = { ...featurePatch, ...createModeMetadata(selected, { ...values, ...featurePatch }) };

  if (isProtected) {
    await chrome.storage.local.set({ arrow_pending_settings: featurePatch, arrow_pending_mode: selected });
    sessionStorage.setItem("arrow_prev_page", `popup.html#settings:${activeSettingsView}`);
    document.getElementById("login-overlay").hidden = false;
    return;
  }

  await ArrowState.commit(patch);
  await loadSettings();
  showTab("home");
  chrome.runtime.sendMessage({ type: "showNotification", message: "Changes saved successfully!" });
}

window.addEventListener("DOMContentLoaded", async () => {
  const theme = document.getElementById("themeSelector");
  const storedTheme = await chrome.storage.local.get("themeSetting");
  theme.value = storedTheme.themeSetting || "system";
  applyTheme(theme.value);
  theme.addEventListener("change", async () => {
    applyTheme(theme.value);
    await ArrowState.commit({ themeSetting: theme.value });
  });

  document.getElementById("home-mode-row")?.addEventListener("click", () => showTab("settings"));
  document.getElementById("back-from-settings-btn")?.addEventListener("click", () => showTab("home"));
  document.getElementById("back-to-modes-btn")?.addEventListener("click", () => showSettingsView("modes"));
  document.getElementById("edit-custom-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("custom-mode-radio").checked = true;
    showSettingsView("custom");
    stageChange();
  });
  document.querySelectorAll('input[name="settings-mode"]').forEach((radio) => radio.addEventListener("change", () => {
    const mode = radio.value;
    document.getElementById("edit-custom-btn").hidden = mode !== "custom";
    applyPreset(mode);
    markActiveMode(mode);
    stageChange();
  }));
  Object.keys(SETTINGS).forEach((id) => document.getElementById(id)?.addEventListener("change", () => {
    document.getElementById("custom-mode-radio").checked = true;
    document.getElementById("edit-custom-btn").hidden = false;
    markActiveMode("custom");
    stageChange();
  }));
  document.getElementById("cancel-changes-btn")?.addEventListener("click", loadSettings);
  document.getElementById("save-settings-btn")?.addEventListener("click", saveSettings);

  window.ArrowLoginHost = {
    close: () => { document.getElementById("login-overlay").hidden = true; },
    success: async () => { document.getElementById("login-overlay").hidden = true; await loadSettings(); showTab("home"); }
  };
  await loadSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const modeKeys = ["ArrowOn", ...Object.values(SETTINGS), MODE_KEYS.mode];
    if (modeKeys.some((key) => key in changes)) refreshHomeMode().catch(console.error);
  });
  if (window.location.hash.startsWith("#settings")) showTab("settings");
  document.body.setAttribute("data-loaded", "true");
});
