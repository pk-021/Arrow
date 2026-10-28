# Extension surface specifications

## Popup

Provides daily-session Home, Settings, and Mode/Custom views. Changes are tracked until Save or
Cancel. Less restrictive mode changes and custom-mode changes are staged for
password verification; other changes write directly. Website blocking and its
block-list management are not exposed in the popup. Its shell adapts to the
available viewport and keeps overflowing content scrollable rather than
clipping controls at high display scale or on a narrow system window.

The Custom editor keeps all settings reachable by scrolling in constrained popup windows. Its scrollbar sits at the popup right edge, stays narrow, uses the shared muted palette with a transparent track, and gains contrast on hover without hiding scrollability. Control cards retain their right inset inside the scroll area. Custom settings include Hide comments. Minimal leaves comments visible, while
High Focus enables Hide comments by default.

## Settings page

Provides legacy direct toggles for extension enabled, subscription redirect,
and Shorts visibility. Every change updates mode metadata and sends a browser
notification. It does not expose website blocking.

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

## Shared visual system and responsive behavior

All extension-owned pages use the Arrow control-panel visual language: a
neutral canvas, elevated white or dark surfaces, one blue action color, a
consistent system sans-serif type scale, 8px spacing rhythm, and shared focus,
input, toggle, and button treatments. Labels use sentence case and controls
have visible keyboard focus. Light and dark themes preserve equivalent
contrast, hierarchy, and interaction states.

The popup uses local SVG assets for pixel hearts and the settings, navigation, edit, and refill icons. Monochrome icons inherit the page color in light and dark themes; hearts retain exact proportional fill. The popup remains a compact, scrollable control panel: headers orient the
current view, setting rows and modes use a common surface and border treatment,
and pending actions remain reachable at the bottom. Standalone settings and
password surfaces use the same tokens and action hierarchy. At narrow viewport
widths, page padding and multi-action rows reduce gracefully;
controls retain a 40px minimum target and never overflow or become clipped.

## Viewport support

Extension pages use a preferred desktop popup size but must not require it.
The action popup declares an intrinsic 380 by 560 CSS-pixel preferred size;
that size must not be computed from `vw` or `vh`, because the browser derives
an action popup's initial viewport from its document's intrinsic dimensions.
When the browser constrains that preferred size, controls have usable intrinsic
widths and content remains reachable through scrolling.
## Daily sessions

The popup Home shows a daily pause allowance, default 30 minutes, adjustable in Settings to 15, 30, 45, or 60 minutes. Home shows seven crisp pixel-art hearts for every daily budget. Each heart represents one seventh of that budget; its fill is proportional to the remaining time in that heart. Half hearts appear at half a heart's value, and consumed hearts are empty. A session may be 5, 10, or 15 minutes only when that much allowance remains. Starting atomically reserves the whole duration and records an absolute end timestamp. Only one session may run at once. Skip ends it immediately without refund. At zero allowance Home shows an arrow emoji and `Hearts refill tomorrow`.

The current Home theme and mode controls move to a Settings view opened by a settings icon at the top right of the popup header. Existing mode and custom editing remain available there. During a session Home hides the start choices and shows a circular countdown and a subdued, accessible Skip button. The countdown derives from the persisted deadline, never from accumulated timer ticks.

The allowance resets on the next local calendar date. The service worker serializes start, skip, expiry, and budget changes with its durable state commit queue. Session data is retained in `arrow_session_day` (local YYYY-MM-DD), `arrow_session_used_minutes`, and `arrow_session_end_at` (epoch milliseconds or zero). Daily budget is `arrow_daily_session_minutes`. Existing settings and mode metadata are untouched by pausing. Content behavior and redirect rules use the effective session state and return to saved settings at the deadline. An alarm and startup reconciliation restore rules after worker suspension; every content read compares the deadline to the current clock so expiry does not depend on a popup staying open.


Home has no daily-health title. The remaining minutes appear directly below the hearts with a tight 2px visual gap, without a health subtitle or percentage. The session prompt reads "Get a pass for:" and its 5, 10, and 15 minute buttons stack vertically at full usable width.


Choosing a pass opens a confirmation dialog that names its duration and states that the full duration is deducted immediately. Cancel, Escape, or closing the dialog leaves the allowance untouched. Confirm starts the session; a failed start reports an error without pretending that a session began.









