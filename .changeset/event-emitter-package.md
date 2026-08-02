---
'@seedcord/event-emitter': minor
---

New `@seedcord/event-emitter`, a pure-JS `TypedEventEmitter` with typed per-event tuples and no `node:events` dependency.

`waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload and rejects with a `WaitForError`. A listener's `this` is unbound, so use an arrow or a bound method.
