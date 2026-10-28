// --- Notification Helper ---
function showNotification(message, type = 'info') {
    if (chrome && chrome.notifications) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/logo_v2.png',
            title: 'Arrow',
            message: message
        });
    }
}

// --- Get dark mode preference ---
function applyDarkMode() {
    chrome.storage.local.get("themeSetting", (data) => {
        const themeSetting = data.themeSetting || 'system';
        if (themeSetting === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute("dark_mode", "true");
            } else {
                document.documentElement.removeAttribute("dark_mode");
            }
        } else if (themeSetting === 'dark') {
            document.documentElement.setAttribute("dark_mode", "true");
        } else if (themeSetting === 'light') {
            document.documentElement.removeAttribute("dark_mode");
        }
    });
}


// Mapping HTML checkbox IDs -> Storage keys
const settingsMap = {
    "extension-online": "ArrowOn",
    "redirect-subscriptions": "redirect_home",
    "disable-shorts": "hide_shorts",
    "minimal-homepage": "minimal_homepage"
};

const MODE_STORAGE_KEY = ArrowConfig.MODE_KEYS.mode;
const MODE_SETTINGS_SNAPSHOT_KEY = ArrowConfig.MODE_KEYS.snapshot;
const MODE_UPDATED_AT_KEY = ArrowConfig.MODE_KEYS.updatedAt;
const SETTINGS_SNAPSHOT_KEYS = ArrowConfig.SETTINGS_KEYS;
const detectModeFromSettings = ArrowConfig.detectMode;

async function persistModeMetadataFromStorage() {
    const current = await chrome.storage.local.get(SETTINGS_SNAPSHOT_KEYS);
    const settingsSnapshot = ArrowConfig.snapshot(current, true);
    await chrome.storage.local.set(ArrowConfig.createModeMetadata(detectModeFromSettings(settingsSnapshot), settingsSnapshot));
}



// --- Load and attach listeners ---
function initSettingsToggles() {
    chrome.storage.local.get(Object.values(settingsMap), (result) => {
        for (const [checkboxId, storageKey] of Object.entries(settingsMap)) {
            const checkbox = document.getElementById(checkboxId);
            if (!checkbox) continue;

            // Load saved state
            checkbox.checked = !!result[storageKey];

            // (No HTML attribute logic here; only in content.js)

            // Save changes on toggle
            checkbox.addEventListener("change", () => {
                const newValue = checkbox.checked;
                chrome.storage.local.set({ [storageKey]: newValue }, () => {
                    persistModeMetadataFromStorage().catch((err) => {
                        console.error('Failed to persist mode metadata:', err);
                    });
                });

                // (No HTML attribute logic here; only in content.js)

                // Only show notification for non-dark mode settings
                const settingNames = {
                    "extension-online": "Extension",
                    "redirect-subscriptions": "Redirect to Subscriptions",
                    "disable-shorts": "Disable Shorts",
                    "minimal-homepage": "Minimal Homepage"
                };
                // Do not notify for dark mode
                if (settingNames.hasOwnProperty(checkboxId)) {
                    const settingName = settingNames[checkboxId];
                    showNotification(`${settingName} ${newValue ? 'enabled' : 'disabled'}`, 'info');
                }
            });
        }
    });
}



// ======================
// Init
// ======================

window.addEventListener("DOMContentLoaded", () => {
    applyDarkMode();
    initSettingsToggles();

    // Handle blocking link click - open popup with blocking tab
    const blockingLink = document.getElementById('blocking-link');
    if (blockingLink) {
        blockingLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Store the target tab in storage
            chrome.storage.local.set({ targetTab: 'blocking' }, () => {
                // Open popup.html
                window.location.href = 'popup.html';
            });
        });
    }

    // Short delay to allow initial paint
    setTimeout(() => {
        document.body.setAttribute("data-loaded", "true");
    }, 50);
});
