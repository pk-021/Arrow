# Chrome Web Store Listing — Arrow

> Last Updated: 2026-11-06

## Store Listing

**Extension Name:** Arrow

**Short Description:** Make YouTube calmer by hiding distractions and setting intentional viewing pauses.

**Detailed Description:**

Arrow helps you use YouTube more intentionally by reducing common distractions and giving you clear controls over what you see.

Choose a focused viewing mode, hide Shorts, comments, and sidebar recommendations, or redirect the YouTube home page to Subscriptions. Use daily pause passes when you want a temporary break from your selected focus settings.

Open Arrow from the toolbar, select a mode, adjust preferences, and save. When Chrome sync is enabled, Arrow keeps your non-sensitive preferences consistent across your Chrome browsers.

Arrow stores settings locally in Chrome and, when enabled, syncs only selected viewing preferences through Chrome Sync. It does not sell personal data or use analytics.

## Category

Productivity

## Single Purpose

Help people use YouTube intentionally by removing selected on-page distractions and managing focused viewing preferences.

## Primary Language

English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---:|---|---|
| Store Icon | 128×128 PNG | ✅ Ready | `assets/logo_v2.png` |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |

### Screenshot Notes

Show the Arrow popup alongside a desktop YouTube page with Shorts and recommendations hidden.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| `declarativeNetRequestWithHostAccess` | permissions | Redirects the YouTube routes a user has chosen to avoid. |
| `activeTab` | permissions | Lets Arrow act on the current YouTube tab when the user opens the extension. |
| `webNavigation` | permissions | Applies a selected redirect when YouTube changes routes without a full page load. |
| `storage` | permissions | Saves Arrow settings, daily-pause state, and small synced preferences. |
| `alarms` | permissions | Restores focus settings when a user’s temporary viewing pass expires. |
| `tabs` | permissions | Verifies and redirects the active YouTube tab during selected route changes. |
| `history` | permissions | Existing manifest permission; remove before submission unless a user-facing history feature is added. |
| `webRequest` | permissions | Existing manifest permission; remove before submission unless a user-facing request feature is added. |
| `declarativeNetRequest` | permissions | Maintains Arrow’s YouTube redirect rules selected by the user. |
| `notifications` | permissions | Shows confirmation when a user changes an Arrow setting. |
| `scripting` | permissions | Existing manifest permission; remove before submission unless a user-invoked scripting feature is added. |
| `identity` | permissions | Lets a user explicitly connect their Google account for Chrome identity status. |
| `identity.email` | permissions | Shows the signed-in Chrome email address in Arrow’s Sync status area. |
| `<all_urls>` | host_permissions | Existing overlay notification script; narrow this permission before submission if notification support can be limited to a smaller set of sites. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes — selected YouTube viewing preferences and daily-pause settings are stored in Chrome. When Chrome Sync is enabled, only those non-sensitive preferences are transmitted by Chrome Sync to the user’s other Chrome browsers. Arrow has no Arrow-operated backend.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personally identifiable info | No | No | The profile email is displayed but not stored by Arrow. | No |
| Authentication info | No | No | OAuth tokens remain managed by Chrome and are not stored by Arrow. | No |
| User activity | Yes | Chrome Sync only | Retains selected focus preferences and daily-pause settings. | No |
| Web history | No | No | Arrow does not read or store browsing history. | No |
| Website content | No | No | Arrow does not collect page content. | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL:** Required before submission — publish a policy that matches the above disclosure.

## Distribution

**Visibility:** Public
**Regions:** All regions

## Developer Info

**Publisher Name:** Required before submission

**Contact Email:** Required before submission

## Version History

| Version | Date | Changes | Status |
|---|---|---|
| 0.1 | 2026-11-06 | Added identity-aware sync preferences and separate development/Store package targets. | Draft |

## Review Notes

### Known Issues / Limitations

Upload `dist/arrow-web-store-draft.zip` as an unpublished draft first. Copy the
Package-tab public key into the source manifest, then create one Chrome
Extension OAuth client for the assigned Item ID and use that client ID for both
development and Store packages. Before submission, remove any unused
permissions listed above and narrow host access where feasible.
