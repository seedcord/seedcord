# @seedcord/event-emitter

## 0.1.0-next.0

### Minor Changes

- e60fcf7: New `@seedcord/event-emitter` package, a pure-JS `TypedEventEmitter` with typed per-event tuples and zero runtime dep (no `node:events`). `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload, and rejects with a `WaitForError` whose `reason` is `'aborted'` or `'timeout'`. `EventMap`, `NoEvents`, and `WaitForOptions` are exported. `@seedcord/gateway` re-exports the package.

    `TypedEventEmitter` does not bind `this` to the emitter inside a listener (use an arrow or a bound method), and a bare `error` event with no listener no longer throws.

    An `any:interaction` or `any:event` observer that throws no longer aborts the interaction or event dispatch. The dispatcher passes the error to the emitter's `onListenerError` hook, which logs it.

    **BREAKING:** `@seedcord/services` no longer exports `StrictEventEmitter` or the `SE*` types. Extend `TypedEventEmitter` and use `EventMap` / `NoEvents` for the event-map constraint.

    **BREAKING:** the `Plugin` and `Pluggable` bases extend `TypedEventEmitter`. `setMaxListeners` and the `addListener` alias are removed, use `on`.

    **BREAKING:** `@seedcord/errors` no longer defines the `EventEmitterWaitForAborted` (1501) and `EventEmitterWaitForTimeout` (1502) codes.

### Patch Changes

- e60fcf7: Raise `engines.node` to `>=24.3`, the floor for the `Error.isError` calls the framework uses.
