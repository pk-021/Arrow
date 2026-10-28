# Extension surface specifications

## Popup

Provides Home, Mode/Custom settings, and Blocked Websites tabs. Changes are
tracked until Save or Cancel. Less restrictive mode changes, custom-mode
changes, and block deletions are staged for password verification; other
changes write directly. The popup owns inline block creation and deletion.

## Settings page

Provides legacy direct toggles for extension enabled, subscription redirect,
and Shorts visibility. Every change updates mode metadata and sends a browser
notification. Its blocking button opens the popup on the Blocking tab.

## Add-block page

Adds one valid URL to `blockedWebsites`, normalizing its host (including removal
of protocol and `www`), rejects empty and duplicate entries, and closes after a
successful save. Enter submits the form; close and Cancel close without changes.

## Login page/overlay

Prompts for an existing password or initial password setup. Successful
verification commits staged popup changes and returns to the saved popup view.
Password reset uses the displayed word challenge and removes the local password
when completed.

## Notification surfaces

The standalone notification page renders a native notification from `message`
and `type` query parameters, then closes. The injected overlay accepts
`showOverlayNotification`, HTML-escapes its message, supports explicit close,
and auto-dismisses after five seconds.

## Theme initialization

Extension pages use `themeSetting` (`light`, `dark`, or `system`). A small
local cache prevents a flash while storage loads. Dark mode is represented by
`dark_mode="true"` on the document root.
