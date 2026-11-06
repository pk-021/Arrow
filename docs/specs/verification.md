# Verification checklist

1. Load the unpacked extension and confirm the service worker starts without errors.
2. Select each mode, save, reopen the popup, and confirm its selection and all toggles persist.
3. Add, reject a duplicate of, and delete a blocked site; confirm enabled blocking rebuilds rules.
4. Toggle website blocking off and confirm block rules are removed, then re-enable it.
5. On desktop `www.youtube.com`, enable Shorts hiding and confirm the guide and
   mini-guide links, Shorts shelves, `/shorts` search and recommendation cards,
   Shorts channel tab, labelled Shorts filter chip, notification cards, and
   player Shorts container are hidden. Confirm unrelated filter chips remain
   visible; then test Minimal Homepage, sidebar recommendations, and subscription
   redirect. With Shorts hiding enabled, visit both `/shorts/<id>` and
   `/@channel/shorts`; confirm each redirects to the YouTube homepage rather
   than Subscriptions. Enable subscription redirect too and confirm both paths
   instead redirect to Subscriptions. Disable Shorts hiding and confirm neither
   path redirects when subscription redirect is off. Repeat both Shorts paths
   by navigating from an already open YouTube page without a full reload, and
   verify the same destinations. While a pass is active or Arrow is off,
   confirm in-page navigation to a Short is allowed.
6. Set a password, make a protected change, verify it, and confirm the staged change is committed.
7. Test light, dark, and system theme on popup, login, settings, and add-block pages.
8. Send a notification and confirm native notification behavior; send an overlay notification on a normal web page and confirm close and auto-dismiss.
9. Open two extension surfaces, make non-overlapping changes in each, save in either order, and confirm both changes persist after reopening.
10. Add the same blocked site from two open surfaces and confirm exactly one entry remains.
11. During a save, close the popup or restart the browser/service worker; on the next startup confirm the acknowledged change is present and `arrow_pending_transaction` is cleared.
12. Suspend or background a surface, change settings elsewhere, resume it, and confirm it refreshes from storage without overwriting newer values.
13. Reload the extension, open the action popup, and confirm Home renders at its
    preferred size instead of a collapsed box. Run `node --test
    tests/popup-shell.test.js` after any popup HTML or CSS change; it verifies
    that the popup retains intrinsic dimensions and that required startup
    resources load in dependency order.
14. Review the popup, settings, add-block, and password surfaces in light and
    dark themes at their preferred and constrained widths. Confirm shared
    colors, typography, focus rings, buttons, and toggles are consistent; no
    control is clipped or horizontally overflows, and action targets remain at
    least 40 CSS pixels high.
15. Confirm no website-block controls, block-list messages, or add-block page
    are reachable. On startup, `blockedWebsites` and `enable_website_blocking`
    are removed from storage and all dynamic DNR rules at IDs 1000 or above are
    removed.
16. Select each mode, save it, close and reopen the popup, and compare Home
    with the selected radio button in Mode. They must show the same persisted
    mode, including the distinct Minimal and High Focus choices despite their
    equivalent setting booleans. Repeat after a protected custom-mode save.
17. On a YouTube watch page, select High Focus and confirm
    `ytd-comments#comments` is hidden. Select Minimal and confirm comments are
    visible. In Custom, toggle Hide comments and confirm the page updates after
    saving.
## Session state and verification

Session mutations use dedicated `arrow:session-start` and `arrow:session-skip` worker messages. They validate current allowance and deadline inside the serialized queue, then use the same journaled revision commit path as settings. Legacy stores without session keys read as a fresh day with the default budget. A prior day's usage reads as zero without deleting history until the next mutation. A budget reduction never refunds used time.

18. Set a 30-minute budget. Start 10 minutes and confirm the seven-heart display loses the correct 10-minute fraction immediately, the timer starts near 10:00, and a second start is unavailable. Close/reopen the popup and confirm the deadline is preserved. Skip and confirm the full 10 minutes remains spent and the saved extension behavior resumes. Start sessions until no time remains and confirm the refill message. Verify 15-minute choice is unavailable when less than 15 minutes remain.
19. With a session running, reload a YouTube tab and confirm all Arrow page effects and redirect rules are inactive. Let the deadline pass with the popup closed and confirm the saved settings and rules resume. Restart the service worker/browser during a session and repeat. Change the local date and confirm the new daily allowance appears without carrying yesterday's active pause forward.
20. Open Home at full, partial, and empty allowance. Confirm the settings button is on the header right, Get a pass for: appears without a Daily Health title, the three session buttons stack vertically, and remaining minutes sit closely below the hearts without a subtitle or percentage. Check narrow width and dark theme.

21. Click each available pass duration and confirm the dialog names the duration. Cancel and Escape without any deduction. Confirm a pass and verify the full duration is deducted once, the dialog closes, and the countdown starts. Verify focus returns to the triggering button after cancellation.




22. At 15, 30, 45, and 60-minute allowances, confirm seven pixel-edged hearts appear. Start a five-minute pass and confirm the fill decreases by exactly five minutes relative to the per-heart value of budget divided by seven, including partial hearts. At zero remaining, confirm seven empty hearts.


23. Open Custom Settings at the preferred popup size and a constrained height. Confirm no unnecessary prominent scrollbar at preferred size; at constrained height, scroll through every setting using wheel, touchpad, and keyboard. Verify the slim scrollbar sits flush with the popup right edge, its hover state works in light and dark themes, and controls retain their right inset without clipping.

24. Inspect popup Home, Settings, Mode, Custom, and password views in light and dark themes. Confirm local SVG icons render sharply at normal and high display scale, align with their controls, and have accessible button names. Confirm heart fill remains accurate for all budget choices and no icon depends on a remote network request.
25. On desktop YouTube watch pages, enable Hide Sidebar Recommendations. With a
    playlist open, confirm the `ytd-playlist-panel-renderer#playlist` remains
    usable while other direct children of `#secondary-inner` are hidden. On a
    watch page without a playlist, confirm `#secondary.ytd-watch-flexy` is
    hidden. Disable the setting on both pages and confirm the sidebar returns.
    Confirm `is_playlist="true"` only while
    `ytd-playlist-panel-renderer#playlist` exists without `hidden`, and confirm
    `is_playlist="false"` when that element is absent or has `hidden`.

25a. Open Custom Settings and confirm **Hide Sidebar** visibly contains the
    indented controls Hide recommended, Hide live chat, Hide playlist, and Hide
    fundraiser. Turn Hide Sidebar on and off and confirm all four child controls
    follow. Turn a child off and confirm Hide Sidebar turns off without changing
    the other children; turn the final disabled child on and confirm Hide
    Sidebar turns on. Save, reopen the popup, and confirm all five values
    persist. Load an existing profile that has only
    `hide_sidebar_recommendations` and confirm its missing child values inherit
    that master value. Confirm the document root exposes only the four granular
    sidebar attributes and this case adds no new content stylesheet rules.

25b. On a desktop YouTube live watch page, confirm the document root has
    `chat_exists="true"` while `ytd-live-chat-frame` has neither
    `hide-chat-frame` nor `collapsed`. Add either attribute and confirm
    `chat_exists="false"`; remove it and confirm the value returns to `"true"`.
    Confirm a page without a live-chat frame reports `chat_exists="false"`.

26. Inspect popup Home, Settings, Mode, Custom, confirmation, and password views,
    plus the legacy settings page, in light and dark themes. At the preferred
    popup size (420 by 600 CSS pixels) and constrained width/height, confirm a
    consistent gray and warm yellow/orange visual language, clear daily allowance
    and pass hierarchy, readable
    labels, visible selected and pending states, 40px action targets, keyboard
    focus, no horizontal overflow, and scroll access to every control. Confirm
    existing controls and their behavior still work.

27. Reload the extension and open Home as an action popup. Confirm its outer
    width is the declared 420 CSS pixels rather than a narrow initial viewport;
    all seven hearts fit on one row and pass buttons use the available width.
    Repeat after opening Settings and returning Home. Run the popup shell test
    to confirm no later stylesheet gives the popup body a percentage or
    viewport-derived startup width.

28. Open Mode and Custom in light and dark themes. Confirm the Custom back
    button, title, rows, and scrollbar align with the other popup views, and
    Settings and Custom row labels have the same inset from hover fill edges as
    Mode option titles in both themes. Confirm
    switches use the shared warm accent rather than legacy blue. With no
    pending changes, confirm the empty footer remains visible and reserves the same space as the
    pending action bar. Change a Custom
    toggle or mode and confirm the pending footer appears with readable status,
    neutral Cancel, warm Save, keyboard focus, and no horizontal clipping.
    Cancel or Save and confirm the footer returns to its empty reserved state. Repeat in a
    constrained-height popup and confirm all Custom rows remain scrollable.

32. Set a daily pause allowance, then choose a higher allowance. Confirm the value becomes a
    pending change, the footer actions appear without shifting the content area, and Save opens the
    password verification flow. Confirm Cancel preserves the stored allowance. Enter the correct
    password after Save and confirm the increased allowance is committed and shown on Home.

33. Turn Arrow off and open Home. Confirm the header and reserved footer remain while the
    daily-life body is replaced by a large `Turn on Arrow` button. Activate it and confirm the
    button exits while the daily-life body enters smoothly without a flicker, `ArrowOn` is durably
    true after reopening the popup, and reduced-motion preference removes the movement without
    preventing activation. Repeat from Minimal, High Focus, and Custom: after turning Arrow back
    on, Home and the selected Mode radio must show the exact mode and settings from before Off.

34. Complete password setup and successful password verification in both the standalone login page
    and popup overlay. Confirm the submitted password and confirmation fields clear immediately;
    cancel or dismiss the overlay and confirm every password field is empty when it is next shown.

35. Save a password-protected change with the correct password. Confirm the staged change commits,
    the overlay closes only after success, and the popup console contains no uncaught promise error.
    Simulate a commit failure and confirm the overlay stays open with its inline error shown.

36. In a Chrome profile with sync enabled, change a preference and confirm the
    worker writes one `arrow_sync_preferences` envelope smaller than 8 KB. Make
    the same preference change on a second profile with the same published
    extension ID; confirm the first popup updates through its sync-area change
    listener without being reloaded. Confirm session state, passwords, pending
    transactions, and tokens are absent from the envelope.

37. With `identity` and `identity.email` permissions available, open Popup Settings and confirm
    Sync is the first Settings row, has the same hover fill and bordered
    separation as the other rows, and selecting it opens an information dialog.
    Confirm the dialog accurately states Arrow's Chrome storage and Sync use,
    its lack of Arrow-operated server transmission, and local-data deletion on
    uninstall. Confirm the Sync status names the signed-in profile email when Chrome supplies one,
    otherwise explains that sync is unavailable. Confirm no Google authorization
    prompt, OAuth client configuration, token request, or stored token exists;
    a quota or connectivity failure must appear inline without losing the
    locally saved preference.

38. Build the initial Chrome Web Store draft package and confirm its manifest
    omits the local `key` and all OAuth configuration. Upload it as a draft and
    copy its public key into the source manifest. Build both targets and confirm
    both manifests retain the Store public key but omit OAuth configuration.
    Load the unpacked build from a second local directory and confirm its
    extension ID matches the Store Item ID and its sync preferences are in the
    same namespace.

29. On Home in light and dark themes, confirm each pass-button arrow is
    off-white rather than yellow, remains legible on its button, and retains
    the local SVG shape. Confirm the remaining-time line sits slightly lower
    below the hearts while staying visually connected to them. Check full,
    partial, and empty allowance states without changing heart fill behavior.

30. On Home at preferred and constrained popup widths in both themes, confirm
    the seven-heart group and remaining-time line are centered horizontally
    in the popup (and each wrapped heart row centers when space is constrained).
    Confirm "Get a pass for:"
    begins on the same visual left axis as the text inside the pass buttons,
    approximately 21px in from their outer border, while buttons retain full
    usable width and remain keyboard accessible.

31. Audit every extension-owned surface in light, dark, and system theme:
    popup Home, Settings, Mode, Custom, pending footer, confirmation and password
    overlay; standalone settings; standalone password setup, verification,
    reset challenge and error states; standalone notification; and the injected
    notification overlay on light and dark host pages. Confirm neutral surfaces,
    warm primary controls, consistent text, borders, hover and focus states,
    40px action targets, no legacy blue or red primary buttons, and no horizontal
    clipping at constrained widths. Confirm reset and notification interactions
    still work, and the injected overlay follows Arrow's theme preference.

