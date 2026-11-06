# Persistence and lifecycle contract

## Goal

Arrow settings are durable shared state. Any extension surface may be opened
more than once; a popup may be closed, backgrounded, discarded, or resumed
while another surface is saving. A browser or service worker restart must not
silently discard an acknowledged change.

## Authoritative commit path

Only the service worker commits persistent product state. Extension pages and
content scripts submit `arrow:commit` messages with a partial patch. The worker
serializes requests, reads the latest state immediately before each commit, and
writes the patch, mode metadata, and a monotonically increasing
`arrow_state_revision` in one `chrome.storage.local.set` operation.

The worker records `arrow_pending_transaction` before writing. It clears that
record only after the commit succeeds. On service-worker startup it either
clears an already-applied transaction or idempotently reapplies it. This makes
the storage commit recoverable across worker suspension or browser shutdown.

`chrome.storage.local` is the durable source of truth; UI memory and
`sessionStorage` are never authoritative. A surface refreshes from storage on
`storage.onChanged`, so passive or power-saved tabs converge when they resume.

## Synced preferences

Arrow keeps product state and recovery journals in `chrome.storage.local`, but
also mirrors the small, non-sensitive preference subset to `chrome.storage.sync`
under the single `arrow_sync_preferences` key. The envelope contains the schema
version, an update timestamp, and only display/behavior preferences: Arrow mode
metadata, feature toggles, daily allowance, and theme. It never contains a
password, authentication token, pending transaction, state revision, or an
active-session record.

Before a sync write the worker serializes the entire envelope and rejects it if
it is at least 8 KB or would bring sync-area use to 100 KB. A failed sync write
does not roll back the acknowledged local commit: it is reported as a sync
status error and the local setting remains usable. Callback-based sync writes
read `chrome.runtime.lastError` before reporting success. At startup, and on a
`storage.onChanged` event whose area is `sync`, the worker validates a remote
envelope and applies its preference patch through the same serialized local
commit path. Local-to-sync mirroring is suppressed for that remote application
to prevent a feedback loop.

The sync status is a derived, non-authoritative UI value. It reports whether
Chrome sync is available, the profile email when Chrome provides it, and the
latest local error. It is not persisted as account data.

## Extension identity and package targets

Arrow’s initial Store-draft ZIP removes the local development key so the Chrome
Web Store can assign an Item ID and publish its public key. The developer
replaces the local manifest key with that public key. Thereafter, both the
unpacked-development and Store builds retain that fixed key, giving development
and production one extension ID and one Chrome Sync namespace. Arrow has no
OAuth client, scopes, token requests, or client secret.

## Consistency rules

- A commit patch is all-or-nothing at the storage boundary: its data, mode
  snapshot, and revision are written together.
- The worker never replaces settings with a stale full document. It overlays a
  patch on the latest stored state while serialized.
- `arrow_mode` is written with each mode-affecting commit and is the canonical
  UI read. A reader derives a mode from booleans only when that metadata is
  missing or invalid, preventing equivalent presets from being relabelled.
- Switching from an enabled mode to Off preserves the preceding canonical mode
  and its settings snapshot in `arrow_mode_before_off`. Turning Arrow back on
  restores that saved state in the same worker-owned commit, so an Off cycle
  cannot silently relabel Minimal, High Focus, or Custom as another mode.
- Missing defaults are added without replacing saved values. Startup removes
  retired website-blocking storage values and generated dynamic rules. Other
  dynamic redirect rules remain a derived projection of durable storage.

## Lifecycle behavior

The worker has no in-memory-only state required for correctness. Its queue is a
performance aid; the pending transaction is recovery state. Message handlers
return an asynchronous response to keep the worker alive through a commit.
Callers show success only after the response confirms durable storage. Failures
leave the UI’s unsaved draft intact and present an actionable error.

## Compatibility and limits

The protocol supports future schema migration by retaining unknown keys and
adding defaults only when absent. `chrome.storage.local` provides atomic writes
per `set`; browser extension APIs do not offer a distributed transaction with
declarative-network rules. Therefore Arrow guarantees atomic durable settings
commits and idempotent, eventually reconciled rule projection rather than
claiming a cross-API transaction.

Session keys are part of the same revisioned local-storage commit contract. Starting and skipping run in the worker commit queue, so simultaneous popup actions cannot overspend the daily allowance. A skipped session keeps its spent minutes. The local calendar date determines refill; older stores without session fields read as a fresh day. The worker reprojects redirect rules on startup and on its deadline alarm.
