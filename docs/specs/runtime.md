# Background and content specifications

## Service worker

On startup, recovers an interrupted durable transaction, merges missing
settings with the Minimal preset without replacing existing values, removes the
legacy `enable_channel_blocking` key, and restores valid mode metadata. It
serializes `arrow:commit` messages, recording a recovery journal before each
atomic storage write. It manages four fixed YouTube DNR redirect rule IDs and
removes legacy website-blocking dynamic rules starting at ID 1000. Website
blocking is not active and no block-list mutation messages are supported.

## YouTube content script

Reads settings at load and whenever local storage changes or the document
resumes. When the extension
is off, it applies the off feature set. It writes relevant setting values and
page-state flags (`is_home`, `has_playlist`) to the document root for CSS. It
updates the logo behavior and page flags across YouTube SPA navigation events.
It writes `chat_exists` on the document root: it is `"true"` only when a
`ytd-live-chat-frame` exists without either `hide-chat-frame` or `collapsed`.
It is `"false"` when the frame is absent or has either attribute, and it
updates when YouTube inserts, removes, hides, or collapses that frame.
When subscription redirect is enabled, it redirects the YouTube home route and
intercepts the YouTube logo to open Subscriptions. When Shorts hiding is
enabled, it asks the service worker to redirect any desktop YouTube URL with a
`shorts` path segment (including channel Shorts URLs) to the YouTube homepage.
The service worker also handles top-frame YouTube history-state navigation to
these routes, since YouTube can open Shorts without a new main-frame request.
It reads the current saved settings and session state before redirecting, and
uses Subscriptions as the destination when subscription redirect is enabled.

## YouTube redirect rules

The subscription-redirect feature sends the YouTube home route and the Trending
route to Subscriptions. Shorts hiding has an independent redirect rule: any
`www.youtube.com` path with a `shorts` segment, such as `/shorts/...` or
`/@channel/shorts`, redirects to `https://www.youtube.com/`. This rule is
enabled only while `hide_shorts` is true. If subscription redirect is also
enabled, the Shorts rule redirects to Subscriptions instead; subscription
redirect takes precedence over the homepage destination. The same route and
destination rules apply to in-page history navigation.

## CSS contract

`content.css` consumes the root attributes set by the content script. No UI
surface should infer feature state independently; it must read the shared local
storage values.

When `hide_shorts="true"`, the stylesheet hides only concrete desktop YouTube
Shorts components: guide and mini-guide entries, Shorts shelves and their
wrappers, Shorts result and recommendation cards identified by a `/shorts`
link, the Shorts channel tab, the labelled Shorts filter chip, notifications,
and the embedded player Shorts container. It must not rely on a chip's position
or apply mobile-only `ytm-*` selectors because the content script matches
`www.youtube.com`.

When `hide_comments="true"`, the stylesheet hides the watch-page comments
surface using `ytd-comments#comments`. The rule is scoped to that setting and
does not hide comment controls when the setting is off.

When `hide_sidebar_recommendations="true"` on desktop YouTube watch pages,
the stylesheet uses the `has_playlist` page flag. The content script sets that
flag to `"true"` only when `ytd-playlist-panel-renderer#playlist` exists and
does not have its `hidden` attribute; it sets the flag to `"false"` when the
element is absent or hidden. On playlist watches, it hides
direct children of `#secondary-inner` except
`ytd-playlist-panel-renderer#playlist`. On non-playlist watches, it hides
`#secondary.ytd-watch-flexy`. Neither rule applies when the setting is false.
Keep the newer `#secondary-inner div#related` rule commented out for reference.

`minimal_homepage` alone controls the established home-feed and chip hiding
behavior. The document root receives `hide_sidebar_recommendations` for the
independent watch-sidebar selectors. The granular sidebar preference values
remain persisted but have no selectors until a later, explicitly specified CSS
change.


