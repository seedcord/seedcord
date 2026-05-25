# Framework Packages — Code Quality Audit

**Audited:** 2026-05-24
**Surface:** `packages/{seedcord,services,utils,types,plugins,docs-engine,docs-generator,eslint-config,tsup-config}/src/**`
**Files scanned:** 194 source `.ts`/`.mts` files (test files excluded)

---

## HIGH Severity (block merge)

### H1 — `typeof` class comparison is always true; non-DatabaseError errors get called with a UUID [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/utilities/errors/throwCustomError.ts:38`
**Rule:** correctness; OOP — runtime identity vs `typeof`.
**Problem:** `if (typeof CustomError === typeof DatabaseError)` reduces to `'function' === 'function'`, which is _always_ true. As a consequence every caller of `throwCustomError(err, msg, AnyCustomErrorSubclass)` runs the DatabaseError-only branch (`new CustomError(errorMessage, uuid)`), passing a UUID as the second arg to constructors that don't accept it. The `@WrapDatabaseError` decorator in `packages/plugins/src/shared/WrapDatabaseError.ts` is the only current caller, so the bug is latent — but the public utility is exported and documented, and a non-DatabaseError caller will silently break.
**Fix:** Replace with an identity check on the constructor reference: `if (CustomError === DatabaseError) { ... }`. Verify with a unit test that passes a non-DatabaseError class and asserts the constructor receives only the message.
**Auto-fixable:** no.

### H2 — `fetchGuildMember` swallows every error and rebrands it as "not in guild" [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/utilities/users/fetchGuildMember.ts:15-17`
**Rule:** FAIL-FAST-RULES — do not silently swallow.
**Problem:** The `.catch(() => { throw new UserNotInGuild(...) })` arm masks every failure mode — rate limits, network errors, permission errors, internal Discord 500s — as a not-in-guild error. `fetchUser` in the same directory does this correctly with a `DiscordAPIError` + `RESTJSONErrorCodes.UnknownMember` discriminator (see `fetchUser.ts:17-23`). The implementation here should follow the same pattern.
**Fix:** Narrow on `err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownMember`; rethrow all other errors verbatim.
**Auto-fixable:** no.

### H3 — `fetchRole`, `fetchText` rebrand arbitrary errors the same way [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/utilities/roles/fetchRole.ts:29-33, 43-48`; `packages/seedcord/src/bot/utilities/channels/fetchText.ts:24-28`
**Rule:** FAIL-FAST-RULES.
**Problem:** Identical pattern to H2. `fetchRole` discards the original error (no `cause`, no instanceof check on `DiscordAPIError`), so a network failure becomes `RoleDoesNotExist`. The cross-guild loop at lines 43-48 also swallows errors with `continue`, hiding misconfigured intents or permission issues. `fetchText` does the same.
**Fix:** Apply the `DiscordAPIError` + `RESTJSONErrorCodes` narrow pattern; rethrow other errors.
**Auto-fixable:** no.

### H4 — `Mongo.disconnect` swallows the disconnect failure during shutdown [pkg: plugins]

**Location:** `packages/plugins/src/mongo/Mongo.ts:136-140`
**Rule:** FAIL-FAST-RULES — silent fallback inside lifecycle path.
**Problem:** `.catch((err) => this.logger.error(...))` resolves the promise, so the `stop-database` shutdown task succeeds even when the disconnect actually failed. `CoordinatedShutdown` then proceeds to the next phase believing Mongo is closed cleanly. The pg pool teardown does the same thing at `KyselyPg.ts:160-162`.
**Fix:** Log and rethrow (or wrap in `SeedcordError` with `cause: err`), so the shutdown phase reports failure correctly.
**Auto-fixable:** no.

### H5 — Pool `connect` listener fires async, unhandled rejection [pkg: plugins]

**Location:** `packages/plugins/src/kysely-pg/KyselyPg.ts:262-273`
**Rule:** Unhandled promise rejection.
**Problem:** `pool.on('connect', (client) => { void (async () => { for (const sql of queuedStatements) await client.query(sql); })(); })`. If any `onConnect` statement throws, the rejection escapes the inner IIFE into the event loop as an unhandled rejection — there is no `.catch` on the IIFE. There's also no removal of this listener on pool teardown (memory leak on pool churn during dev HMR).
**Fix:** Wrap the IIFE in `.catch((err) => this.logger.error(...))` _and_ emit a lifecycle event so callers know the on-connect SQL failed. Consider storing the listener so it can be removed on `disconnect`.
**Auto-fixable:** no.

### H6 — `HealthCheck.stop` can hang if `server.close` callback errors [pkg: services]

**Location:** `packages/services/src/HealthCheck.ts:88-101`
**Rule:** Lifecycle leak / promise never settles.
**Problem:** `stop` returns `new Promise((resolve) => server.once('close', resolve); server.close(cb))`. `server.close` invokes its callback with an `Error` when the server isn't open, but the callback here ignores its argument. `close` is also a no-op if `server.listening` is false — in that case neither callback nor `'close'` event fires, and the promise _never resolves_. The `StopServices` phase will then hit its 5s timeout instead of completing cleanly. Additionally `init` never removes its `error` listener (`server.on('error', reject)`) — after the promise settles, the listener stays attached and a later async error becomes an unhandled `'error'` event on the EventEmitter.
**Fix:** Guard with `if (!this.server.listening) return;` before awaiting close. Use `.once('close', ...)` on a definitely-listening server, and propagate `close` callback errors via `reject`. Remove the `error` listener once `init` resolves.
**Auto-fixable:** no.

### H7 — `StrictEventEmitter.waitFor` aborts the wrong way around with `signal.aborted` [pkg: services]

**Location:** `packages/services/src/StrictEventEmitter.ts:175-178`
**Rule:** Memory leak / unsettled promise on early abort path.
**Problem:** When `opts.signal.aborted` is true on entry, `onAbort()` is called — which runs `cleanup()` and rejects. But by this point the `this.once(event, onEvent)` listener was already attached on line 173, so `cleanup()` does correctly remove it. However the `signal.addEventListener('abort', onAbort, { once: true })` branch was _not_ taken, yet the early return path is fine. The real bug is at line 162: `reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))` should use a `SeedcordError` (see M-bot bare-throw rule). Also: setTimeout id `null` initialization combined with `if (timeoutId) clearTimeout(timeoutId)` (line 170) — `NodeJS.Timeout` values are truthy objects, but typing as `NodeJS.Timeout | null` and clearing on null is fine. The aborted-on-entry path _does_ leak the `once` listener if the signal is already aborted: `cleanup()` removes it correctly. False alarm on that part; downgrade is "fix the bare Error throws" — see M5.
**Fix:** Throw `SeedcordError` (new codes `EventEmitterWaitForAborted`, `EventEmitterWaitForTimeout`).
**Auto-fixable:** no.

### H8 — `Seedcord.ts` casts `this` to `Core` twice with `as unknown as Core` [pkg: seedcord]

**Location:** `packages/seedcord/src/Seedcord.ts:79-80`
**Rule:** TYPESCRIPT — no `as unknown as T`.
**Problem:** `new EffectsController(this as unknown as Core)`. `Seedcord extends Pluggable implements Core`, so `this` should already satisfy `Core`. If TS rejects it, the `Core` interface is missing the members `Pluggable + Seedcord` actually expose, not the call site. Same issue in `Plugin.ts:170` and the three plugin services (M3 below).
**Fix:** Align the `Core` interface so `this` is assignable directly; remove the double cast. If the interface really needs a member that's added later, declare it on `Pluggable` so the contract is satisfied at construction time.
**Auto-fixable:** no.

### H9 — `LoggerChannelRegistry` never removes the sink Console transports across `configure()` calls [pkg: services]

**Location:** `packages/services/src/Logger/LoggerChannelRegistry.ts:120-123, 199-205`
**Rule:** Memory leak / dev-mode HMR.
**Problem:** `configure()` clears `this.cache` but the `sinks` map retains every previously registered sink with stale references inside `transportsByChannel` and `removedConsoleByChannel` (channel name -> WinstonTransport). On the next `get(channel)` the loop at lines 199-201 calls `applySinkToCachedLogger` again, building a new sink transport and storing it under the same channel key, _overwriting_ the prior entry in `transportsByChannel`. The prior transport (and its closure on the now-stale Winston logger) is dropped without being removed from the now-discarded logger. Across HMR cycles this accumulates ghost transports; on `uninstallSink` only the latest is removed.
**Fix:** On `configure()` either reapply sinks deliberately (iterate `sinks` after rebuild) or call `uninstallSink` for the old loggers before clearing the cache. Add a unit test that asserts the inner maps don't grow on repeated `configure` calls.
**Auto-fixable:** no.

### H10 — `EffectsController.emit` fires `processEffect` without awaiting its rejection [pkg: seedcord]

**Location:** `packages/seedcord/src/effects/EffectsController.ts:140-146`
**Rule:** Unhandled promise rejection path.
**Problem:** `void this.processEffect(event, data); return super.emit(event, data);`. `processEffect` catches inside its `for` loop (line 167), so a thrown error inside `instance.execute()` is logged. But the `void`-discarded promise also catches synchronous throws _outside_ the try (e.g., `new entry.ctor(data, this.core)` throwing at line 161 is inside the try, ok). The risk is more subtle: every emit creates a microtask. Order with `super.emit` is not what the comment suggests — listeners run sync, the effect handlers run async, and there's no guarantee an `'unknownException'` chain doesn't recursively `emit` while a prior `processEffect` is still pending. There's no concurrency guard.
**Fix:** Either (a) await `processEffect` (changes emit signature to async, big refactor) or (b) add a per-effect concurrency lock so re-entrant emits queue rather than overlap. Document the chosen semantics.
**Auto-fixable:** no.

### H11 — `KpgServiceRegistry` uses `@ts-expect-error` to reach into `KyselyPg`'s private field [pkg: plugins]

**Location:** `packages/plugins/src/kysely-pg/KpgServiceRegistry.ts:42-43`
**Rule:** OOP — encapsulation violation.
**Problem:** `// @ts-expect-error - private access on hmrHandler` reaches into a private field of `KyselyPg` from a separate class. This is the "friend access" antipattern — the comment justifies a smell rather than fixing it. The registry should either receive the `HmrModuleHandler` instance in its constructor, or `KyselyPg` should expose a `trackService(file, ctor)` method (which is also a cleaner API for the Mongo plugin in case it ever needs the same hook).
**Fix:** Promote `hmrHandler` access to a narrow `protected` method on `KyselyPg` (e.g., `trackServiceFile(filePath, ctor)`), or pass `hmrHandler` into the registry's constructor.
**Auto-fixable:** no.

---

## MEDIUM Severity

### M1 — Bare `throw new Error(...)` instead of `SeedcordError` [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/controllers/InteractionController.ts:110`; `packages/seedcord/src/bot/controllers/CommandRegistry.ts:50`; `packages/seedcord/src/bot/controllers/EventController.ts:65`
**Rule:** AGENTS.md — every throw in `packages/seedcord` should use a `SeedcordError` subclass from `@seedcord/services`.
**Problem:** Three controller constructors throw bare `Error('… instantiated without … path')`. These are _invariant violations_ (per FAIL-FAST-RULES rule 1), exactly the shape that should use a SeedcordError code like `CoreControllerPathMissing`. Bare `Error` has no code, no formatting, no localization, and is filtered out by `isSeedcordError`.
**Fix:** Add a `CoreControllerPathMissing` (or per-controller) code to `ErrorCodes.ts` + message in `ErrorMessages.ts`, then throw `SeedcordError`.
**Auto-fixable:** no.

### M2 — `StrictEventEmitter.waitFor` throws bare `new Error('Aborted')` / `'Timed out'` [pkg: services]

**Location:** `packages/services/src/StrictEventEmitter.ts:162, 183`
**Rule:** Same as M1, for `@seedcord/services`.
**Problem:** Bare Error throws inside a public utility. Consumers can't discriminate timeout vs abort without string parsing.
**Fix:** Add `SeedcordErrorCode.EventEmitterAborted` / `EventEmitterTimedOut`; throw `SeedcordError` with those codes.
**Auto-fixable:** no.

### M3 — `as unknown as` double casts in plugin service registration [pkg: plugins, services]

**Location:** `packages/plugins/src/mongo/MongoService.ts:58`; `packages/plugins/src/kysely-pg/KpgService.ts:59`; `packages/plugins/src/kysely-pg/KpgServiceRegistry.ts:25`; `packages/services/src/StrictEventEmitter.ts:41,55,69,97,108` (every override)
**Rule:** TYPESCRIPT — no `as unknown as T`.
**Problem:** The StrictEventEmitter overrides each cast the incoming listener through `unknown`. The mapped tuple → unknown[] coercion can be expressed with a typed wrapper (`(...args: unknown[]) => void as never` is shorter and the lint rule allows a single `as` with a justification). The plugin service `_register` calls do the same: cast `this` and `key` through `unknown` because `MongoServices`/`KpgServices` is a structural mismatch by design. Add `// justified: <reason>` per AGENTS.md, or — better — make the registry types use `Record<string, AnyService>` and narrow at the public boundary.
**Fix:** For StrictEventEmitter: change the supertype to accept a wider listener tuple and drop the double cast. For service registries: keep an internal `Record<string, unknown>` and narrow only at the public `services` accessor.
**Auto-fixable:** no.

### M4 — `as unknown as Record<...>` double casts in Logger [pkg: services]

**Location:** `packages/services/src/Logger/LogFormatter.ts:67,100,101,116,117`; `packages/services/src/Logger/Transports/SinkTransport.ts:77,83,88`; `packages/services/src/Logger/LoggerChannelRegistry.ts:292`
**Rule:** TYPESCRIPT.
**Problem:** Repeated `(info as unknown as Record<...>)`. `Logform.TransformableInfo` is `Record<string|symbol, unknown>` underneath — the proper fix is to declare an interface that extends `TransformableInfo` with the known sentinel keys (`__formattedName`, `__plainName`, `[SPLAT]`) and cast once at the boundary.
**Fix:** Define a single `EnrichedLogInfo` type that adds the known fields; cast `info as EnrichedLogInfo` once per function entry.
**Auto-fixable:** no.

### M5 — `console.error` inside Catchable / EventCatchable decorators despite Logger being available [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/decorators/Catchable.ts:60-61`; `packages/seedcord/src/bot/decorators/EventCatchable.ts:64-65`
**Rule:** AGENTS.md — every log call in `packages/seedcord` should go through `@seedcord/services` Logger.
**Problem:** Decorators support a `log: true` flag that writes via `console.error`. This bypasses Winston, ignores channel routing, and won't appear in the CLI's TUI log panel. The `eslint-disable no-console` is a band-aid.
**Fix:** Replace `console.error(error)` with a module-level `Logger`. Update the JSDoc on `CatchableOptions.log` to drop the "console" mention.
**Auto-fixable:** no.

### M6 — `EffectsHandler` redundant property re-assignment dead code [pkg: seedcord]

**Location:** `packages/seedcord/src/effects/EffectsHandler.ts:27-28`
**Rule:** AGENTS.md — no dead code.
**Problem:** Parameter properties `protected readonly data` / `core` already assign these fields; the manual `this.data = data; this.core = core;` lines are no-ops.
**Fix:** Delete the two lines.
**Auto-fixable:** yes.

### M7 — `filterCirculars.decycle` and `json` paths silently fall back to the original unmodified value [pkg: utils]

**Location:** `packages/utils/src/objects/filterCirculars.ts:97-102, 128-134, 140-146`
**Rule:** FAIL-FAST-RULES — silent fallback masking broken assumptions.
**Problem:** Every catch logs and returns the _unmodified_ value cast to the filtered type. Callers (notably `UnknownException.prepareMetadataFile`) then `JSON.stringify` it and likely fail again. The cast `as JsonifyWithCirculars<...>` is a type-level lie.
**Fix:** Throw a `SeedcordError` with the underlying cause, or at minimum return a sentinel like `{ __filterCircularsFailed: true, reason: ... }` and document it. The current behavior obscures the bug at the original site.
**Auto-fixable:** no.

### M8 — `directory.traverseDirectory` logs "Failed to read this directory" with no path/cause [pkg: utils]

**Location:** `packages/utils/src/misc/directory.ts:36-41`
**Rule:** Diagnostic quality.
**Problem:** `catch { logger.error('Failed to read this directory'); entries = []; }` — no directory name, no error message, no stack. Operators won't know whether it was the handlers dir, middlewares dir, or effects dir that failed.
**Fix:** `catch (err) { logger.error('Failed to read directory %s', dir, err); entries = []; }`.
**Auto-fixable:** yes.

### M9 — `Slugger.slug` is a trivial alias of `Slugger.fromSegments` [pkg: docs-engine]

**Location:** `packages/docs-engine/src/Slugger.ts:20-22`
**Rule:** YAGNI / DRY.
**Problem:** Two methods do the same thing. Tests use both (`slug` and `slugForNode → fromSegments`), so this is just API noise.
**Fix:** Pick one (`slug`) and delete the other; export `slugForNode` as a thin function or drop it (it's two characters more than `slugger.slug(path)`).
**Auto-fixable:** no.

### M10 — Block-bodied exported arrow at module scope [pkg: docs-engine]

**Location:** `packages/docs-engine/src/Slugger.ts:40` (`export const slugForNode = (...)`); `packages/docs-engine/src/smoke.ts:48,110` (`normalizeFlag`, `sanitizeFileSegment`)
**Rule:** AGENTS.md — function declarations for exported logic.
**Problem:** `export const slugForNode = (slugger, path) => slugger.fromSegments(path)` — exported, not a one-line predicate, should be `function slugForNode(slugger, path) { return ... }`. Same for `sanitizeFileSegment` (multi-line block body).
**Fix:** Convert to `function` declarations.
**Auto-fixable:** yes (lint rule `prefer-arrow-callback` won't catch this; manual fix).

### M11 — `DocSearch` class fields are block-bodied arrows [pkg: docs-engine]

**Location:** `packages/docs-engine/src/services/Search.ts:48-72`
**Rule:** OOP — methods, not fields.
**Problem:** `safeEquals`, `getKindWeight`, `aggregateSearchIndex`, `tokenizeQuery` are private class properties holding arrow functions. They should be private _methods_ (lighter prototype-shared form, easier to read with `this:`, debuggable in stack traces). The current form also bypasses `this` binding rules implicitly.
**Fix:** Convert each to `private foo(...): ... { ... }`.
**Auto-fixable:** no.

### M12 — `.filter().map()` chains (two passes when one suffices) [pkg: docs-engine]

**Location:** `packages/docs-engine/src/transformers/CommentTransformer.ts:20`; `packages/docs-engine/src/builders/package-builder.ts:104-105, 116-117`
**Rule:** REACT19/SKILL — `.filter().map()` → `.reduce()`.
**Problem:** Two iterations across the same array. Lines 104-105 and 116-117 are also duplicates of each other (DRY).
**Fix:** Replace with `reduce`; extract the alias-collecting body into one private helper used by both `collect*Aliases` functions.
**Auto-fixable:** no.

### M13 — Sequential independent awaits in `ClassicAdapter.buildPrompt` [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/decorators/Confirmable/adapters.ts:26-27`
**Rule:** SKILL — sequential independent awaits.
**Problem:** `await resolveFactory(this.opts.prompt, ctx)` and `await resolveFactory(this.opts.rows, ctx)` are independent; they should run in parallel via `Promise.all`.
**Fix:** `const [prompt, rows] = await Promise.all([resolveFactory(...), resolveFactory(...)]);`.
**Auto-fixable:** yes.

### M14 — Confirmable `onResolved` callback errors fully swallowed [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/decorators/Confirmable/Confirmable.ts:142-144`
**Rule:** FAIL-FAST-RULES.
**Problem:** `try { await options.onResolved(resolution); } catch { /* Suppress error in callback */ }`. The comment acknowledges the smell. Errors thrown from user callbacks vanish — even console.error would be safer.
**Fix:** At minimum `logger.error('Confirmable onResolved threw', err)`. Better: emit an event on the bot for `error:unhandled:confirmable-callback`.
**Auto-fixable:** no.

### M15 — `seedcordErrorMessages` is exported but never imported [pkg: services]

**Location:** `packages/services/src/Errors/ErrorMessages.ts:125`
**Rule:** AGENTS.md — no dead exports.
**Problem:** `export { messages as seedcordErrorMessages }` — no consumer in `packages/`, `apps/`, or `mock/`.
**Fix:** Drop the export. The `formatSeedcordErrorMessage` function is the public surface.
**Auto-fixable:** yes.

### M16 — `formatSeedcordErrorMessage`, `SeedcordErrorArguments`, `SeedcordErrorIdentifier`, `SeedcordErrorOptions` only used inside Errors/ [pkg: services]

**Location:** `packages/services/src/Errors/ErrorMessages.ts:109,116`; `packages/services/src/Errors/SeedcordError.ts:12,19`
**Rule:** Public API surface audit.
**Problem:** Each is `export`ed and tagged `@internal`, but they aren't re-exported from `index.ts` or `internal.index.ts` — so they aren't visible to consumers, but they aren't visible to sibling files either. Verify with `rg` outside the directory: zero consumers.
**Fix:** Drop the `export` keyword on `SeedcordErrorIdentifier`, `SeedcordErrorOptions`, `SeedcordErrorArguments`; keep `formatSeedcordErrorMessage` as a module-internal function.
**Auto-fixable:** no.

### M17 — `SEEventKey`, `HandlerEventType`, `AssertHandles` exported but only used in their own files [pkg: services, seedcord]

**Location:** `packages/services/src/StrictEventEmitter.ts:22`; `packages/seedcord/src/bot/decorators/Interactions.ts:61,71`
**Rule:** Public API surface audit / no dead exports.
**Problem:** `SEEventKey<T>` is used only inside `StrictEventEmitter.ts`. `HandlerEventType` and `AssertHandles` are used only inside `Interactions.ts`. All three are tagged `@internal` and not re-exported through `index.ts`. Drop the `export` keyword.
**Fix:** Remove `export` from these three declarations.
**Auto-fixable:** yes.

### M18 — `HmrModuleHandlerOptions` exported but only consumed by the file's own constructor [pkg: seedcord]

**Location:** `packages/seedcord/src/hmr/HmrModuleHandler.ts:26`
**Rule:** Public API surface audit.
**Problem:** No imports of `HmrModuleHandlerOptions` by name anywhere in the workspace. Consumers pass an object literal to the constructor, so the type is inferred.
**Fix:** Drop the `export`. If a downstream plugin author wants the type, they can re-derive via `ConstructorParameters<typeof HmrModuleHandler>[0]`.
**Auto-fixable:** yes.

### M19 — `CoordinatedLifecycle` uses bare Node `EventEmitter`, not the project's `StrictEventEmitter` [pkg: services]

**Location:** `packages/services/src/Lifecycle/CoordinatedLifecycle.ts:6, 21, 166-179`
**Rule:** PREVENT-REINVENTION / cross-package consistency.
**Problem:** The package owns `StrictEventEmitter` and uses it for typed events elsewhere, but the lifecycle base class hand-rolls `events.on/off/emit` with `unknown[]` payload types and exposes them as untyped `on(event: string, listener: (...args: unknown[]) => void)`. The subclasses then redeclare type-safe `on`/`off` overrides that just call `super.on(event, listener)`, losing all of the typing benefits the project already paid for.
**Fix:** Make `CoordinatedLifecycle<TPhase>` extend `StrictEventEmitter<PhaseEvents<...>>`. Then the subclass overrides are unnecessary.
**Auto-fixable:** no.

### M20 — `CooldownManager.Err` types Discord-specific cooldown errors via generic `Error` ctor [pkg: services]

**Location:** `packages/services/src/CooldownManager.ts:11-13, 24-26`
**Rule:** TYPESCRIPT — `any[]` in constructor signature.
**Problem:** `new (msg: string, ...args: any[]) => Error` — accepts any constructor, including ones whose extra args aren't strings. Since callers in `packages/seedcord` always throw a `CustomError`-style class with a specific signature, type the ctor narrowly: `new (msg: string, remainingMs: number) => Error`. Removes the `any[]`.
**Fix:** Tighten to `new (msg: string, remaining: number) => Error`. Update the JSDoc accordingly.
**Auto-fixable:** no.

### M21 — `KpgServiceRegistry.services` initializes via `Object.create(null) as Record<...>` then exposes via `as unknown as KpgServices` [pkg: plugins]

**Location:** `packages/plugins/src/kysely-pg/KpgServiceRegistry.ts:16,25`
**Rule:** TYPESCRIPT — fix the declaration.
**Problem:** Two casts wrap a single field. The structural mismatch is that `KpgServices` is a discriminated mapped type and the internal storage is opaque. Hold the internal value as `Map<string, AnyKpgService>` and expose `KpgServices` via a single `Object.fromEntries(this.services) as unknown as KpgServices` with `// justified: KpgServices is a generated mapped type`. Same applies to `Mongo.services = {} as MongoServices` (`Mongo.ts:48`).
**Fix:** Either narrow the registry type or document the cast in one place.
**Auto-fixable:** no.

### M22 — `webhookUrlValidator` regex hardcoded inline, not a constant [pkg: seedcord]

**Location:** `packages/seedcord/src/effects/default/UnknownException.ts:27-28`
**Rule:** Magic strings; readability.
**Problem:** `String.raw` template + `new RegExp(pattern)` is rebuilt on every validator invocation. Move to a module-level `const DISCORD_WEBHOOK_REGEX = /…/u`.
**Fix:** Hoist to module scope.
**Auto-fixable:** yes.

### M23 — `Mongo.services = {} as MongoServices` allows `services.foo` to type-check before init [pkg: plugins]

**Location:** `packages/plugins/src/mongo/Mongo.ts:48`
**Rule:** TYPESCRIPT — fix the declaration.
**Problem:** Empty object cast as `MongoServices` (a mapped record of service instances). Consumers accessing `db.services.users` before init get `undefined` at runtime but `Users` at compile time — silent breakage.
**Fix:** Mark `services` as `Partial<MongoServices>` internally, narrow with an `assertReady()` guard, _or_ throw `SeedcordError` from a getter when not initialized.
**Auto-fixable:** no.

### M24 — `Logger.Error / Info / Warn / Debug / Silly` are static-only convenience wrappers [pkg: services]

**Location:** `packages/services/src/Logger/Logger.ts:160-219`
**Rule:** OOP — static-only namespace antipattern.
**Problem:** 5 static methods that all do `this.instance(prefix).<level>(...)`. They live on the `Logger` class but don't share state with instance methods. The "naming convention" eslint disable on each is a smell.
**Fix:** Two options: (a) export as plain functions (`logError`, etc.); (b) collapse to `Logger.log(level, prefix, msg, ...args)`. Currently the only caller is `CooldownManager.check` (`Logger.Debug('CooldownManager', ...)`), so the surface is narrow.
**Auto-fixable:** no.

### M25 — `EventController.processHandler` re-runs `handler.runChecks()` per-handler with no shared state [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/controllers/EventController.ts:328-344`
**Rule:** Magic constant / DRY.
**Problem:** Same handler-execution pattern (`runChecks → shouldBreak → execute`) appears in `InteractionController.processInteraction` (lines 339-362). Both decay into "construct instance, run checks, execute". The shared shape suggests a small private helper on `Bot` or a `runHandler(ctor, args, core, ...)` utility.
**Fix:** Extract once. Will simplify future handler types (e.g., post-execute hooks).
**Auto-fixable:** no.

### M26 — `addVersionToJson` builds an `ordered` array then `Object.fromEntries` instead of mutating [pkg: docs-generator]

**Location:** `packages/docs-generator/src/extractor.ts:15-41`
**Rule:** Simplicity.
**Problem:** Builds a `[key, value][]` array via push, then `Object.fromEntries`, then `writeFile`. Cleaner: `delete data.version` then assign `data.version = version` after `data.name` via an ordered Map. Current code is correct but verbose.
**Fix:** Cosmetic — leave or simplify.
**Auto-fixable:** no.

### M27 — `LifecyclePhaseFailures` error message string-interpolates the chalked phase name [pkg: services]

**Location:** `packages/services/src/Lifecycle/CoordinatedLifecycle.ts:113-116`; `packages/services/src/Errors/ErrorMessages.ts:20-21`
**Rule:** Diagnostic quality.
**Problem:** The first argument passed to `LifecyclePhaseFailures` is `chalk.bold.magenta(this.phaseEnum[phase])`, so the error message embeds ANSI escape codes. When the error is later JSON-serialized (e.g., by `filterCirculars` for the webhook effect), the message contains unrenderable bytes.
**Fix:** Pass the raw phase name; let the logger handle chalk.
**Auto-fixable:** yes.

### M28 — `UnknownException` keys avatar URL to a Discord CDN URL with no fallback [pkg: seedcord]

**Location:** `packages/seedcord/src/effects/default/UnknownException.ts:69-70`
**Rule:** Magic string / external dependency.
**Problem:** The URL points to an attachment in a private Discord channel. If the message is ever deleted, the avatar 404s. There's no graceful fallback.
**Fix:** Either bundle the image into the package (`./assets/warning.png`) or omit the avatar.
**Auto-fixable:** no.

### M29 — `HMR` channel side effect on Logger options [pkg: seedcord]

**Location:** `packages/seedcord/src/hmr/HmrModuleHandler.ts:62`
**Rule:** Mutating injected references.
**Problem:** `options.logger = options.logger.inChannel('hmr')` mutates the caller's options object. If the caller reuses the same options reference, the logger is now permanently switched.
**Fix:** `this.options = { ...options, logger: options.logger.inChannel('hmr') }`.
**Auto-fixable:** yes.

### M30 — `parseEnvColor` and `hexToNumber` overlap [pkg: seedcord]

**Location:** `packages/seedcord/src/miscellaneous/parseEnvColor.ts`; `packages/seedcord/src/miscellaneous/hexToNumber.ts`
**Rule:** DRY (likely).
**Problem:** Two miscellaneous helpers for color/number coercion. Verify they don't duplicate each other; if `parseEnvColor` is a thin wrapper, drop the indirection.
**Fix:** Read both; consolidate if redundant.
**Auto-fixable:** no.

### M31 — `webhookUrlValidator` accepts `null` then re-throws same code [pkg: seedcord]

**Location:** `packages/seedcord/src/effects/default/UnknownException.ts:14-25`
**Rule:** Cleanup.
**Problem:** Two separate branches throw `ConfigUnknownExceptionWebhookMissing` (raw `=== null` and `value === ''`). Collapse into one normalize-then-check.
**Fix:** Trivial refactor.
**Auto-fixable:** yes.

### M32 — `WrapDatabaseError` decorator imports `seedcord` (the consumer's own package) and `seedcord/internal` [pkg: plugins]

**Location:** `packages/plugins/src/shared/WrapDatabaseError.ts:1-3`
**Rule:** Cross-package consistency.
**Problem:** Mixes `import from 'seedcord'`, `from 'seedcord/internal'`, and `from '@seedcord/services/internal'`. The seedcord-internal import (`DatabaseError`) is correctly using the internal entry, but the `SeedcordError` import is duplicated through services-internal when seedcord re-exports the same symbol. Pick one.
**Fix:** Import everything from `seedcord` + `seedcord/internal` exclusively (since seedcord re-exports `@seedcord/services`).
**Auto-fixable:** yes.

---

## LOW Severity

### L1 — `tsup-config` empty catch loses cause [pkg: tsup-config]

**Location:** `packages/tsup-config/src/index.ts:23-25`
**Problem:** `} catch { /* ignore file system errors */ }` covers JSON parse errors too. If `package.json` becomes malformed, `cachedVersion = '0.0.0'` silently. Acceptable for a config helper, but a `logger.warn` (or a console.warn) would help.
**Fix:** Add a one-line warning.

### L2 — `package-builder.ts` alias collection helpers are sibling duplicates [pkg: docs-engine]

**Location:** `packages/docs-engine/src/builders/package-builder.ts:99-120`
**Problem:** `collectComment Aliases` / `collectSignatureAliases` differ only in the parameter type. Extract a shared `collectAliases(comment)` helper.
**Fix:** Extract.

### L3 — `HealthCheck` HTTP status codes hardcoded as local constants [pkg: services]

**Location:** `packages/services/src/HealthCheck.ts:11-12`
**Problem:** `const HTTP_OK = 200; const HTTP_NOT_FOUND = 404` — better to use Node's `http.STATUS_CODES` or the `200`/`404` literals inline (it's a 50-line file).
**Fix:** Either or.

### L4 — Magic number `LOG_FLUSH_DELAY_MS = 500` is reasonable but unexplained [pkg: services]

**Location:** `packages/services/src/Lifecycle/CoordinatedShutdown.ts:39`
**Problem:** A comment explaining "why 500 — winston flush window" would help future readers.
**Fix:** Add comment.

### L5 — `version = process.env.PACKAGE_VERSION ?? '0.0.0'` repeated in every package's `index.ts`

**Location:** All 9 package indexes.
**Problem:** Duplicated boilerplate (`tsup-config` even does it twice, lines 13-29 vs 98). Acceptable since the value is injected per-package by tsup, but a shared `defineVersion()` helper from `@seedcord/types` would DRY this.
**Fix:** Optional.

### L6 — `Bot.emit` overload comment references "exact arg tuple" but the implementation uses `as never` [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/Bot.ts:143-158`
**Problem:** Two declared overloads, one unsigned `(string, ...unknown[])` implementation that casts via `never`. The cast is _necessary_ for the union type, but the JSDoc is misleading — readers expect the runtime to enforce the correlation.
**Fix:** Update JSDoc to say "compile-time correlation only; runtime forwards to EventEmitter".

### L7 — `Catchable` JSDoc "{@default false}" tags appear in `@param` description, not as `@default` block [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/decorators/Catchable.ts:13-17`
**Problem:** TSDoc/eslint-plugin-tsdoc might warn; the `@default` tag in this repo is added as a custom inline tag (see `docs-generator/extractor.ts:130`). Consistency review.
**Fix:** Verify lint output; align if needed.

### L8 — `kysely-pg` plugin folder uses kebab-style filenames `KpgService.ts` etc. but the directory is `kysely-pg` [pkg: plugins]

**Problem:** Minor stylistic inconsistency — `mongo/` is lowercase, `kysely-pg/` is kebab. Acceptable, just inconsistent.
**Fix:** None unless renaming for consistency.

### L9 — `index.ts` of `bot/utilities` uses `export *` mixed with explicit re-exports [pkg: seedcord]

**Location:** `packages/seedcord/src/bot/utilities/index.ts`
**Problem:** `export * from './roles/fetchRole'` exports everything in the file; the explicit `export { type ... } from './permissions/checkPermissions'` block right above suggests intent to whitelist. Inconsistent.
**Fix:** Standardize on one style per package.

---

## Test Coverage Gaps

### Per-package missing tests

- `packages/services/src/CooldownManager.ts` — **no tests**. Public class with timing behavior, expiry, custom error class injection. Trivial to unit-test with fake timers.
- `packages/services/src/HealthCheck.ts` — **no tests**. Should cover bind-to-host, bind-to-all-interfaces, shutdown when not listening (H6), and `404` path.
- `packages/services/src/Lifecycle/CoordinatedShutdown.ts` and `CoordinatedStartup.ts` — **no tests**. Critical lifecycle code with signal handlers, phase timeouts, abort semantics. Test: phase failures throw `LifecyclePhaseFailures`, abort during run, double-run guards, task removal during run.
- `packages/services/src/StrictEventEmitter.ts` — **no tests**. `waitFor` timeout/abort branches (H7) are completely uncovered.
- `packages/seedcord/src/effects/EffectsController.ts` — exists, but `'once'` frequency dedupe (lines 156-166) isn't asserted by the existing controller test (`tests/effects/EffectsController.test.ts` — verify).
- `packages/seedcord/src/effects/default/UnknownException.ts` — **no tests** for `webhookUrlValidator` (canary/ptb subdomains, missing/empty/null branches).
- `packages/seedcord/src/bot/utilities/errors/throwCustomError.ts` — **no tests**, which is why H1 has gone undetected.
- `packages/seedcord/src/bot/utilities/users/fetchGuildMember.ts`, `fetchRole.ts`, `fetchText.ts` — **no tests** for the swallowed-error paths (H2, H3).
- `packages/seedcord/src/hmr/HmrModuleHandler.ts` — **no tests** for the unload/reload cycle, the "tracked file no longer exists" branch, the vitest cache-busting URL.
- `packages/plugins/src/shared/WrapDatabaseError.ts` — **no tests** for the decorator. Combined with the `throwCustomError` gap, H1 went unnoticed.
- `packages/docs-engine/src/services/Search.ts` — `search.test.ts` exists; verify it covers the empty-query path (line 84), the `pkgName` scope path (line 88), and the `fuzzyMatches.has` boost (line 120).
- `packages/docs-engine/src/transformers/flag-mapper.ts` — recursive `returnsPromise` detection; no test for `templateLiteral`, `namedTupleMember` (line 193 has the only `as unknown as` cast in this file).
- `packages/docs-generator/src/extractor.ts` — covered by `generator.test.ts` per existing test list, but the `addVersionToJson` no-name branch (line 35-37) and the typedoc error capture (lines 88-97) likely aren't exercised.
- `packages/services/src/Errors/SeedcordError.ts` — `tests/errors/errors.types.test-d.ts` exists; verify it asserts that `isSeedcordError(err, 'SeedcordTypeError', PluginMongoConnectionFailed)` narrows to `SeedcordTypeError<PluginMongoConnectionFailed>` rather than `never`. Subtle generics regression target.
- `packages/utils/src/objects/filterCirculars.ts` — `tests/basic.test.ts` is one file. Confirm the JSON-stringify-then-parse round trip covers BigInt, Symbol values, and cyclic Sets.
- `packages/types` — only `tests/basic.test.ts`. No `.test-d.ts` files for the `Types/Filters`, `Types/UnionLogic`, `Types/PropertyModifiers`. These are pure type-level utilities — a `tests/types/*.test-d.ts` per Type folder would prevent silent regressions.

---

## Public API Surface Audit

This branch is mid-refactor reducing exported surface. The split is now `index.ts` (public) and `internal.index.ts` (sibling-friend access via `@seedcord/services/internal` and `@seedcord/utils/internal`). Below are surface decisions that look inconsistent.

### `packages/seedcord/src/hmr/index.ts` exports likely needing demotion

- `export * from './HmrModuleHandler'` re-exports the `HmrStore`/`HmrData` interfaces (top-level `interface`, not `export`-prefixed — currently file-private, OK) and `HmrModuleHandlerOptions` (M18) — drop `export` on the options interface, then the barrel re-export is fine.

### `packages/services/src/Errors/internal.index.ts` re-exports vs `index.ts`

- `internal.index.ts` exports `SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError` — good, used widely via `@seedcord/services/internal`.
- `index.ts` exports `isSeedcordError`, `BaseSeedcordError`, `SeedcordErrorTypeString`, `SeedcordErrorCode` — good.
- Missing demotions: `SeedcordErrorIdentifier`, `SeedcordErrorOptions`, `SeedcordErrorArguments`, `formatSeedcordErrorMessage`, `seedcordErrorMessages` (see M15, M16) — these have `export` but no re-export, so they're already "soft-internal". Drop the `export` keyword.

### `packages/services/src/StrictEventEmitter.ts` exports

- `SEArgsTuple`, `SENoEvents`, `SEEventMapLike` are public (used by Plugin/Pluggable). Good.
- `SEEventKey` (M17) — drop `export`, used only inside the file.

### `packages/seedcord/src/bot/decorators/Interactions.ts` exports

- `SlashRoute`, `ButtonRoute`, etc., `SelectMenuType` — public via `decorators/index.ts`. Good.
- `InteractionRoutes` enum, `InteractionMetadataKey` symbol, `HandlerEventType`, `AssertHandles` — file-local helpers consumed by InteractionController. They are _not_ re-exported through `decorators/index.ts`, so the surface is already correct from the consumer's POV, but the source file should drop the `export` from `HandlerEventType` / `AssertHandles` (M17) since they're file-only types.

### `packages/seedcord/src/internal.index.ts`

- Currently only exports `DatabaseError`. The other module-level `SeedcordError` re-export comes through `@seedcord/services/internal`. Verify whether `GenericError` (defined in `extractErrorResponse.ts`) should also be promoted to internal for plugin authors who want to customize the generic error embed — currently it leaks via `extractErrorResponse` returning `EmbedBuilder`.

### Missing exports (consumers reaching into deep paths)

- `packages/plugins/src/shared/WrapDatabaseError.ts:1` imports `SeedcordError` from `@seedcord/services/internal` _and_

### Per-package missing tests

- `packages/services/src/CooldownManager.ts` — **no tests**. Public class with timing behavior, expiry, custom error class injection. Trivial to unit-test with fake timers.
- `packages/services/src/HealthCheck.ts` — **no tests**. Should cover bind-to-host, bind-to-all-interfaces, shutdown when not listening (H6), and `404` path.
- `packages/services/src/Lifecycle/CoordinatedShutdown.ts` and `CoordinatedStartup.ts` — **no tests**. Critical lifecycle code with signal handlers, phase timeouts, abort semantics. Test: phase failures throw `LifecyclePhaseFailures`, abort during run, double-run guards, task removal during run.
- `packages/services/src/StrictEventEmitter.ts` — **no tests**. `waitFor` timeout/abort branches (H7) are completely uncovered.
- `packages/seedcord/src/effects/EffectsController.ts` — exists, but `'once'` frequency dedupe (lines 156-166) isn't asserted by the existing controller test (`tests/effects/EffectsController.test.ts` — verify).
- `packages/seedcord/src/effects/default/UnknownException.ts` — **no tests** for `webhookUrlValidator` (canary/ptb subdomains, missing/empty/null branches).
- `packages/seedcord/src/bot/utilities/errors/throwCustomError.ts` — **no tests**, which is why H1 has gone undetected.
- `packages/seedcord/src/bot/utilities/users/fetchGuildMember.ts`, `fetchRole.ts`, `fetchText.ts` — **no tests** for the swallowed-error paths (H2, H3).
- `packages/seedcord/src/hmr/HmrModuleHandler.ts` — **no tests** for the unload/reload cycle, the "tracked file no longer exists" branch, the vitest cache-busting URL.
- `packages/plugins/src/shared/WrapDatabaseError.ts` — **no tests** for the decorator. Combined with the `throwCustomError` gap, H1 went unnoticed.
- `packages/docs-engine/src/services/Search.ts` — `search.test.ts` exists; verify it covers the empty-query path (line 84), the `pkgName` scope path (line 88), and the `fuzzyMatches.has` boost (line 120).
- `packages/docs-engine/src/transformers/flag-mapper.ts` — recursive `returnsPromise` detection; no test for `templateLiteral`, `namedTupleMember` (line 193 has the only `as unknown as` cast in this file).
- `packages/docs-generator/src/extractor.ts` — covered by `generator.test.ts` per existing test list, but the `addVersionToJson` no-name branch (line 35-37) and the typedoc error capture (lines 88-97) likely aren't exercised.
- `packages/services/src/Errors/SeedcordError.ts` — `tests/errors/errors.types.test-d.ts` exists; verify it asserts that `isSeedcordError(err, 'SeedcordTypeError', PluginMongoConnectionFailed)` narrows to `SeedcordTypeError<PluginMongoConnectionFailed>` rather than `never`. Subtle generics regression target.
- `packages/utils/src/objects/filterCirculars.ts` — `tests/basic.test.ts` is one file. Confirm the JSON-stringify-then-parse round trip covers BigInt, Symbol values, and cyclic Sets.
- `packages/types` — only `tests/basic.test.ts`. No `.test-d.ts` files for the `Types/Filters`, `Types/UnionLogic`, `Types/PropertyModifiers`. These are pure type-level utilities — a `tests/types/*.test-d.ts` per Type folder would prevent silent regressions.

---

## Public API Surface Audit

This branch is mid-refactor reducing exported surface. The split is now `index.ts` (public) and `internal.index.ts` (sibling-friend access via `@seedcord/services/internal` and `@seedcord/utils/internal`). Below are surface decisions that look inconsistent.

### `packages/seedcord/src/hmr/index.ts` exports likely needing demotion

- `export * from './HmrModuleHandler'` re-exports the `HmrStore`/`HmrData` interfaces (top-level `interface`, not `export`-prefixed — currently file-private, OK) and `HmrModuleHandlerOptions` (M18) — drop `export` on the options interface, then the barrel re-export is fine.

### `packages/services/src/Errors/internal.index.ts` re-exports vs `index.ts`

- `internal.index.ts` exports `SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError` — good, used widely via `@seedcord/services/internal`.
- `index.ts` exports `isSeedcordError`, `BaseSeedcordError`, `SeedcordErrorTypeString`, `SeedcordErrorCode` — good.
- Missing demotions: `SeedcordErrorIdentifier`, `SeedcordErrorOptions`, `SeedcordErrorArguments`, `formatSeedcordErrorMessage`, `seedcordErrorMessages` (see M15, M16) — these have `export` but no re-export, so they're already "soft-internal". Drop the `export` keyword.

### `packages/services/src/StrictEventEmitter.ts` exports

- `SEArgsTuple`, `SENoEvents`, `SEEventMapLike` are public (used by Plugin/Pluggable). Good.
- `SEEventKey` (M17) — drop `export`, used only inside the file.

### `packages/seedcord/src/bot/decorators/Interactions.ts` exports

- `SlashRoute`, `ButtonRoute`, etc., `SelectMenuType` — public via `decorators/index.ts`. Good.
- `InteractionRoutes` enum, `InteractionMetadataKey` symbol, `HandlerEventType`, `AssertHandles` — file-local helpers consumed by InteractionController. They are _not_ re-exported through `decorators/index.ts`, so the surface is already correct from the consumer's POV, but the source file should drop the `export` from `HandlerEventType` / `AssertHandles` (M17) since they're file-only types.

### `packages/seedcord/src/internal.index.ts`

- Currently only exports `DatabaseError`. The other module-level `SeedcordError` re-export comes through `@seedcord/services/internal`. Verify whether `GenericError` (defined in `extractErrorResponse.ts`) should also be promoted to internal for plugin authors who want to customize the generic error embed — currently it leaks via `extractErrorResponse` returning `EmbedBuilder`.

### Missing exports (consumers reaching into deep paths)

- `packages/plugins/src/shared/WrapDatabaseError.ts:1` imports `SeedcordError` from `@seedcord/services/internal` _and_ `DatabaseError` from `seedcord/internal`. If `WrapDatabaseError` is the canonical way for plugin authors to use these, the `seedcord/internal` surface should be the only one they need. Right now plugin code has to know about two internal entry points.
- `packages/seedcord/src/Seedcord.ts:8-9` imports from both `@seedcord/services/internal` and `@seedcord/utils/internal`. Consistent with the pattern, but worth surfacing in plugin author docs.

---

## Cross-Package Consistency

### Patterns inconsistent across packages

- **Error handling:** `packages/seedcord` mostly throws `SeedcordError` via `@seedcord/services/internal`, but three controller constructors throw bare `Error` (M1) and `StrictEventEmitter.waitFor` throws bare `Error` (M2). `KyselyPg` and `Mongo` wrap raw errors into `SeedcordError` correctly. `throwCustomError` uses a `typeof`-based dispatch (H1) which is unique and wrong.
- **Logger usage:** Every package consistently uses `Logger` from `@seedcord/services`. Exceptions: `Catchable`/`EventCatchable` use bare `console.error` (M5); `docs-engine/smoke.ts` uses `console.log/error` (acceptable — it's a CLI script); `docs-generator/extractor.ts` uses `console.warn` for skip notices (acceptable — bootstrapping context where Logger may not be wired).
- **EventEmitter base class:** `StrictEventEmitter` is used by `Plugin`, `Pluggable`, `Bot`, the CLI `LogStore`. `CoordinatedLifecycle` uses bare Node `EventEmitter` (M19) — inconsistent.
- **Internal-import style:** `WrapDatabaseError.ts` mixes three internal-entry imports (M32). Most other plugin files use exactly two (`'seedcord'` + `'seedcord/internal'` or `'@seedcord/services/internal'`).
- **Static-method conventions:** `Logger` has 5 static log helpers + `configure`. `LoggerChannelRegistry` is a singleton with a `static get instance()`. `Seedcord` has a `private static reset()` for tests. The patterns are different (singleton-getter vs static methods on a class); should choose one for any future singleton.
- **Filename casing:** `kysely-pg/` (kebab) vs `mongo/` (lower). `KpgService.ts` (PascalKebab) vs `MongoService.ts`. Pre-1.0; either is fine, but pick one.

---

## Summary

- HIGH: 11
- MEDIUM: 32
- LOW: 9
- Test gaps: 16 distinct gaps across 7 packages
- API surface candidates: 6 dead-`export` declarations to demote, 1 mismatch (`WrapDatabaseError` import style)

**Package with most issues:** `packages/seedcord` (~24 findings across HIGH/MEDIUM/LOW), driven by the bot utilities (H1–H3), decorators (M5, M13, M14), HMR (M29), and effects (H10, M28).
**Most common antipattern:** Silent error swallowing — appears in `fetchGuildMember`, `fetchRole`, `fetchText`, `attemptSendDM`, `Mongo.disconnect`, `KyselyPg.disconnect`, `Confirmable.onResolved`, `filterCirculars` (3 catches), and the `mongoose.deleteModel` cleanup path. AGENTS.md `FAIL-FAST-RULES` is the rule being broken most often.

---

## Tool reconciliation (TASK-08.5 cross-check, 2026-05-25)

### knip findings (framework packages scope)

Mostly unused TYPE exports flagged — likely a mix of true dead exports + public-API exports knip can't see are consumed externally. Real triage in TASK-11.

- **Unused types/interfaces (selected):**
    - `packages/plugins/src/kysely-pg/types/KpgMigration.ts:11`: `MigrationFn`
    - `packages/plugins/src/kysely-pg/types/KpgServices.ts:32,39`: `DefaultKpgDatabase`, `DefaultKpgService`
    - `packages/seedcord/src/bot/decorators/Command.ts:19,26,35,52`: `CommandCtor`, `GlobalMeta`, `GuildMeta`, `CommandScope`
    - `packages/seedcord/src/bot/decorators/Confirmable/types.ts:41,48,57,83`: `ExtractComponent`, `ContainerLike`, `EmbedLike`, `ComponentsV2Payload`
    - `packages/seedcord/src/bot/decorators/Interactions.ts:61,71,198`: `HandlerEventType`, `AssertHandles`, `SelectMenuInteractionFor`
    - `packages/seedcord/src/bot/injectors/EmojiInjector.ts:20`: `EmojiConfigValue`
    - `packages/seedcord/src/bot/utilities/Types.ts:5`: `MessageContent`
    - `packages/seedcord/src/effects/types/Effects.ts:8,52`: `DefaultEffects`, `EffectParams`
    - `packages/seedcord/src/interfaces/Handler.ts:71,280`: `HandlerWithChecks`, `AutocompleteHandlerConstructor`
    - `packages/services/src/Errors/SeedcordError.ts:19,171,185,194`: `SeedcordErrorOptions`, `SeedcordErrorVariant`, `AnySeedcordErrorForCode`, `ErrorTypeFilter`
    - `packages/services/src/Lifecycle/LifecycleTypes.ts:5`: `LifecycleAction`
- **Unused dependencies (verify before removing):**
    - `discord.js` in `packages/services` (services imports `discord.js` types — false positive worth verifying)
    - `mongoose` in `mock/`
    - `typedoc-plugin-dt-links` + `typedoc-plugin-mdn-links` in both `packages/docs-engine` and `packages/docs-generator` (loaded via typedoc config — false positive)
    - `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` in `packages/eslint-config` (re-exported by `typescript-eslint` — possible false positive but worth verifying)
- **Root unused devDependencies (real candidates for removal):**
    - `@swc/core` — was a tsup transformer; tsdown uses oxc. Likely removable.
    - `@types/chai`, `chai` — vitest doesn't require chai-style assertions; check usage.
    - `nodemon` — no script references it in package.json.
- **Unlisted binary:** `continue` (knip thinks "continue" referenced in changeset content is a binary). False positive; can be ignored or added to `ignoreBinaries`.

### Owner for fixes

NOT addressed in TASK-08.5. Real fixes happen in TASK-11. Triage rule: each finding → fix OR justified suppression in `knip.json` `ignoreDependencies` / `ignoreBinaries` / extra `entry` patterns. Per the strict-validation policy (locked this session): suppressions must include a justification comment in this audit.
