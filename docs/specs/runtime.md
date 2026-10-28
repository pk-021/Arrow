# Background and content specifications

## Service worker

On startup, merges missing settings with the Minimal preset, removes the legacy
`enable_channel_blocking` key, and restores valid mode metadata. It manages
four fixed YouTube DNR redirect rule IDs and website rules starting at 1000.
Website blocking redirects matching main-frame and selected subresource traffic
to Google while `enable_website_blocking` is not explicitly false. A block-list
or blocking-setting update rebuilds those dynamic rules.

## YouTube content script

Reads settings at load and whenever local storage changes. When the extension
is off, it applies the off feature set. It writes relevant setting values and
page-state flags (`is_home`, `is_playlist`) to the document root for CSS. It
updates the logo behavior and page flags across YouTube SPA navigation events.
When subscription redirect is enabled, it redirects the YouTube home route and
intercepts the YouTube logo to open Subscriptions.

## CSS contract

`content.css` consumes the root attributes set by the content script. No UI
surface should infer feature state independently; it must read the shared local
storage values.
