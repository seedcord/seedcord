# packages/cli — Code Quality Audit

**Audited:** 2026-05-24
**Surface:** packages/cli/src/\*\*
**Files scanned:** 28 (src) + 2 (tests) + 1 (bin)

---

## HIGH Severity (block merge)

### H1 — `DevRunner` runs `process.on('SIGINT' | 'SIGTERM')` on every session start without bounded cleanup

**Location:** `packages/cli/src/commands/dev/DevRunner.ts:103-112`
**Rule:** Memory leaks / process management (AGENTS.md, SKILL).
**Problem:** `SeedcordDevSession.start()` registers a fresh `SIGINT`/`SIGTERM` listener pair on every invocation. The listeners only deregister via the `cleanup` callback path; if `stop()` is called from outside (which it is — `DevRunner.quit/restart/disconnect` all call `currentSession?.stop()`), `stopResolve?.()` is invoked but `cleanup` is `stopResolve`, so the listeners are removed only on the natural signal path. However, `start()` never enters the inner `Promise` block on error (the `try` throws before line 103). Combined with `DevCommand.ts:56` adding _another_ unbounded `SIGINT` handler per `register` call, Node's MaxListenersExceededWarning will fire after ~10 dev restarts.
**Fix:** Hoist the signal wiring into `DevCommand` once (or `DevRunner.run`) and rely on a single listener that delegates to the current session via `this.currentSession?.stop()`. Drop the per-session `process.on` block entirely.
**Auto-fixable:** no

### H2 — `DevCommand` registers a duplicate `SIGINT` handler that races with `SeedcordDevSession`

**Location:** `packages/cli/src/commands/dev/DevCommand.ts:56-58`
**Rule:** Process management / fail-fast.
**Problem:** `DevCommand.action` adds an additional `process.on('SIGINT', …)` _every_ time `.action` runs (commander invokes it once, but the handler is never removed). Combined with `SeedcordDevSession.start()` (H1), the same Ctrl-C triggers both `runner.quit()` _and_ `cleanup()` race-ily; with `exitOnCtrlC: false` on the Ink renderer, this is the only signal path, and double-invocation can call `quit()` before `dispose()` finishes flushing the vite watcher.
**Fix:** Register the SIGINT handler exactly once and remove it on `waitUntilExit()`. Or stop swallowing SIGINT in Ink and let Ink's exit flow drive cleanup.
**Auto-fixable:** no

### H3 — `TscRunner` spawns `tsc` with `shell: true`, exposing argv to shell-metacharacter injection

**Location:** `packages/cli/src/commands/dev/TscRunner.ts:26-30`
**Rule:** Security — command injection via unsanitised argv.
**Problem:** `shell: true` causes Node to invoke `/bin/sh -c "tsc ... --project <tsconfigPath>"`. `tsconfigPath` comes from `ResolvedSeedcordDevConfig.tsconfig` which is `resolve(root, config.hmr.tsconfig)` — a user-controlled value from the project's `seedcord.config.ts`. A path containing `;`, `$(…)`, `` ` ``, or even an embedded space + flag (`tsconfig.json --some=evil`) will be shell-interpreted. `cwd` is the config-file directory but the arg is appended verbatim. In a multi-user repo or CI runner cloning untrusted projects, this is a code-execution surface.
**Fix:** Drop `shell: true`. Spawn `tsc` directly using the project-local `typescript/bin/tsc` path (see how `TypeScriptProjectBuilder.resolveProjectTsc` already does this), launching via `process.execPath` like the build path does — that way no shell, no PATH lookup, no argv splitting.
**Auto-fixable:** no

### H4 — `TscRunner.stop()` uses `kill()` (SIGTERM) with no escalation; child can wedge on graceful exit

**Location:** `packages/cli/src/commands/dev/TscRunner.ts:64-70`
**Rule:** Process management — guarantee teardown.
**Problem:** `tsc --watch` ignores SIGTERM when stdin is detached on some Node/Windows combos. `this.process = null` is set immediately, so a subsequent `start()` spawns a _second_ `tsc` while the first is still alive — orphaned watcher process. There is no `.unref()` and no SIGKILL fallback.
**Fix:** `await once(this.process, 'exit')` (with a timeout escalating to SIGKILL) before clearing the handle. Or `.unref()` and detach if you genuinely don't care.
**Auto-fixable:** no

### H5 — `DevCommand` swallows runner failures via floating `.catch` after `unmount()`

**Location:** `packages/cli/src/commands/dev/DevCommand.ts:36-49`
**Rule:** Error handling — no silent recovery.
**Problem:** The `void this.runner.run(actions).then(...).catch((error) => { this.logger.error(...); unmount(); process.exit(1); })` block calls `unmount()` _and_ `process.exit(1)`. Because `this.runner` is constructed with a `SilentLogger` (`DevCommand.ts:18`) but the catch logs via `this.logger` (the real one, label `CLI:Dev`), the stack will be printed AFTER `unmount()` — usually before Ink restores the terminal, but timing depends on Node's microtask order. More importantly, the surrounding `try/catch` at line 62 cannot catch this rejection because it's detached via `void`. Errors get reported but the _outer_ flow has no idea the runner died — `waitUntilExit()` will resolve normally after `unmount()`, and `process.exit(0)` at line 61 races with the `.catch`'s `process.exit(1)`.
**Fix:** Don't detach — await the runner inside the action handler. Or capture the rejection into a state variable that drives `waitUntilExit` to resolve with the correct exit code.
**Auto-fixable:** no

### H6 — `SeedcordDevSession.stop()` swallows startup-phase rejections without distinguishing abort from real failure

**Location:** `packages/cli/src/commands/dev/DevRunner.ts:126-132`
**Rule:** FAIL-FAST-RULES — `try { … } catch { /* ignore */ }` for genuine errors.
**Problem:** `await this.startupPromise` is wrapped in `try {} catch {}` with a comment "Ignore errors from aborted startup." But `startupPromise` rejects for _any_ reason — bot connection failure, lifecycle bug, plugin crash — and they are all swallowed identically. The user sees no error, only "Disconnected. Press r to restart."
**Fix:** Track abort via an `AbortController` (or an explicit `wasAborted` flag set by `instance.startup.abort()`). Re-throw any rejection that isn't the abort signal.
**Auto-fixable:** no

### H7 — `DevRunner.ts` disables `no-unnecessary-condition` file-wide

**Location:** `packages/cli/src/commands/dev/DevRunner.ts:1`
**Rule:** AGENTS.md — "Never file-wide or project-wide" eslint-disable.
**Problem:** `/* eslint-disable @typescript-eslint/no-unnecessary-condition */` at file head blocks the entire 286-line module. The rule catches `if (this.instance.startup)` when types say `startup?: { abort: () => void }` — exactly the case here at lines 122 and 134. Suppressing it file-wide hides every other narrowing bug going forward.
**Fix:** Remove the file-wide disable. Where the type says `?:` but you know runtime presence, either tighten the type (`startup: { abort } | undefined` is what it already is) and use `?.()` directly, or narrow with a guard. Lines 87, 122, 134 are all `instance.startup?` patterns that need no disable.
**Auto-fixable:** yes (delete the directive, audit fallout)

### H8 — `LogStore.scheduleUpdate` uses a misnamed constant as the debounce delay (30 ms, not "30 FPS")

**Location:** `packages/cli/src/ui/stores/LogStore.ts:80-101`
**Rule:** Code clarity / fail-fast.
**Problem:** `const TARGET_FPS = 30; setTimeout(…, TARGET_FPS)` is using the literal `30` as a millisecond delay. 30 ms ≈ 33 fps, so the numerical outcome is roughly correct, but the name lies and any future "let's bump to 60 fps" change (`TARGET_FPS = 60`) would _slow_ the loop, not speed it up. With a busy bot this drops up to 33 log batches per second, and during high-volume restart logs lines visibly lag.
**Fix:** Either replace with `const FRAME_INTERVAL_MS = Math.round(1000 / 30)` (clear) or use `setImmediate` / a `process.nextTick` micro-batch. Confirm 30 ms is actually the target.
**Auto-fixable:** no

---

## MEDIUM Severity

### M1 — `defineConfig`, `SEEDCORD_CONFIG_FILENAMES`, `SeedcordBuildConfig`, `SeedcordHmrConfig` from `src/index.ts` partially dead-exported

**Location:** `packages/cli/src/index.ts:1-7`
**Rule:** AGENTS.md — "Before adding `export` to a symbol, verify it is consumed outside the file."
**Problem:** External consumers only use `defineConfig` (1 reference: `mock/seedcord.config.ts`) and `SeedcordDevConfig` (transitively via `defineConfig`). `SEEDCORD_CONFIG_FILENAMES`, `SeedcordBuildConfig`, `SeedcordHmrConfig` are not imported by any package outside `packages/cli`.
**Fix:** Drop `SEEDCORD_CONFIG_FILENAMES` and the two unused config types from the public barrel. Keep `defineConfig` + `SeedcordDevConfig`. Move the rest to an internal-only path.
**Auto-fixable:** no

### M2 — `cli.ts` imports plain `commander` instead of the typed re-export

**Location:** `packages/cli/src/cli.ts:2`, `packages/cli/src/core/BaseCommand.ts:4`, `packages/cli/src/commands/build/BuildCommand.ts:7`, `packages/cli/src/commands/dev/DevCommand.ts:11`
**Rule:** Commander typing discipline.
**Problem:** The `tsconfig.json` `paths` alias rewrites `commander` → `@commander-js/extra-typings`, so the typed surface _is_ in use, but this is fragile: a future contributor who removes the alias, or any tool that doesn't honour `paths` (e.g. node-resolution by tsx if `paths` isn't loaded), will silently drop back to the untyped commander. The bin entry runs through tsx with no plugin honoring this alias.
**Fix:** Import explicitly from `@commander-js/extra-typings` everywhere. Drop the `paths` alias so the dependency is honest.
**Auto-fixable:** yes (rename imports)

### M3 — Commander subcommands declared as bare `program.command(...).action(...)` — no `.argument()`, `.option()`, no typed handler

**Location:** `packages/cli/src/commands/build/BuildCommand.ts:17-30`, `packages/cli/src/commands/dev/DevCommand.ts:21-67`
**Rule:** Commander typing discipline.
**Problem:** Neither subcommand exposes any flags or arguments, so the typed-commander surface gives no value today. But the action arrow `(async () => {...})` is untyped beyond `void`, and there is no obvious place to add `--config <path>` later without retrofitting the typed-builder pattern. Likely first feature request after launch.
**Fix:** Even a no-arg subcommand should use the typed chain (`.command('build').description(...).action(async () => {...})` already returns a `CommandWithExtraTypings<...>`). If you accept the current shape, add a comment explaining the bare action is intentional; otherwise add `--config <path>` now, since `ConfigLocator` already supports a custom base dir.
**Auto-fixable:** no

### M4 — `DevCommand` constructs `DevRunner` with a `SilentLogger`, but the catch block uses `this.logger` — divergent log channels

**Location:** `packages/cli/src/commands/dev/DevCommand.ts:18, 45, 63`
**Rule:** Logger usage consistency.
**Problem:** `DevRunner.create(new SilentLogger())` swallows all runner-level info/debug lines (e.g. `ConfigLoader.load`'s "Loaded configuration from X" at `ConfigLoader.ts:36-44`). Then `this.logger.error(...)` writes to a different channel. The user can never get "verbose dev startup" output even with `LOG_LEVEL=debug`. Inversely, `BuildCommand` passes `this.logger` (real). The inconsistency is unmotivated.
**Fix:** Pass `this.logger` (or a child logger) to `DevRunner.create`. The Ink UI mutes the console via `LogStore.mount({ muteConsole: true })`, so verbose runner logs will route through the log panel and the file sink instead of the terminal — that is the right outcome.
**Auto-fixable:** no

### M5 — `SeedcordDevSession.isSeedcordLike` performs `(candidate as SeedcordLike)[SeedcordBrand]` on `unknown`

**Location:** `packages/cli/src/commands/dev/DevRunner.ts:149-151`
**Rule:** AGENTS.md — type-narrow via guards, avoid casts.
**Problem:** The guard casts to `SeedcordLike` before reading the brand, defeating the point of the guard. Should index `(candidate as Record<PropertyKey, unknown>)[SeedcordBrand]` or check via `in` first.
**Fix:** ```ts
return typeof candidate === 'object' && candidate !== null && SeedcordBrand in candidate && [candidate as Record<PropertyKey, unknown>](SeedcordBrand) === true;

```
**Auto-fixable:** no

### M6 — Two stale string-includes in error remapping leak vite-error wording into user-visible errors
**Location:** `packages/cli/src/commands/dev/DevRunner.ts:64-69`
**Rule:** Fail-fast / error wrapping.
**Problem:** `if (message.includes('Does the file exist'))` is a brittle vite/module-runner string match. The next vite minor will change the phrasing and the branch becomes dead. Same applies to the generic fallback — the underlying file-not-found should be detected via the module runner's error code, not its English message.
**Fix:** Inspect for a structured error (`ERR_MODULE_NOT_FOUND`, `ENOENT`, or `Error.code`). Failing that, gate this behind `if (entryPath does not exist)` checked via `existsSync` *before* attempting load.
**Auto-fixable:** no

### M7 — `DevApp` is 176 lines of mixed orchestration, layout, keymap, and resize state — exceeds the 200-line guidance
**Location:** `packages/cli/src/ui/DevApp.tsx:36-176`
**Rule:** AGENTS.md — "Split large files (~200+ lines or multiple unrelated responsibilities)".
**Problem:** `// eslint-disable-next-line max-lines-per-function, max-statements` at line 36 acknowledges the smell. Ten `useState` calls plus two `useEffect` plus a `useInput` body of 56 lines tangle keymap dispatch, prompt management, and layout math.
**Fix:** Extract `useInput` body into a `useDevAppKeymap` hook. Extract terminal-resize state into a `useTerminalSize` hook. Collapse the 10 `useState`s into a `useReducer` (the skill's "5+ related useState" rule).
**Auto-fixable:** no

### M8 — `useState(stdout.rows || …)` initializes from a prop-like value with no sync if it changes
**Location:** `packages/cli/src/ui/DevApp.tsx:51-52`
**Rule:** REACT19 — `useState(propValue)` without sync.
**Problem:** Initialized once, then only mutated by the `resize` listener at line 60. If `stdout` is swapped (re-render with different stdout) those values stay stale. In practice Ink's stdout is stable per render-tree, so this is mostly safe — but the antipattern still applies, and the `|| DEFAULT_ROWS` fallback is `||` not `??` so 0 columns (an EOF terminal) becomes 80, which may hide a real failure.
**Fix:** Use `??` instead of `||` and assert `stdout` non-nullish at the top (Ink guarantees it). Drop the eslint disable on line 57.
**Auto-fixable:** partial (`||` → `??`)

### M9 — `useLogs` performs `.filter` over potentially 1000 entries on every render
**Location:** `packages/cli/src/ui/hooks/useLogs.ts:24-27`, `packages/cli/src/ui/stores/LogStore.ts:66`
**Rule:** `.filter` chains / perf.
**Problem:** `LogStore.MAX_LOGS = 1000`; `useLogs` filters by channel on every change event (re-renders the panel ~30 times/sec under load). `LogStore.getLogs(channel)` *also* filters — same work twice. The duplicate is wasted because `useLogs` ignores the optional `channel` param of `getLogs` and filters in the component instead.
**Fix:** Push channel filtering into the store and memoise. Or, simpler: keep an index `Map<string, LogEntry[]>` and trim per channel.
**Auto-fixable:** no

### M10 — `BootstrapWriter.formatImportPath` reassigns parameter (mutation-style) using `let`
**Location:** `packages/cli/src/commands/build/BootstrapWriter.ts:29-33`
**Rule:** TypeScript/style.
**Problem:** Minor: prefer immutable transformation. `const normalized = fragment.replace(/\\/g, '/').replace(/^(?!\.)/, './')` is one-liner. Reads cleaner.
**Fix:** Use a one-line `const`.
**Auto-fixable:** yes

### M11 — `TypeScriptProjectBuilder.runProcess` does not propagate `signal` for cancellation
**Location:** `packages/cli/src/commands/build/builder/TypeScriptProjectBuilder.ts:110-130`
**Rule:** Process management.
**Problem:** `spawn` is called without an `AbortSignal`. If the user Ctrl-C's during `seedcord build`, the `tsc` child keeps running because the parent's signal handler isn't wired to kill it. The bin entry's top-level catch only logs.
**Fix:** Plumb an `AbortSignal` from `BuildRunner` down into `runProcess` and pass to `spawn`. The current shape is reasonable for short builds, but a 60-second `tsc` makes this annoying.
**Auto-fixable:** no

### M12 — `ConfigLoader.unwrapConfig` is a hand-rolled validator with 11 manual `throw new SeedcordError` lines; should use Zod or a structural schema
**Location:** `packages/cli/src/core/config/ConfigLoader.ts:55-103`
**Rule:** PREVENT-REINVENTION / OOP.md.
**Problem:** The validator already required `// eslint-disable-next-line complexity, max-statements`. Each new optional field will grow this further. Existing repo deps include no validator, but the framework uses `envapt`; this is a separate concern. The current shape is correct but inflexible. If validation requirements grow (e.g. `hmr.restart` patterns), the pattern won't scale.
**Fix:** Accept short-term as-is, but document that any third config field will trigger an adoption of `zod`. Today: nothing to change beyond clarifying intent in a doc comment.
**Auto-fixable:** no

### M13 — `ConfigLoader.unwrapConfig` accepts `null` prototype objects via `typeof === 'object'` but does not check `Array.isArray(cfg)`
**Location:** `packages/cli/src/core/config/ConfigLoader.ts:58-61`
**Rule:** Fail-fast.
**Problem:** `typeof [] === 'object'`, so a `defineConfig([])` (or a typo `export default [config]`) passes the first guard and then fails at `cfg.instance` with `CliConfigMissingInstance` — misleading. Same for class instances.
**Fix:** Add `Array.isArray(resolved)` and "plain object" checks. Or reject anything where `Object.getPrototypeOf(resolved) !== Object.prototype` once the user-facing API stabilises.
**Auto-fixable:** no

### M14 — `HmrPlugin.handleFileEvent` and `HmrPlugin.hotUpdate` share a single `lastUpdate` field — debounce collides across event types
**Location:** `packages/cli/src/commands/dev/runtime/HmrPlugin.ts:28, 82, 110`
**Rule:** Concurrency / correctness.
**Problem:** A rapid `create` then `update` to the same file within 250 ms will *drop* the update (or the create) because the same `lastUpdate.file` matches and the timestamp window suppresses the second event. The intent is per-event-type debouncing.
**Fix:** Key the cache by `${file}::${type}` or use two separate `Map`s. Better, hold a `Map<string, number>` and prune.
**Auto-fixable:** no

### M15 — `HmrPlugin.getAffectedModules` traverses importers but emits even unrelated environments
**Location:** `packages/cli/src/commands/dev/runtime/HmrPlugin.ts:202-216`
**Rule:** Correctness.
**Problem:** No environment filter — modules from the client environment (if any plugin opts in) would be enumerated alongside SSR. Currently no client env is active, so impact is theoretical, but `ViteDevRuntime` explicitly mentions ssr. Tests use `environment: 'client'` (`hmr.test.ts:178`), so the assumption isn't enforced.
**Fix:** Skip nodes whose `environment !== 'ssr'`. Or assert it.
**Auto-fixable:** no

### M16 — `ViteDevRuntime.handleInvalidate` builds a moduleId via `/${relative(root, file)}` — wrong on Windows
**Location:** `packages/cli/src/commands/dev/runtime/ViteDevRuntime.ts:55-65`
**Rule:** Cross-platform.
**Problem:** `relative()` on Windows returns `src\foo.ts`; the moduleId then becomes `/src\foo.ts`, which won't match vite's internal id (vite normalises to forward slashes). Same issue at `ViteDevRuntime.ts:91-92`. Affects HMR invalidation on Windows only.
**Fix:** Pipe through `.replace(/\\/g, '/')` (and do not duplicate the leading slash if already absolute-looking).
**Auto-fixable:** yes

### M17 — `setTimeout` in `DevCommand.ts:41` is a "wait for logs to flush" hack
**Location:** `packages/cli/src/commands/dev/DevCommand.ts:41`
**Rule:** AGENTS.md — "Zero Technical Debt".
**Problem:** `await new Promise((resolve) => setTimeout(resolve, 1000))` is a hard-coded flush delay before `unmount()`. The LogStore explicitly knows when its buffer is drained (`pendingUpdate` flag). Wait on that instead.
**Fix:** Add `LogStore.instance.flush()` returning a `Promise` that resolves when `pendingUpdate === false && buffer.length === 0`. Replace the 1-second sleep.
**Auto-fixable:** no

### M18 — `DevApp` magic constant `staticOverhead = 13` with no comment, plus `+ 4` and `+ 5` ink-row offsets
**Location:** `packages/cli/src/ui/DevApp.tsx:72-78`
**Rule:** CODE-COMMENTING-GUIDELINES — non-obvious magic numbers.
**Problem:** Banner ~10 rows + statusline + padding ≈ 13 rows is recoverable only by reading every child component. Easy to break when adding a UI element.
**Fix:** Either name the constants (`BANNER_ROWS`, `STATUS_ROWS`, `ERROR_HEADER_ROWS`) or measure dynamically via Ink's `measureElement`.
**Auto-fixable:** no

### M19 — `Banner` references `chalk` *and* the Ink `<Text color="…">` — double-styling pathway
**Location:** `packages/cli/src/ui/components/Banner.tsx:28-39`
**Rule:** UI consistency.
**Problem:** Inline `chalk.dim(...)` strings inside `<Text>` work because Ink concatenates ANSI strings, but mixing chalk (which embeds ANSI) with Ink's structured `<Text color>` makes overflow/wrap behaviour inconsistent — Ink can't measure ANSI-escaped runs as precisely. Prefer pure `<Text dimColor>...</Text>` wrappers.
**Fix:** Replace `chalk.dim(formatFilePath(...))` with a `<Text dimColor>` child.
**Auto-fixable:** no

### M20 — `BaseCommand` is an abstract class with one abstract method and three readonly fields — borderline OOP
**Location:** `packages/cli/src/core/BaseCommand.ts:6-18`
**Rule:** OOP.md — small classes are fine; this one is justifiable. Flagged as low-conf.
**Problem:** With only `BuildCommand` and `DevCommand` extending it, and zero behaviour beyond constructing a `Logger`, this class is approaching "namespace as class" territory. Not currently a violation; revisit if a third subcommand is added without sharing logic.
**Fix:** Leave as-is for now; add a `// keep until 3rd subcommand confirms shape` note.
**Auto-fixable:** no

### M21 — `ChannelSelector.useInput` uses arrow-key wrap with `prev === 0` check — fine, but `c` to close conflicts with `c` to open in `DevApp`
**Location:** `packages/cli/src/ui/components/ChannelSelector.tsx:24-28`, `packages/cli/src/ui/DevApp.tsx:124-127`
**Rule:** UX correctness.
**Problem:** `DevApp` checks `if (showChannels) return;` at line 95 to avoid double-handling, so this works. But the `c`-to-close inside `ChannelSelector` is order-dependent: useInput in both components fires; the parent's `early return` saves it. Brittle. A future refactor that drops the early-return would silently re-open the selector.
**Fix:** Bind close only to `escape` (already wired) and document the contract. Or use Ink's `isActive` option on `useInput`.
**Auto-fixable:** no

### M22 — Test `config-loader.test.ts` uses `as never` casts to bypass DevRunner's typed constructor
**Location:** `packages/cli/tests/config-loader.test.ts:93`, `packages/cli/tests/config-loader.test.ts:97`
**Rule:** AGENTS.md — tests may use `as unknown as T` with justification, not `as never`.
**Problem:** `as never` is a black hole — disables every type check. `@ts-expect-error accessing private method` is fine; the `as never` next to it is unjustified.
**Fix:** Use `as unknown as ConfigLocator` / `as unknown as ConfigLoader` with a comment, or build a `Partial<T>` test double helper.
**Auto-fixable:** no

---

## LOW Severity

### L1 — `accentA`/`accentB` defined as `chalk.hex(...).bold` constants in `shared.ts` for one consumer
**Location:** `packages/cli/src/ui/components/shared.ts:7-8`, used only in `Banner.tsx:18-21`
**Rule:** Dead code / pre-extraction.
**Problem:** "shared" implies reuse; only `Banner` uses these. `accents` object is used twice (here + `StatusLine.tsx:5,20`), but the formatted-chalk wrappers aren't shared.
**Fix:** Inline `accentA/accentB` into `Banner.tsx`, keep only `accents` in `shared.ts`.
**Auto-fixable:** no

### L2 — `Help` component has `HELP_HEIGHT = 8` colocated as a value export — magic offset coupling
**Location:** `packages/cli/src/ui/components/Help.tsx:52`, used in `DevApp.tsx:74`
**Rule:** Coupling.
**Problem:** Help renders 6 lines + box chrome, which equals 8 by current chrome but breaks if the help text grows. Better to measure with `measureElement` on render.
**Fix:** Optional; acceptable for now.
**Auto-fixable:** no

### L3 — `LogStore` is a singleton via `LogStore.instance` getter — fine, but `_instance` private static is leakage-prone in HMR
**Location:** `packages/cli/src/ui/stores/LogStore.ts:17, 30-33`
**Rule:** OOP.md.
**Problem:** Module-level singletons survive HMR but Ink remounts re-call `mount()`; the early-return at line 36 prevents double install. Acceptable. The only concern: in tests, no `reset()` is exposed.
**Fix:** Add `LogStore.reset()` for tests.
**Auto-fixable:** no

### L4 — `SilentLogger` is a stub class with 7 no-op methods; `LoggerChannelRegistry` already exposes a silent mode
**Location:** `packages/cli/src/utils/SilentLogger.ts`
**Rule:** PREVENT-REINVENTION.
**Problem:** If `@seedcord/services` exposes a silent / null logger, prefer that. Even if not, the class is single-use (DevCommand:18); inline as `{ error() {}, warn() {}, … }`.
**Fix:** Check `@seedcord/services` for a null logger; otherwise leave.
**Auto-fixable:** no

### L5 — TSDoc gaps on `DevRuntime` interface methods
**Location:** `packages/cli/src/commands/dev/runtime/DevRuntime.ts:43-60`
**Rule:** CODE-COMMENTING-GUIDELINES.
**Problem:** Methods documented; `refreshCommands?(shouldRefresh)` has no doc on what `shouldRefresh = false` semantically means (no-op? abort? defer?).
**Fix:** Clarify the parameter in a one-liner.
**Auto-fixable:** no

### L6 — `version` export from `index.ts` does fallback `?? '0.0.0'`; should fail-fast or surface clearly
**Location:** `packages/cli/src/index.ts:12`
**Rule:** FAIL-FAST-RULES.
**Problem:** `process.env.PACKAGE_VERSION ?? '0.0.0'` will report 0.0.0 in dev. Logs `cli.ts:16` consume this in `--version`. Document or warn when fallback triggers.
**Fix:** Acceptable; document the fallback path.
**Auto-fixable:** no

### L7 — `bin/seedcord.mjs` swallows tsx import errors silently
**Location:** `packages/cli/bin/seedcord.mjs:18-22`
**Rule:** Fail-fast.
**Problem:** Errors are logged via `console.error` and `process.exitCode = 1`. Fine for now. The `// eslint-disable-next-line no-console` is the only console use in the package, justifiably.
**Fix:** None.
**Auto-fixable:** no

---

## Test Coverage Gaps

### Missing tests

- `packages/cli/src/commands/dev/TscRunner.ts` — spawn lifecycle, stop behaviour, stderr forwarding. Currently zero coverage on a process-spawning class. The `shell: true` security finding (H3) would have a test gate it.
- `packages/cli/src/commands/dev/runtime/ViteDevRuntime.ts` — start/dispose teardown, double-`start` rejection, `loadEntry` before `start` (the inline `throw new Error('ViteDevRuntime.start() must be called before loadEntry()')` should use a `SeedcordError`). No tests at all.
- `packages/cli/src/commands/build/BuildRunner.ts` — end-to-end build path (integration), tsconfig discovery fallback, emitted-entry resolution.
- `packages/cli/src/commands/build/builder/BootstrapWriter.ts` — Windows path separators, deeply nested out dirs.
- `packages/cli/src/core/config/ConfigLocator.ts` — locate-failure error message, multi-candidate ordering.
- `packages/cli/src/core/config/ConfigLoader.ts` — entry-outside-root rejection, build override merging, tsconfig resolution. Existing tests cover only missing-field branches.
- `packages/cli/src/ui/stores/LogStore.ts` — debounce/flush ordering, channel-scoped clear, MAX_LOGS trimming.
- `packages/cli/src/utils/resolveDefaultExport.ts` — cycle handling (already coded against), nested re-export chains.

---

## HMR Plumbing Review

The HMR lifecycle is mostly sound but has three teardown weaknesses. `HmrPlugin` (`packages/cli/src/commands/dev/runtime/HmrPlugin.ts:57-77`) registers four chokidar listeners on `server.watcher` and two `hot.on` handlers on `server.environments.ssr.hot`, but no `dispose()` method removes them — teardown relies entirely on `server.close()` collapsing the underlying watcher. That works for the steady-state case, but `ViteDevRuntime.dispose()` (`ViteDevRuntime.ts:111-119`) only calls `viteServer.close()` and nulls its handles — `hmrPlugin` is never told to detach, and `HmrPlugin.emit` listeners attached via `hmrPlugin.on('invalidate', …)` (`ViteDevRuntime.ts:47-49`) are never `off`'d. If a `DevRunner` session restarts within the same process (which the `while (true)` loop in `DevRunner.run` enables), each cycle attaches a fresh listener pair, since `ViteDevRuntime` is re-constructed per session (`DevRunner.ts:228`). The plugin itself is also rebuilt, so the leak is bounded — but a future refactor that pools `ViteDevRuntime` will leak. `HmrPlugin.dynamicRestartPatterns` (`HmrPlugin.ts:30`) persists for the plugin's lifetime: across a restart triggered by `register-critical-files`, patterns from the previous run live on in the new server only if the plugin is reused (it isn't today). The debounce key bug (M14) and Windows path bug (M16) are the only correctness issues. Tests cover happy-path debounce and circular-dep traversal but no teardown — adding a `dispose()` on `HmrPlugin` and asserting listener counts before/after would close the gap.

---

## Public API Surface

### Exports that should be `internal.index.ts` only

- `SEEDCORD_CONFIG_FILENAMES` from `packages/cli/src/index.ts:3` — only used internally by `ConfigLocator.ts:7`.
- `SeedcordBuildConfig` from `packages/cli/src/index.ts:4` — only internal; external consumers only pass a `SeedcordDevConfig` (which references it transitively).
- `SeedcordHmrConfig` from `packages/cli/src/index.ts:6` — only internal; same reasoning.

(All three remain reachable to external typing via `SeedcordDevConfig`'s `build?: SeedcordBuildConfig` and `hmr?: SeedcordHmrConfig` fields — TypeScript will inline them, so dropping the explicit export does not break inference for `defineConfig`.)

### Confirmed external consumers

- `defineConfig` — `mock/seedcord.config.ts:1` (and any future user config).
- `HmrUpdateEvent`, `HmrAware`, `HmrEventType` (from `@api/Hmr`) — heavily consumed by `packages/seedcord/src/{hmr,bot,effects,interfaces}` and `packages/plugins/src/{mongo,kysely-pg}`. Keep `export type * from '@api/Hmr'` as-is.
- `version` — used by `cli.ts:7,16`. Trivially export.

### Missing exports

None observed — the framework gets all the HMR types it needs.

---

## Summary

- HIGH: 8
- MEDIUM: 22
- LOW: 7
- Test gaps: 8

**Most common antipattern:** unbounded resource lifecycle — repeated `process.on` registration, missing `dispose()` symmetry on listeners (Ink effects, HmrPlugin), and ad-hoc `setTimeout` flush waits instead of explicit "done" signals. The CLI's session-per-cycle architecture papers over leaks today but will break the first time a process or runtime is reused across iterations.
```

### Missing exports

None observed — the framework gets all the HMR types it needs.

---

## Summary

- HIGH: 8
- MEDIUM: 22
- LOW: 7
- Test gaps: 8

**Most common antipattern:** unbounded resource lifecycle — repeated `process.on` registration, missing `dispose()` symmetry on listeners (Ink effects, HmrPlugin), and ad-hoc `setTimeout` flush waits instead of explicit "done" signals. The CLI's session-per-cycle architecture papers over leaks today but will break the first time a process or runtime is reused across iterations.
