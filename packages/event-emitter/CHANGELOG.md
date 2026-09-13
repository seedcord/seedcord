# @seedcord/event-emitter

## 0.1.5

### 🩹 Patch

- An async listener that throws used to crash the process. Its error now reaches `onListenerError`, the same as a synchronous one. This covers listeners registered with both `on()` and `once()`. ([#293](https://github.com/seedcord/seedcord/pull/293))

## 0.1.4

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

## 0.1.3

### 🩹 Patch

- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

## 0.1.1

### 🩹 Patch

- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

## 0.1.0

### 💥 Breaking

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/event-emitter`, a pure-JS `TypedEventEmitter` with typed per-event tuples and no `node:events` dependency. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload and rejects with a `WaitForError`. A listener's `this` is unbound, so use an arrow or a bound method.
