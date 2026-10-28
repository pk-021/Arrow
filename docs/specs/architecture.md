# Architecture and shared contracts

## Runtime boundaries

| Boundary | Responsibility | Contract |
| --- | --- | --- |
| Service worker | Default settings, durable serialized commits, declarative-network rules, native notifications | Receives runtime messages, recovers incomplete commits, and watches local storage. |
| YouTube content script | Applies settings as attributes and handles YouTube SPA navigation | Reads local storage and sends redirect rule updates. |
| Popup | Primary settings and password-lock UI | Stages protected changes before writing storage. |
| Standalone pages | Legacy settings, login, and notification surfaces | Read/write the same local-storage schema. |

## Local-storage schema

| Key | Type | Meaning |
| --- | --- | --- |
| `ArrowOn`, `redirect_home`, `hide_shorts`, `minimal_homepage`, `hide_sidebar_recommendations`, `hide_comments` | boolean | Feature settings. |
| `arrow_mode` | `off`, `minimal`, `high-focus`, or `custom` | Canonical chosen mode read by every UI surface. |
| `arrow_mode_settings_snapshot` | object | Boolean snapshot of the six settings. |
| `arrow_mode_updated_at` | number | Metadata update time. |
| `arrow_custom_settings` | object | Last custom setting selection. |
| `extensionPassword` | string | Locally stored extension lock password. |
| `arrow_state_revision` | number | Monotonically increasing durable-state revision. |
| `arrow_pending_transaction` | object | Recovery journal for a commit that was interrupted before acknowledgement. |

## Runtime messages

| Message | Payload | Result |
| --- | --- | --- |
| `toggleRedirects` | `{ enabled }` | Adds/removes home redirect DNR rules. |
| `toggleShorts` | `{ enabled, redirectToSubscriptions }` | Adds/removes the Shorts-path DNR rule; the second flag selects Subscriptions instead of the homepage. |
| `showNotification` | `{ message, notificationType }` | Creates a browser notification. |
| `showOverlayNotification` | `{ message, notificationType }` | Displays a page overlay when the content script is present. |
| `arrow:commit` | `{ patch }` | Serializes and durably applies a settings patch. |

## Mode behavior

`off` disables every feature. `minimal` and `high-focus` use distinct feature
settings; High Focus additionally hides watch-page comments. They remain
separate persisted modes because the UI
offers both choices. Every surface reads the persisted `arrow_mode` when it is
valid, so equivalent presets retain their chosen identity. Only missing or
invalid mode metadata is derived from the current setting booleans; any
combination not matching a preset is then `custom`.
