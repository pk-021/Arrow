"use strict";

(function () {

// --- Containers ---
const loginContainer = document.getElementById("login-container");
const setupContainer = document.getElementById("setup-container");
const resetContainer = document.getElementById("reset-container");

// --- Login elements ---
const input = document.getElementById("password-input");
const button = document.getElementById("submit-password");
const cancelButton = document.getElementById("cancel-login");
const error = document.getElementById("error-message");
const forgotButton = document.getElementById("forgot-password");

// --- Setup elements ---
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const saveButton = document.getElementById("save-password");
const setupError = document.getElementById("setup-error");
const backFromSetupBtn = document.getElementById("back-from-setup-btn");

// --- Custom notification elements ---
const customNotification = document.getElementById("custom-notification");
const notificationMessage = document.getElementById("notification-message");
const notificationCloseButton = document.getElementById("notification-close");
const loginOverlayEl = document.getElementById("login-overlay");

// --- Reset elements ---
const currentWordEl = document.getElementById("current-word");
const resetInput = document.getElementById("reset-input");
const resetNextBtn = document.getElementById("reset-next");
const cancelResetBtn = document.getElementById("cancel-reset");

// --- Reset words ---
const resetWords = [
  "orange",
  "castle",
  "mirror",
  "planet",
  "forest",
  "window",
  "guitar",
  "breeze",
  "pillow",
  "dragon",
];
let currentResetIndex = 0;
// Persist the immediately previous page so all back buttons go there
const URL_FROM_PARAM = new URLSearchParams(window.location.search).get("from");
const IS_EMBEDDED_LOGIN = new URLSearchParams(window.location.search).get('embedded') === '1';
const LOGIN_SESSION = new URLSearchParams(window.location.search).get('session');
const SAVED_PREV_KEY = 'arrow_prev_page';

function notifyParent(type, detail = {}) {
  if (window.ArrowLoginHost && typeof window.ArrowLoginHost[type] === 'function') {
    window.ArrowLoginHost[type](detail);
    return true;
  }

  if (!IS_EMBEDDED_LOGIN || window.parent === window) {
    return false;
  }

  try {
    window.parent.postMessage({
      source: 'arrow-login-overlay',
      type,
      session: LOGIN_SESSION || null,
      detail
    }, window.location.origin);
    return true;
  } catch (e) {
    return false;
  }
}

function savePreviousPage() {
  // Do not overwrite if a caller already saved a prev page (e.g., popup)
  try {
    const existing = sessionStorage.getItem(SAVED_PREV_KEY);
    if (existing) {
      return;
    }
  } catch (e) {
    // ignore
  }
  try {
    let prev = null;
    if (URL_FROM_PARAM === 'popup') {
      prev = 'popup.html';
    } else if (document.referrer) {
      prev = document.referrer;
    } else if (window.opener && window.opener.location && window.opener.location.href) {
      prev = window.opener.location.href;
    } else {
      prev = 'popup.html';
    }

    // Avoid saving the current page as the previous page
    const resolvedPrev = new URL(prev, window.location.href).href;
    if (resolvedPrev !== window.location.href) {
      sessionStorage.setItem(SAVED_PREV_KEY, resolvedPrev);
    } else {
      const fallback = new URL('popup.html', window.location.href).href;
      sessionStorage.setItem(SAVED_PREV_KEY, fallback);
    }
  } catch (e) {
    sessionStorage.setItem(SAVED_PREV_KEY, new URL('popup.html', window.location.href).href);
  }
}

function getSavedPreviousPage() {
  const v = sessionStorage.getItem(SAVED_PREV_KEY) || new URL('popup.html', window.location.href).href;
  return v;
}

const MODE_STORAGE_KEY = ArrowConfig.MODE_KEYS.mode;
const MODE_SETTINGS_SNAPSHOT_KEY = ArrowConfig.MODE_KEYS.snapshot;
const MODE_UPDATED_AT_KEY = ArrowConfig.MODE_KEYS.updatedAt;
const modePresets = ArrowConfig.MODE_PRESETS;
const normalizeMode = ArrowConfig.normalizeMode;
const detectModeFromSettings = ArrowConfig.detectMode;
const pickSettingsSnapshot = ArrowConfig.snapshot;

function safeRuntimeSendMessage(payload) {
  try {
    if (!chrome?.runtime?.id) return;
    chrome.runtime.sendMessage(payload, () => {
      if (chrome.runtime.lastError) {
        console.debug('[runtime] login sendMessage skipped:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.debug('[runtime] login sendMessage exception:', e?.message || e);
  }
}

// --- Helper to show/hide containers ---
function showContainer(container) {
  [loginContainer, setupContainer, resetContainer].forEach((c) =>
    c.classList.add("hidden")
  );
  container.classList.remove("hidden");
}

function goBackToPreviousPage() {
  if (window.ArrowLoginHost && typeof window.ArrowLoginHost.close === 'function') {
    window.ArrowLoginHost.close();
    return;
  }

  if (notifyParent('close')) {
    return;
  }

  const saved = getSavedPreviousPage();
  let target;
  try {
    target = new URL(saved, window.location.href).href;
  } catch (e) {
    target = new URL('popup.html', window.location.href).href;
  }
  if (target && target !== window.location.href) {
    window.location.href = target;
    return;
  }

  // Final fallback
  window.location.href = new URL('popup.html', window.location.href).href;
}

function isClickOutsideCard(target) {
  const card = document.querySelector(".card-container");
  return Boolean(card && target && !card.contains(target));
}

function showInlineError(errorElement, message) {
  errorElement.textContent = message;
  errorElement.classList.add("hidden");
  void errorElement.offsetWidth;
  errorElement.classList.remove("hidden");
}

// --- Promisify chrome.storage.local.get ---
function getPassword() {
  return new Promise((resolve) => {
    chrome.storage.local.get("extensionPassword", (data) => {
      resolve(data.extensionPassword);
    });
  });
}

// --- Get dark mode preference ---
// --- Password strength check ---
function isStrongPassword(password) {
  // Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return strongRegex.test(password);
}

// --- Initialize page ---
async function init() {
  // Persist the immediately previous page for unified back navigation
  savePreviousPage();

  const password = await getPassword();
  if (password) {
    showContainer(loginContainer);
  } else {
    showContainer(setupContainer);
  }
}

// --- Setup password ---
saveButton.addEventListener("click", async () => {
  const newPass = newPasswordInput.value.trim();
  const confirmPass = confirmPasswordInput.value.trim();

  if (!newPass) {
    showInlineError(setupError, "Password cannot be empty.");
    return;
  }

  if (newPass !== confirmPass) {
    showInlineError(setupError, "Passwords do not match.");
    return;
  }

  if (!isStrongPassword(newPass)) {
    showInlineError(
      setupError,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
    return;
  }

  await chrome.storage.local.set({ extensionPassword: newPass });
  showNotification("Password set successfully! Please log in.", loginContainer);
  setupError.classList.add("hidden");
});

if (backFromSetupBtn) {
  backFromSetupBtn.addEventListener("click", goBackToPreviousPage);
}

// --- Enter key for setup password ---
newPasswordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveButton.click();
  }
});

confirmPasswordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveButton.click();
  }
});

// --- Check login ---
async function checkPassword() {
  const enteredPass = input.value.trim();
  const password = await getPassword();

  if (enteredPass === password) {
    // Apply pending settings after successful login.
    chrome.storage.local.get(['arrow_pending_settings', 'arrow_pending_mode'], (data) => {
      const pendingSettings = data.arrow_pending_settings || null;
      const pendingMode = data.arrow_pending_mode || null;

      // Build a single payload to set in one operation
      const toSet = {};
      let hadChanges = false;

      if (pendingSettings && typeof pendingSettings === 'object') {
        Object.assign(toSet, pendingSettings);
        const snapshot = pickSettingsSnapshot(pendingSettings);
        const detectedMode = detectModeFromSettings(snapshot);
        const modeToPersist = normalizeMode(pendingMode, detectedMode);
        toSet[MODE_STORAGE_KEY] = modeToPersist;
        toSet[MODE_SETTINGS_SNAPSHOT_KEY] = snapshot;
        toSet[MODE_UPDATED_AT_KEY] = Date.now();
        hadChanges = true;
        
        // If custom mode was selected, also save it to arrow_custom_settings.
        if (modeToPersist === 'custom') {
          toSet.arrow_custom_settings = snapshot;
        }
      }

      if (hadChanges) {
              ArrowState.commit(toSet).then(() => {
          const keysToRemove = ['arrow_pending_settings', 'arrow_pending_mode'];
                chrome.storage.local.remove(keysToRemove, () => {
                  // Notify success (safe)
                  safeRuntimeSendMessage({
                    type: 'showNotification',
                    message: 'Changes applied successfully!',
                    notificationType: 'success'
                  });

                      // Close the embedded overlay or return to the page that opened login
                      setTimeout(() => {
                        if (!notifyParent('success')) {
                          goBackToPreviousPage();
                        }
                      }, 500);
          }).catch((commitError) => {
            console.error('Failed to apply protected changes:', commitError);
            showInlineError(error, 'Unable to save changes. Please try again.');
          });
        });
      } else {
        // No pending changes – still return to the page that opened login
                  if (!notifyParent('success')) {
                    goBackToPreviousPage();
                  }
      }
    });
  } else {
    showInlineError(error, "Incorrect password!");
    input.value = "";
  }
}

button.addEventListener("click", checkPassword);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") checkPassword();
});

if (cancelButton) {
  cancelButton.addEventListener("click", goBackToPreviousPage);
}

document.addEventListener("click", (event) => {
  if (!document.body.contains(loginContainer)) return;
  if (loginOverlayEl && loginOverlayEl.hidden) return;
  const loginVisible = loginContainer && !loginContainer.classList.contains("hidden");
  const resetVisible = resetContainer && !resetContainer.classList.contains("hidden");
  if (!loginVisible && !resetVisible) return;
  if (!isClickOutsideCard(event.target)) return;
  if (!customNotification.classList.contains("hidden")) return;

  if (resetVisible) {
    currentResetIndex = 0;
    resetInput.value = "";
    showContainer(loginContainer);
    return;
  }

  goBackToPreviousPage();
});

// --- Forgot password ---
forgotButton.addEventListener("click", () => {
  currentResetIndex = 0;
  resetInput.value = "";
  showCurrentWord();
  showContainer(resetContainer);
});

if (cancelResetBtn) {
  cancelResetBtn.addEventListener("click", () => {
    currentResetIndex = 0;
    resetInput.value = "";
    showContainer(loginContainer);
  });
}

// --- Show current word ---
function showCurrentWord() {
  currentWordEl.textContent = resetWords[currentResetIndex];
}

// --- Handle reset next ---
resetNextBtn.addEventListener("click", async () => {
  const userWord = resetInput.value.trim();

  if (userWord === resetWords[currentResetIndex]) {
    currentResetIndex++;
    resetInput.value = "";

    if (currentResetIndex >= resetWords.length) {
      await chrome.storage.local.remove("extensionPassword");
      showNotification(
        "Password reset successful! Please set a new password.",
        setupContainer
      );
    } else {
      showCurrentWord();
    }
  } else {
    showNotification("Incorrect word! Start over.", resetContainer);
    currentResetIndex = 0;
    resetInput.value = "";
    showCurrentWord();
  }
});

// --- Browser notification function ---
function showBrowserNotification(message, type = 'info') {
  safeRuntimeSendMessage({
    type: 'showNotification',
    message: message,
    notificationType: type
  });
}

// --- Custom notification function (for login page) ---
function showNotification(message, targetContainer = loginContainer, useBrowserNotification = false) {
  // If useBrowserNotification is true, show browser notification instead
  if (useBrowserNotification) {
    showBrowserNotification(message);
    if (targetContainer !== loginContainer) {
      showContainer(targetContainer);
    }
    return;
  }

  notificationMessage.textContent = message;

  // Show the notification
  customNotification.style.opacity = "0";
  customNotification.classList.remove("hidden");

  void customNotification.offsetWidth;
  customNotification.style.opacity = "1";

  // Focus the OK button
  setTimeout(() => {
    notificationCloseButton.focus();
  }, 100);

  // Setup event listener for the OK button
  notificationCloseButton.addEventListener("click", function closeHandler() {
    // Fade out effect
    customNotification.style.opacity = "0";

    // Wait for transition to complete before hiding
    setTimeout(() => {
      customNotification.classList.add("hidden");
      showContainer(targetContainer);
      notificationCloseButton.removeEventListener("click", closeHandler);
    }, 300);
  }, { once: true });
}

// --- Initialize on DOM load ---
window.addEventListener("DOMContentLoaded", () => {
  init();
  setTimeout(() => {
    document.body.setAttribute("data-loaded", "true");
  }, 50); // 50ms is usually enough
});

// Notify parent when embedded login is ready to be shown (prevents iframe flash)
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.ArrowLoginHost) {
      return;
    }

    const root = document.documentElement;
    const emitReady = () => {
      try {
        notifyParent('ready');
      } catch (e) {
        // ignore
      }
    };

    if (root.getAttribute('data-theme-ready') === 'true') {
      emitReady();
      return;
    }

    const observer = new MutationObserver(() => {
      if (root.getAttribute('data-theme-ready') === 'true') {
        observer.disconnect();
        emitReady();
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ['data-theme-ready'] });

    setTimeout(() => {
      observer.disconnect();
      emitReady();
    }, 500);
  }, 0);
});

})();
