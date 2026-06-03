---
'@seedcord/cli': minor
---

Redesign the `seedcord dev` dashboard and harden its lifecycle.

- Two-column bottom-up layout: a left rail with the wordmark, phase status, a channel filter, and the hotkey legend, beside a wide log column. Logs are frameless, tail from the bottom, and scroll back through the buffer with the arrows, PgUp/PgDn, and t/b.
- Channels are a live enable/disable filter rather than one-at-a-time switching, and each log line shows a colored channel tag. The status badge animates while running and shows CLI-computed uptime; the log directory is shown in the rail.
- Notifications render as cards below the logs: an error card with a bounded stack, a restart-required card, and the y/n command-refresh prompt.
- The UI renders in the alternate screen, so the terminal and its scrollback are restored on quit, and the on-disk log path is printed on exit. Ctrl-C and `q` always quit, restart and disconnect are idempotent, `d` is a no-op when no session is running, and the Vite runtime detaches its HMR listeners on dispose.
- Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.
