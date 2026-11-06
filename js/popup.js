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
let sessionState = {};
let sessionTick;
let pendingSessionMinutes = 0;
let sessionTrigger = null;
let initialDailySessionMinutes = 30;
let pendingDailySessionMinutes = null;
let isTurningArrowOn = false;

function setHomePowerState(enabled) {
  if (isTurningArrowOn && enabled) return;
  const offHome = document.getElementById('arrow-off-home');
  const life = document.getElementById('session-life');
  if (!offHome || !life) return;
  offHome.removeAttribute('data-closing');
  life.removeAttribute('data-entering');
  offHome.hidden = enabled;
  life.hidden = !enabled;
}

function showHomeLifeWithEntry(life) {
  life.hidden = false;
  life.setAttribute('data-entering', '');
  requestAnimationFrame(() => requestAnimationFrame(() => life.removeAttribute('data-entering')));
}

function waitForHomeExit(element) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      element.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    const onTransitionEnd = (event) => {
      if (event.target === element && event.propertyName === 'opacity') finish();
    };
    element.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(finish, 620);
  });
}

async function turnArrowOn() {
  if (isTurningArrowOn) return;
  const offHome = document.getElementById('arrow-off-home');
  const life = document.getElementById('session-life');
  const button = document.getElementById('turn-on-arrow-btn');
  if (!offHome || !life || !button) return;

  isTurningArrowOn = true;
  button.disabled = true;
  showHomeLifeWithEntry(life);
  offHome.setAttribute('data-closing', '');
  try {
    await Promise.all([ArrowState.commit({ ArrowOn: true }), waitForHomeExit(offHome)]);
    arrowOn = true;
    offHome.hidden = true;
    offHome.removeAttribute('data-closing');
    await loadSettings();
  } catch (error) {
    life.removeAttribute('data-entering');
    life.hidden = true;
    offHome.removeAttribute('data-closing');
    offHome.hidden = false;
    document.getElementById('session-error').textContent = error.message;
    document.getElementById('session-error').hidden = false;
  } finally {
    isTurningArrowOn = false;
    button.disabled = false;
  }
}
function closeSessionConfirm() {
  document.getElementById('session-confirm-overlay').hidden = true;
  pendingSessionMinutes = 0;
  sessionTrigger?.focus();
  sessionTrigger = null;
}
function sessionDay(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function pixelHeart(fillFraction) {
  const heart = document.createElement('span');
  heart.className = 'pixel-heart';
  heart.setAttribute('aria-hidden', 'true');
  heart.style.setProperty('--heart-fill', `${fillFraction * 100}%`);
  const fill = document.createElement('span');
  fill.className = 'pixel-heart-fill';
  heart.append(fill);
  return heart;
}
function renderSession() {
  const now = Date.now();
  const budget = [15, 30, 45, 60].includes(sessionState.arrow_daily_session_minutes) ? sessionState.arrow_daily_session_minutes : 30;
  const sameDay = sessionState.arrow_session_day === sessionDay(now);
  const used = sameDay ? Math.min(budget, Number(sessionState.arrow_session_used_minutes) || 0) : 0;
  const remaining = Math.max(0, budget - used);
  const end = sameDay ? Number(sessionState.arrow_session_end_at) || 0 : 0;
  const active = end > now;
  document.getElementById('session-minutes').textContent = `${remaining} min remaining`;
  const hearts = document.getElementById('session-hearts');
  hearts.setAttribute('aria-label', `${remaining} of ${budget} minutes remaining`);
  const heartSignature = `${budget}:${remaining}`;
  if (hearts.dataset.signature !== heartSignature) {
    hearts.replaceChildren();
    const minutesPerHeart = budget / 7;
    for (let i = 0; i < 7; i++) {
      hearts.append(pixelHeart(Math.max(0, Math.min(1, (remaining - i * minutesPerHeart) / minutesPerHeart))));
    }
    hearts.dataset.signature = heartSignature;
  }
  document.getElementById('session-choices').hidden = active || remaining === 0;
  document.getElementById('session-active').hidden = !active;
  document.getElementById('session-empty').hidden = active || remaining > 0;
  document.querySelectorAll('[data-session-minutes]').forEach(button => {
    button.disabled = Number(button.dataset.sessionMinutes) > remaining;
  });
  if (active) {
    const seconds = Math.ceil((end - now) / 1000);
    document.getElementById('session-clock').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const duration = Number(sessionState.arrow_session_duration_minutes) || 15;
    document.getElementById('session-ring').style.setProperty('--progress', `${Math.max(0, Math.min(100, (end - now) / (duration * 60000) * 100))}%`);
  }
}
async function refreshSession() {
  sessionState = await chrome.storage.local.get(['arrow_daily_session_minutes', 'arrow_session_day', 'arrow_session_used_minutes', 'arrow_session_end_at', 'arrow_session_duration_minutes']);
  const savedBudget = sessionState.arrow_daily_session_minutes || 30;
  if (pendingDailySessionMinutes === null) initialDailySessionMinutes = savedBudget;
  document.getElementById('session-budget').value = String(pendingDailySessionMinutes ?? savedBudget);
  renderSession();
}

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
  arrowOn = !!settings.ArrowOn;
  setHomePowerState(arrowOn);
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
  ["home", "preferences", "settings"].forEach((tab) => {
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
  setHomePowerState(arrowOn);
  const selectedModeControl = document.querySelector(`input[name="settings-mode"][value="${initialMode}"]`);
  if (selectedModeControl) selectedModeControl.checked = true;
  document.getElementById("edit-custom-btn").hidden = initialMode !== "custom";
  markActiveMode(initialMode);
  pendingDailySessionMinutes = null;
  setPending(false);
}

function stageChange() {
  const selected = document.querySelector('input[name="settings-mode"]:checked')?.value || "custom";
  const valuesChanged = Object.keys(SETTINGS).some((id) => document.getElementById(id)?.checked !== initialValues[id]);
  const dailyBudgetChanged = pendingDailySessionMinutes !== null && pendingDailySessionMinutes !== initialDailySessionMinutes;
  setPending(selected !== initialMode || valuesChanged || dailyBudgetChanged);
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
  const dailyBudgetPatch = pendingDailySessionMinutes === null ? {} : { arrow_daily_session_minutes: pendingDailySessionMinutes };
  const isProtected = selected === "custom" || initialMode === "custom" || selected === "off" || pendingDailySessionMinutes > initialDailySessionMinutes;
  const featurePatch = selected === "custom" ? values : { ...MODE_PRESETS[selected] };
  const patch = { ...featurePatch, ...dailyBudgetPatch, ...createModeMetadata(selected, { ...values, ...featurePatch }) };

  if (isProtected) {
    await chrome.storage.local.set({ arrow_pending_settings: { ...featurePatch, ...dailyBudgetPatch }, arrow_pending_mode: selected });
    sessionStorage.setItem("arrow_prev_page", `popup.html#settings:${activeSettingsView}`);
    document.getElementById("login-overlay").hidden = false;
    return;
  }

  await ArrowState.commit(patch);
  await loadSettings();
  await refreshSession();
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

  document.getElementById("open-preferences-btn")?.addEventListener("click", () => showTab("preferences"));
  document.getElementById('turn-on-arrow-btn')?.addEventListener('click', turnArrowOn);
  document.getElementById("back-from-preferences-btn")?.addEventListener("click", () => showTab("home"));
  document.getElementById("home-mode-row")?.addEventListener("click", () => showTab("settings"));
  document.getElementById("back-from-settings-btn")?.addEventListener("click", () => showTab("preferences"));
  document.getElementById('session-budget').addEventListener('change', async (event) => {
    const requestedBudget = Number(event.target.value);
    if (requestedBudget > initialDailySessionMinutes) {
      pendingDailySessionMinutes = requestedBudget;
      stageChange();
      return;
    }

    pendingDailySessionMinutes = null;
    try {
      await ArrowState.commit({ arrow_daily_session_minutes: requestedBudget });
      await refreshSession();
      stageChange();
    } catch (error) {
      document.getElementById('session-error').textContent = error.message;
      document.getElementById('session-error').hidden = false;
      await refreshSession();
    }
  });
  document.querySelectorAll('[data-session-minutes]').forEach(button => button.addEventListener('click', () => {
    pendingSessionMinutes = Number(button.dataset.sessionMinutes);
    sessionTrigger = button;
    document.getElementById('session-confirm-description').textContent = `Use a ${pendingSessionMinutes}-minute pass? All ${pendingSessionMinutes} minutes will be deducted immediately.`;
    document.getElementById('session-confirm-overlay').hidden = false;
    document.getElementById('session-confirm-cancel').focus();
  }));
  document.getElementById('session-confirm-cancel').addEventListener('click', closeSessionConfirm);
  document.getElementById('session-confirm-overlay').addEventListener('click', event => {
    if (event.target.id === 'session-confirm-overlay') closeSessionConfirm();
  });
  document.addEventListener('keydown', event => {
    if (document.getElementById('session-confirm-overlay').hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSessionConfirm(); }
    if (event.key === 'Tab') {
      const cancel = document.getElementById('session-confirm-cancel');
      const start = document.getElementById('session-confirm-start');
      if (event.shiftKey && document.activeElement === cancel) { event.preventDefault(); start.focus(); }
      else if (!event.shiftKey && document.activeElement === start) { event.preventDefault(); cancel.focus(); }
    }
  });
  document.getElementById('session-confirm-start').addEventListener('click', async () => {
    const minutes = pendingSessionMinutes;
    const start = document.getElementById('session-confirm-start');
    if (!minutes || start.disabled) return;
    start.disabled = true;
    try {
      await ArrowState.startSession(minutes);
      closeSessionConfirm();
      await refreshSession();
    } catch (error) {
      document.getElementById('session-error').textContent = error.message;
      document.getElementById('session-error').hidden = false;
      closeSessionConfirm();
      await refreshSession();
    } finally { start.disabled = false; }
  });
  document.getElementById('session-skip').addEventListener('click', async () => {
    try { await ArrowState.skipSession(); await refreshSession(); }
    catch (error) { document.getElementById('session-error').textContent = error.message; document.getElementById('session-error').hidden = false; }
  });
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
  document.getElementById("cancel-changes-btn")?.addEventListener("click", async () => {
    await loadSettings();
    await refreshSession();
  });
  document.getElementById("save-settings-btn")?.addEventListener("click", saveSettings);

  window.ArrowLoginHost = {
    close: () => { document.getElementById("login-overlay").hidden = true; },
    success: async () => { document.getElementById("login-overlay").hidden = true; await loadSettings(); showTab("home"); }
  };
  await loadSettings();
  await refreshSession();
  sessionTick = setInterval(renderSession, 250);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const modeKeys = ["ArrowOn", ...Object.values(SETTINGS), MODE_KEYS.mode];
    if (modeKeys.some((key) => key in changes)) refreshHomeMode().catch(console.error);
    if (Object.keys(changes).some(key => key.startsWith('arrow_session_') || key === 'arrow_daily_session_minutes')) refreshSession().catch(console.error);
  });
  if (window.location.hash.startsWith("#settings")) showTab("settings");
  document.body.setAttribute("data-loaded", "true");
});
