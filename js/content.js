// =======================
// Globals & Flags
// =======================
let storage = chrome.storage.local;

// Off mode preset (all features disabled)
const offSettings = {
    minimal_homepage: false,
    redirect_home: false,
    hide_shorts: false,
    ArrowOn: false,
    hide_sidebar_recommendations: false,
    hide_comments: false
}

let settingCache = {};
const rootAttributeKeys = new Set([
    "ArrowOn", "redirect_home", "hide_shorts", "minimal_homepage",
    "hide_sidebar_recommended", "hide_sidebar_live_chat",
    "hide_sidebar_playlist", "hide_sidebar_fundraiser", "hide_comments"
]);

function safeRuntimeSendMessage(payload) {
    try {
        if (!chrome?.runtime?.id) return;
        chrome.runtime.sendMessage(payload, () => {
            if (chrome.runtime.lastError) {
                console.debug('[runtime] sendMessage skipped:', chrome.runtime.lastError.message);
            }
        });
    } catch (e) {
        console.debug('[runtime] sendMessage exception:', e?.message || e);
    }
}

// =======================
// Helper: Get Settings
// =======================
function getSettings(callback, keys = null) {
    storage.get(keys, result => {
        if (chrome.runtime.lastError) {
            storage = chrome.storage.local;
            storage.get(keys, rslt => callback(rslt));
        } else {
            callback(result);
        }
    });
}

function updateCurrentSettings() {
    getSettings(settings => {
        const now = Date.now();
        const today = new Date(now);
        const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const paused = settings.arrow_session_day === day && Number(settings.arrow_session_end_at) > now;
        if (!settings.ArrowOn || paused) {
            settingCache = offSettings;
        }
        else {
            settingCache = settings;
        }
        applyAttributes(settingCache);

        safeRuntimeSendMessage({ type: "toggleRedirects", enabled: !paused && settings.ArrowOn && settings.redirect_home });
        safeRuntimeSendMessage({
            type: "toggleShorts",
            enabled: !paused && settings.ArrowOn && settings.hide_shorts,
            redirectToSubscriptions: settings.redirect_home
        });
        if (paused) setTimeout(updateCurrentSettings, Math.min(Number(settings.arrow_session_end_at) - now + 20, 2147483647));

        //when redirect is turned on at homepage
        if (settingCache.redirect_home) {
            const url = window.location.href;
            if (/^https:\/\/.*\.youtube\.com\/(?:\?.*)?$/.test(url)) {
                navigateToSubscriptions();
            }
        }
    });
}

// Load settings on script start
updateCurrentSettings();
//monitor changes to settings in local storage
chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'local') updateCurrentSettings();
});

// A discarded/backgrounded YouTube tab may not process every storage event.
// Re-read the durable source of truth when the document becomes active again.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updateCurrentSettings();
});
window.addEventListener('pageshow', () => updateCurrentSettings());


//minimalist homepage
let homeCenterLogo = document.createElement("img");
homeCenterLogo.src = chrome.runtime.getURL("assets/ytlogo.png");
homeCenterLogo.alt = "YTlogo";
homeCenterLogo.className = "homeCenterLogo";

function update_home_props() {
    const url = window.location.href;
    if (/^https:\/\/.*\.youtube\.com\/(?:\?.*)?$/.test(url)) {
        document.documentElement.setAttribute("is_home", true);
        const searchbar = document.querySelector("#center");
        if (searchbar && !searchbar.contains(homeCenterLogo)) searchbar.append(homeCenterLogo);
    }
    else {
        document.documentElement.setAttribute("is_home", false)
    }
}

function update_playlist_props() {
    const url = window.location.href;
    // Check if URL contains playlist parameter or is a playlist page
    const isPlaylist = /[?&]list=/.test(url) || /\/playlist\?/.test(url);
    document.documentElement.setAttribute("is_playlist", isPlaylist);
}

// =======================
// redirect homepage
// =======================

function navigateToSubscriptions() {
    const url = "/feed/subscriptions"; // relative URL

    // If already on subscriptions, do nothing
    if (window.location.pathname === url) return;
    const link = document.querySelector('a[title="Subscriptions"]');
    if (link) link.click();
}

function handleLogoClick(event) {

    if (!settingCache.redirect_home) {
        return;
    }
    event.stopPropagation();
    event.preventDefault();
    navigateToSubscriptions();
}

function configureLogo() {
    const logo = document.querySelector("a#logo");
    if (logo) {
        if (!logo.dataset.arrowRedirectListener) {
            logo.addEventListener("click", handleLogoClick, true);
            logo.addEventListener("touchend", handleLogoClick, true);
            logo.dataset.arrowRedirectListener = 'true';
        }
    }
    else {
        setTimeout(configureLogo, 100);
    }
};



// Apply HTML attributes to the webpage
function applyAttributes(settings) {
    document.documentElement.removeAttribute("hide_sidebar_recommendations");
    Object.keys(settings).forEach(key => {
        if (rootAttributeKeys.has(key)) {
            document.documentElement.setAttribute(key, settings[key]);
        }
    });
}

function updateChatExists() {
    const chatFrame = document.querySelector("ytd-live-chat-frame");
    const chatExists = !!chatFrame &&
        !chatFrame.hasAttribute("hide-chat-frame") &&
        !chatFrame.hasAttribute("collapsed");
    document.documentElement.setAttribute("chat_exists", String(chatExists));
}

let chatExistsUpdateQueued = false;
function scheduleChatExistsUpdate() {
    if (chatExistsUpdateQueued) return;
    chatExistsUpdateQueued = true;
    requestAnimationFrame(() => {
        chatExistsUpdateQueued = false;
        updateChatExists();
    });
}

new MutationObserver(scheduleChatExistsUpdate).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hide-chat-frame", "collapsed"]
});
scheduleChatExistsUpdate();

//Mutation observer to observe changes to the attributes
new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        const attr = mutation.attributeName;
        if (attr === "redirect_home") {
            configureLogo();
        }
    });
}).observe(document.documentElement, { attributes: true });




// =======================
// SPA Event Handling
// =======================
function update(arg) {
    switch (arg) {
        case 1: // initial load
            configureLogo();
            update_home_props();
            applyAttributes(settingCache);
            break;

        case 2: // state navigate end
            break;

        case 3: // navigation start
            break;

        case 4: // navigation finish
            configureLogo();
            update_home_props();
            update_playlist_props();
            break;

        default: // yt-page-data-updated
            break;
    }
}

// =======================
// Event Listeners
// =======================
window.addEventListener("load", update.bind(null, 1));
window.addEventListener("state-navigateend", update.bind(null, 2));
window.addEventListener("yt-navigate-start", update.bind(null, 3));
window.addEventListener("yt-navigate-finish", update.bind(null, 4));
window.addEventListener("yt-page-data-updated", update);
window.addEventListener("yt-page-data-fetched", update);
window.addEventListener("yt-page-type-changed", update);

// Initialize playlist status on load
update_playlist_props();
window.addEventListener("yt-load-next-continuation", update);





