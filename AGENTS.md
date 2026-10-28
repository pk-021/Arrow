# Arrow contributor protocol

Before starting any task, read `docs/agent-status.md`, then the relevant file
under `docs/specs/`. Treat those documents as the current contract.

For every user-requested product or behavior change:

1. Update the applicable specification first, including its verification case.
2. Update `docs/agent-status.md` with a concise status, current activity, and
   next plan before editing implementation files.
3. Implement only the behavior described by the updated specification.
4. Run the relevant checks, then update the status document with the outcome.

Do not overwrite unrelated user work. Changes to persisted data must retain
backwards-compatible reads and use the central state-commit contract.

## Product context

Arrow is a Chrome extension that helps people use YouTube intentionally by
removing distractions. Its intended website scope is YouTube, and user data is
stored locally for now. Design and implementation decisions should support
Chrome Web Store publication and follow the current Chrome extension policies.

For hiding YouTube elements, prefer small, targeted CSS rules in
`css/content.css` when CSS can express the behavior reliably. Before adding or
changing selectors, inspect the actual desktop YouTube DOM and use the elements,
attributes, and route structures that YouTube currently renders. Check the
affected YouTube surfaces and make sure unrelated content remains usable.

The extension UI should feel native and seamless: clean, intentional, and
distinctive. Monkeytype and Apple products are visual references for clarity,
restraint, polish, and character, not templates to copy. Keep the existing
specifications and verification cases as the source of truth for behavior.
