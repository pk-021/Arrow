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
## Session state and verification

Session mutations use dedicated `arrow:session-start` and `arrow:session-skip` worker messages. They validate current allowance and deadline inside the serialized queue, then use the same journaled revision commit path as settings. Legacy stores without session keys read as a fresh day with the default budget. A prior day's usage reads as zero without deleting history until the next mutation. A budget reduction never refunds used time.

18. Set a 30-minute budget. Start 10 minutes and confirm the seven-heart display loses the correct 10-minute fraction immediately, the timer starts near 10:00, and a second start is unavailable. Close/reopen the popup and confirm the deadline is preserved. Skip and confirm the full 10 minutes remains spent and the saved extension behavior resumes. Start sessions until no time remains and confirm the refill message. Verify 15-minute choice is unavailable when less than 15 minutes remain.
19. With a session running, reload a YouTube tab and confirm all Arrow page effects and redirect rules are inactive. Let the deadline pass with the popup closed and confirm the saved settings and rules resume. Restart the service worker/browser during a session and repeat. Change the local date and confirm the new daily allowance appears without carrying yesterday's active pause forward.
20. Open Home at full, partial, and empty allowance. Confirm the settings button is on the header right, Get a pass for: appears without a Daily Health title, the three session buttons stack vertically, and remaining minutes sit closely below the hearts without a subtitle or percentage. Check narrow width and dark theme.

21. Click each available pass duration and confirm the dialog names the duration. Cancel and Escape without any deduction. Confirm a pass and verify the full duration is deducted once, the dialog closes, and the countdown starts. Verify focus returns to the triggering button after cancellation.




22. At 15, 30, 45, and 60-minute allowances, confirm seven pixel-edged hearts appear. Start a five-minute pass and confirm the fill decreases by exactly five minutes relative to the per-heart value of budget divided by seven, including partial hearts. At zero remaining, confirm seven empty hearts.


23. Open Custom Settings at the preferred popup size and a constrained height. Confirm no unnecessary prominent scrollbar at preferred size; at constrained height, scroll through every setting using wheel, touchpad, and keyboard. Verify the slim scrollbar sits flush with the popup right edge, its hover state works in light and dark themes, and controls retain their right inset without clipping.

24. Inspect popup Home, Settings, Mode, Custom, and password views in light and dark themes. Confirm local SVG icons render sharply at normal and high display scale, align with their controls, and have accessible button names. Confirm heart fill remains accurate for all budget choices and no icon depends on a remote network request.
25. On a desktop YouTube watch page containing `#secondary-timer div#related`, enable Hide Sidebar Recommendations and confirm only that related container is hidden within the section. Disable the setting and confirm it returns. Check other children of `#secondary-timer` remain usable.

