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
page-state flags (`is_home`, `is_playlist`) to the document root for CSS. It
updates the logo behavior and page flags across YouTube SPA navigation events.
When subscription redirect is enabled, it redirects the YouTube home route and
intercepts the YouTube logo to open Subscriptions. When Shorts hiding is
enabled, it asks the service worker to redirect any desktop YouTube URL with a
`shorts` path segment (including channel Shorts URLs) to the YouTube homepage.

## YouTube redirect rules

The subscription-redirect feature sends the YouTube home route and the Trending
route to Subscriptions. Shorts hiding has an independent redirect rule: any
`www.youtube.com` path with a `shorts` segment, such as `/shorts/...` or
`/@channel/shorts`, redirects to `https://www.youtube.com/`. This rule is
enabled only while `hide_shorts` is true. If subscription redirect is also
enabled, the Shorts rule redirects to Subscriptions instead; subscription
redirect takes precedence over the homepage destination.

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
