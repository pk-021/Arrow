# Extension surface specifications

## Popup

Provides daily-session Home, Settings, and Mode/Custom views. Changes are tracked until Save or
Cancel. Less restrictive mode changes, custom-mode changes, and an increase to the daily pause
allowance are staged for password verification; other changes write directly. Website blocking and its
block-list management are not exposed in the popup. Its shell adapts to the
available viewport and keeps overflowing content scrollable rather than
clipping controls at high display scale or on a narrow system window.

The Custom editor keeps all settings reachable by scrolling in constrained popup windows. Its scrollbar sits at the popup right edge, stays narrow, uses the shared muted palette with a transparent track, and gains contrast on hover without hiding scrollability. Control cards retain their right inset inside the scroll area. Custom settings include Hide comments and a **Hide sidebar** master setting, with the four visible nested controls **Hide recommended**, **Hide live chat**, **Hide playlist**, and **Hide fundraiser**. Turning the master on turns every child on; turning it off turns every child off. A child change updates the master to on only when all four children are on. Minimal and High Focus enable Hide sidebar and all four child settings by default; Minimal leaves comments visible, while High Focus enables Hide comments by default. This change exposes and persists settings only; it does not add or change YouTube CSS behavior for the child settings.

## Settings page

Provides legacy direct toggles for extension enabled, subscription redirect,
and Shorts visibility. Every change updates mode metadata and sends a browser
notification. It does not expose website blocking.

## Identity and sync status

Popup Settings places a compact, dedicated Sync status area first, above the
daily pause, theme, and mode rows. Selecting the Sync row opens a short,
formally worded information dialog. The dialog states that Arrow stores its
settings and session data in Chrome storage, that eligible preferences use
Chrome Sync when available, that Arrow does not send data to Arrow-operated
servers, and that uninstalling Arrow removes its local data. It also clarifies
that Chrome-managed synced preferences may be restored on reinstall. The row
uses the same hover fill and bordered separation as the other Settings rows.
It initially
states whether Chrome sync is available and, when Chrome provides profile
metadata, displays `Synced as <email>`. The identity email is read using
`chrome.identity.getProfileUserInfo()` and is not stored by Arrow. Arrow never
calls `chrome.identity.getAuthToken()`, opens a Google authorization prompt, or
includes OAuth configuration; native Chrome Sync and Chrome-profile metadata
are sufficient for this product.

The Sync status uses a polite live region for ordinary state changes and an
assertive live region for a failed preference write. It refreshes immediately
when `chrome.storage.onChanged` reports `areaName === 'sync'`, allowing remote
preference updates to appear without a popup reload.

## Login page/overlay

Prompts for an existing password or initial password setup. Successful
verification commits staged popup changes and returns to the saved popup view.
The verification flow awaits the durable commit and reports a commit failure inline without an
uncaught promise error or closing the overlay.
Password reset uses the displayed word challenge and removes the local password
when completed.
Setup, verification, reset, word challenge, errors, and notification controls
share the same neutral surfaces, warm primary action, focus treatment, and
light/dark contrast in the standalone page and popup overlay.
Password and confirmation fields are cleared immediately after a successful
setup or verification, and whenever the login overlay is dismissed, so no
entered secret remains in an inactive extension surface.

## Notification surfaces

The standalone notification page renders a native notification from `message`
and `type` query parameters, then closes. The injected overlay accepts
`showOverlayNotification`, HTML-escapes its message, supports explicit close,
and auto-dismisses after five seconds.
The standalone page and injected overlay use the shared neutral and warm
palette. The injected overlay follows Arrow's `themeSetting` even when the
host page uses another theme. Native operating-system notifications keep their
platform appearance.

## Theme initialization

Extension pages use `themeSetting` (`light`, `dark`, or `system`). A small
local cache prevents a flash while storage loads. Dark mode is represented by
`dark_mode="true"` on the document root.

## Shared visual system and responsive behavior

All extension-owned pages use the Arrow control-panel visual language: a
neutral canvas, elevated light or dark surfaces, one warm yellow/orange action color, a
consistent system sans-serif type scale, 8px spacing rhythm, and shared focus,
input, toggle, and button treatments. Labels use sentence case and controls
have visible keyboard focus. Light and dark themes preserve equivalent
contrast, hierarchy, and interaction states.
Shared color tokens are the source of truth for extension pages. Surface rules
must not reintroduce legacy blue or red primary actions or leave interaction
states outside the active theme.

The popup uses local SVG assets for pixel hearts and the settings, navigation, edit, and refill icons. Monochrome icons inherit the page color in light and dark themes; hearts retain exact proportional fill. The popup remains a compact, scrollable control panel: headers orient the
current view, setting rows and modes use a common surface and border treatment,
and pending actions remain reachable at the bottom. Standalone settings and
password surfaces use the same tokens and action hierarchy. At narrow viewport
widths, page padding and multi-action rows reduce gracefully;
controls retain a 40px minimum target and never overflow or become clipped.

### UI redesign

Extension-owned controls use a calm, precise visual system: gray canvas,
ink-like text, warm yellow/orange actions, thin dividers, and purposeful spacing.
The popup Home gives the daily hearts and remaining time the clearest hierarchy,
then presents available passes as full-width actions. Settings, Mode, and Custom
share the same header, row, selection, and navigation treatments. Pending Save
and Cancel actions stay obvious when changes exist. The Custom editor header
aligns to the Mode header and its setting rows align to the Settings list;
Settings and Custom row text sits at the same 16px inset as Mode options, with
hover fills that preserve that breathing room in light and dark themes;
switches use the same warm accent and visible focus state in both themes. The
footer always reserves its compact action-bar space, including when no changes are pending, so the
popup content does not shift when Save and Cancel appear. When changes are pending it shows a clear status, neutral Cancel,
and warm primary Save, without clipping on a narrow popup. Confirmation and password
surfaces use the same palette and button hierarchy. The legacy settings page
uses the same visual language while retaining its direct toggles. Light and dark
themes have equal hierarchy and legible contrast. The preferred popup size is
420 by 600 CSS pixels, with enough room for seven hearts and full-width pass
actions without crowding. At constrained
widths and heights, every control remains reachable, keyboard focus is visible,
and long labels wrap without clipping. Existing labels, icon assets, and behavior
remain intact.

## Viewport support

Extension pages use a preferred desktop popup size but must not require it.
The action popup declares an intrinsic 420 by 600 CSS-pixel preferred size;
that size must not be computed from `vw` or `vh`, because the browser derives
an action popup's initial viewport from its document's intrinsic dimensions.
No viewport media query may replace the popup body's intrinsic width with a
percentage or viewport-relative width during startup. Responsive rules adjust
the inner content, while the body continues to provide Chrome a definite width.
When the browser constrains that preferred size, controls have usable intrinsic
widths and content remains reachable through scrolling.
## Daily sessions

The popup Home shows a daily pause allowance, default 30 minutes, adjustable in Settings to 15, 30, 45, or 60 minutes. Raising that allowance creates a pending change; it takes effect only after Save and password verification. Home shows seven crisp pixel-art hearts for every daily budget. Each heart represents one seventh of that budget; its fill is proportional to the remaining time in that heart. Half hearts appear at half a heart's value, and consumed hearts are empty. A session may be 5, 10, or 15 minutes only when that much allowance remains. Starting atomically reserves the whole duration and records an absolute end timestamp. Only one session may run at once. Skip ends it immediately without refund. At zero allowance Home shows an arrow emoji and `Hearts refill tomorrow`.

The current Home theme and mode controls move to a Settings view opened by a settings icon at the top right of the popup header. Existing mode and custom editing remain available there. During a session Home hides the start choices and shows a circular countdown and a subdued, accessible Skip button. The countdown derives from the persisted deadline, never from accumulated timer ticks.

When Arrow is off, Home retains its header and reserved footer but replaces the daily-life body with a large `Turn on Arrow` button. Switching Off preserves the preceding mode and its settings; activating the button restores that saved mode atomically through the central state contract. The off-state button and daily-life body occupy one fixed Home body layer so the button exits and the daily-life body enters with an opacity-and-translate transition, without reflow or flicker. Users who prefer reduced motion receive a brief fade without movement. A failed commit restores the off state and leaves Arrow disabled.

The allowance resets on the next local calendar date. The service worker serializes start, skip, expiry, and budget changes with its durable state commit queue. Session data is retained in `arrow_session_day` (local YYYY-MM-DD), `arrow_session_used_minutes`, and `arrow_session_end_at` (epoch milliseconds or zero). Daily budget is `arrow_daily_session_minutes`. Existing settings and mode metadata are untouched by pausing. Content behavior and redirect rules use the effective session state and return to saved settings at the deadline. An alarm and startup reconciliation restore rules after worker suspension; every content read compares the deadline to the current clock so expiry does not depend on a popup staying open.


Home has no daily-health title. The seven-heart group is centered horizontally within the popup at every supported width; when constrained, wrapped heart rows also center. The remaining minutes appear centered directly below the hearts with a small 8px layout gap, without a health subtitle or percentage. The session prompt reads "Get a pass for:" and aligns with the pass-button text rather than the button border (the text begins 21px inside the outer edge: 1px border plus 20px padding). Its 5, 10, and 15 minute buttons stack vertically at full usable width. Pass arrows are off-white in both themes; pass button surfaces stay dark enough for the arrows and labels to remain legible, including in light mode.


Choosing a pass opens a confirmation dialog that names its duration and states that the full duration is deducted immediately. Cancel, Escape, or closing the dialog leaves the allowance untouched. Confirm starts the session; a failed start reports an error without pretending that a session began.









