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
   path redirects when subscription redirect is off.
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
