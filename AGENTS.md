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
