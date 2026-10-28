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

## Consistency rules

- A commit patch is all-or-nothing at the storage boundary: its data, mode
  snapshot, and revision are written together.
- The worker never replaces settings with a stale full document. It overlays a
  patch on the latest stored state while serialized.
- `arrow_mode` is written with each mode-affecting commit and is the canonical
  UI read. A reader derives a mode from booleans only when that metadata is
  missing or invalid, preventing equivalent presets from being relabelled.
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
