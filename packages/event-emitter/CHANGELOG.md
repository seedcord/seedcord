# @seedcord/event-emitter

## 0.1.3-next.0

### Patch Changes

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.

## 0.1.2

### Patch Changes

- 272b729: Update comments

## 0.1.1

### Patch Changes

- c567fea: Set all packages' node floor to LTS.

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/event-emitter`, a pure-JS `TypedEventEmitter` with typed per-event tuples and no `node:events` dependency.

    `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload and rejects with a `WaitForError`. A listener's `this` is unbound, so use an arrow or a bound method.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.
