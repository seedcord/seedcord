---
'@seedcord/event-emitter': minor
'@seedcord/services': minor
'@seedcord/gateway': minor
'@seedcord/errors': minor
'seedcord': patch
---

New `@seedcord/event-emitter` package, a pure-JS `TypedEventEmitter` with typed per-event tuples and zero runtime dep (no `node:events`). `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload, and rejects with a `WaitForError` whose `reason` is `'aborted'` or `'timeout'`. `EventMap`, `NoEvents`, and `WaitForOptions` are exported. `@seedcord/gateway` re-exports the package.

`TypedEventEmitter` does not bind `this` to the emitter inside a listener (use an arrow or a bound method), and a bare `error` event with no listener no longer throws.

**BREAKING:** `@seedcord/services` no longer exports `StrictEventEmitter` or the `SE*` types. Extend `TypedEventEmitter` and use `EventMap` / `NoEvents` for the event-map constraint.

**BREAKING:** the `Plugin` and `Pluggable` bases extend `TypedEventEmitter`, and `setMaxListeners` is removed from their surface.

**BREAKING:** `@seedcord/errors` no longer defines the `EventEmitterWaitForAborted` (1501) and `EventEmitterWaitForTimeout` (1502) codes.
