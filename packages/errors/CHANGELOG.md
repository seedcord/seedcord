# @seedcord/errors

## 0.3.0

### Minor Changes

- 789f17a: **BREAKING:** the error-code set was reworked. Codes were added, removed, and renumbered across every group, so re-check any code you match on by name or by number.

    Notable removals, the four per-reporter webhook codes collapse into `ConfigWebhookUrlInvalid` and `ConfigWebhookNotFound`. `PluginMongo*` is now `PluginMongoose*` and `PluginKpg*` is now `PluginKysely*`.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

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
