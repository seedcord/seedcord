# @seedcord/cli

## 0.1.0

### Minor Changes

- 5a529d5: Redesign the `seedcord dev` dashboard and harden its lifecycle.
    - Two-column bottom-up layout: a left rail with the wordmark, phase status, a channel filter, and the hotkey legend, beside a wide log column. Logs are frameless, tail from the bottom, and scroll back through the buffer with the arrows, PgUp/PgDn, and t/b.
    - Channels are a live enable/disable filter rather than one-at-a-time switching, and each log line shows a colored channel tag. The status badge animates while running and shows CLI-computed uptime; the log directory is shown in the rail.
    - Notifications render as cards below the logs: an error card with a bounded stack, a restart-required card, and the y/n command-refresh prompt.
    - The UI renders in the alternate screen, so the terminal and its scrollback are restored on quit, and the on-disk log path is printed on exit. Ctrl-C and `q` always quit, restart and disconnect are idempotent, `d` is a no-op when no session is running, and the Vite runtime detaches its HMR listeners on dispose.
    - Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.

- fe77998: bump `ink` `^6.6.0` → `^7.0.4`. requires react 19.2+ and node 22+.
- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 2c4201b: Bump `commander` and `@commander-js/extra-typings` to v15.
- 7308d36: `seedcord build` now emits self-contained source maps (`--sourceMap --inlineSources`), so production stack traces resolve back to the original TypeScript. Run the built output with `node --enable-source-maps`.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/services@0.7.0
    - @seedcord/types@0.4.0
    - @seedcord/utils@0.4.0

## 0.1.0-next.0

### Minor Changes

- 5a529d5: Redesign the `seedcord dev` dashboard and harden its lifecycle.
    - Two-column bottom-up layout: a left rail with the wordmark, phase status, a channel filter, and the hotkey legend, beside a wide log column. Logs are frameless, tail from the bottom, and scroll back through the buffer with the arrows, PgUp/PgDn, and t/b.
    - Channels are a live enable/disable filter rather than one-at-a-time switching, and each log line shows a colored channel tag. The status badge animates while running and shows CLI-computed uptime; the log directory is shown in the rail.
    - Notifications render as cards below the logs: an error card with a bounded stack, a restart-required card, and the y/n command-refresh prompt.
    - The UI renders in the alternate screen, so the terminal and its scrollback are restored on quit, and the on-disk log path is printed on exit. Ctrl-C and `q` always quit, restart and disconnect are idempotent, `d` is a no-op when no session is running, and the Vite runtime detaches its HMR listeners on dispose.
    - Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.

- fe77998: bump `ink` `^6.6.0` → `^7.0.4`. requires react 19.2+ and node 22+.
- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 2c4201b: Bump `commander` and `@commander-js/extra-typings` to v15.
- 7308d36: `seedcord build` now emits self-contained source maps (`--sourceMap --inlineSources`), so production stack traces resolve back to the original TypeScript. Run the built output with `node --enable-source-maps`.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/services@0.7.0-next.0
    - @seedcord/types@0.4.0-next.0
    - @seedcord/utils@0.4.0-next.0
