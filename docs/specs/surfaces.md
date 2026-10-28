# Extension surface specifications

## Popup

Provides Home and Mode/Custom settings. Changes are tracked until Save or
Cancel. Less restrictive mode changes and custom-mode changes are staged for
password verification; other changes write directly. Website blocking and its
block-list management are not exposed in the popup. Its shell adapts to the
available viewport and keeps overflowing content scrollable rather than
clipping controls at high display scale or on a narrow system window.

Custom settings include Hide comments. Minimal leaves comments visible, while
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

The popup remains a compact, scrollable control panel: headers orient the
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
