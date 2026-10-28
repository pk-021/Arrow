# Architecture and shared contracts

## Runtime boundaries

| Boundary | Responsibility | Contract |
| --- | --- | --- |
| Service worker | Default settings, declarative-network rules, native notifications | Receives runtime messages and watches local storage. |
| YouTube content script | Applies settings as attributes and handles YouTube SPA navigation | Reads local storage and sends redirect rule updates. |
| Popup | Primary settings, blocking and password-lock UI | Stages protected changes before writing storage. |
| Standalone pages | Legacy settings, add-block, login, and notification surfaces | Read/write the same local-storage schema. |

## Local-storage schema

| Key | Type | Meaning |
| --- | --- | --- |
| `ArrowOn`, `redirect_home`, `hide_shorts`, `minimal_homepage`, `enable_website_blocking`, `hide_sidebar_recommendations` | boolean | Feature settings. |
| `arrow_mode` | `off`, `minimal`, `high-focus`, or `custom` | Chosen mode. |
| `arrow_mode_settings_snapshot` | object | Boolean snapshot of the six settings. |
| `arrow_mode_updated_at` | number | Metadata update time. |
| `arrow_custom_settings` | object | Last custom setting selection. |
| `blockedWebsites` | `{ url, addedAt }[]` | User block list. |
| `extensionPassword` | string | Locally stored extension lock password. |

## Runtime messages

| Message | Payload | Result |
| --- | --- | --- |
| `toggleRedirects` | `{ enabled }` | Adds/removes home redirect DNR rules. |
| `toggleShorts` | `{ enabled }` | Adds/removes Shorts redirect DNR rule. |
| `showNotification` | `{ message, notificationType }` | Creates a browser notification. |
| `showOverlayNotification` | `{ message, notificationType }` | Displays a page overlay when the content script is present. |

## Mode behavior

`off` disables every feature. `minimal` and `high-focus` currently resolve to
the same six booleans; they remain separate persisted modes because the UI
offers both choices. Any combination not matching a preset is `custom`.
