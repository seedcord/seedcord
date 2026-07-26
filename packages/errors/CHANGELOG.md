# @seedcord/errors

## 0.3.0-next.5

### Patch Changes

- 25b58be: New `ConfigManifestNotGenerated` code, thrown when the generated route manifest is imported before `seedcord build` emits it. New `LifecycleRestartAfterFailure` code, thrown when a host whose startup failed is started again.

## 0.3.0-next.4

### Minor Changes

- 3817214: New code 1614 `AutocompleteNoFocusedOption`, thrown when an autocomplete payload has no focused option.
- e17f818: New codes `ConfigMissingPublicKey` (1008) and `ConfigIncorrectPublicKey` (1009) for the `DISCORD_PUBLIC_KEY` env var.
- c959e1a: Add the reply-surface error code `ReplyCallbackMissingMessage`, thrown when a `withResponse` interaction callback returns no created message. The foreign-target message now names the calling method, so `delete()` renders its own name.
- 5ec46ca: **BREAKING:** `ConfigUnknownExceptionWebhookMissing`, `ConfigUnknownExceptionWebhookInvalid`, `ConfigHandledExceptionWebhookMissing`, and `ConfigHandledExceptionWebhookInvalid` are removed. `ConfigWebhookUrlInvalid` covers a malformed webhook url for any reporter, `ConfigWebhookNotFound` covers a webhook Discord answers 404 or 401 for at boot, `DecoratorWebhookUrlMissing` covers a `WebhookLog` subclass without `@WebhookUrl`, and `ConfigEmojiUnresolved` renumbers to 1005.
- 137e641: Add the reply-surface error codes `ReplyIllegalAckState`, `ReplyComponentSerialization`, `ReplyForeignEditTarget`, and `ReplyUpdateWithoutSource`.

## 0.3.0-next.3

### Minor Changes

- e60fcf7: New `@seedcord/event-emitter` package, a pure-JS `TypedEventEmitter` with typed per-event tuples and zero runtime dep (no `node:events`). `waitFor(event, { filter, signal, timeoutMs })` resolves on the first matching payload, and rejects with a `WaitForError` whose `reason` is `'aborted'` or `'timeout'`. `EventMap`, `NoEvents`, and `WaitForOptions` are exported. `@seedcord/gateway` re-exports the package.

    `TypedEventEmitter` does not bind `this` to the emitter inside a listener (use an arrow or a bound method), and a bare `error` event with no listener no longer throws.

    An `any:interaction` or `any:event` observer that throws no longer aborts the interaction or event dispatch. The dispatcher passes the error to the emitter's `onListenerError` hook, which logs it.

    **BREAKING:** `@seedcord/services` no longer exports `StrictEventEmitter` or the `SE*` types. Extend `TypedEventEmitter` and use `EventMap` / `NoEvents` for the event-map constraint.

    **BREAKING:** the `Plugin` and `Pluggable` bases extend `TypedEventEmitter`. `setMaxListeners` and the `addListener` alias are removed, use `on`.

    **BREAKING:** `@seedcord/errors` no longer defines the `EventEmitterWaitForAborted` (1501) and `EventEmitterWaitForTimeout` (1502) codes.

### Patch Changes

- e60fcf7: Raise `engines.node` to `>=24.3`, the floor for the `Error.isError` calls the framework uses.

## 0.3.0-next.2

### Minor Changes

- b384e8f: Add `ColorUnresolvable` and `ColorOutOfRange` error codes for color resolution.

## 0.3.0-next.1

### Minor Changes

- c046193: **BREAKING:** require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer.

## 0.2.2-next.0

### Patch Changes

- 8635423: Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one.
- 8635423: A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`.

## 0.2.1

### Patch Changes

- c3613bd: Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use.
- 78377fa: update LICENSE copyright year

## 0.2.0

### Minor Changes

- 7121c18: remove `BaseSeedcordError` from public exports

### Patch Changes

- 7121c18: Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands.
- 7121c18: `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable.

## 0.1.0

### Minor Changes

- 6e39348: Add two published leaf packages.

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.
