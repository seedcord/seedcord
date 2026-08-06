# @seedcord/event-emitter

## 0.1.1

### Patch Changes

- c567fea: Set all packages' node floor to LTS.

## 0.1.1-next.0

### Patch Changes

- c567fea: Set all packages' node floor to LTS.

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/event-emitter`, a pure-JS `TypedEventEmitter` with typed per-event tuples and no `node:events` dependency.

    `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload and rejects with a `WaitForError`. A listener's `this` is unbound, so use an arrow or a bound method.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.
