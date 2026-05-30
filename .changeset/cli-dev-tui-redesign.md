---
'@seedcord/cli': minor
---

Redesign the `dev` dashboard and harden its lifecycle.

- Phase-aware status badge plus an always-visible hotkey footer; the separate help panel and its `h` key are removed (the footer replaces them). Errors render with a bounded stack above the live logs instead of pushing the layout around.
- Reliable teardown: Ctrl-C and `q` always quit, restart/disconnect are idempotent, the Vite runtime detaches its HMR listeners on dispose, and `d` is a no-op when no session is running.
- Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.
