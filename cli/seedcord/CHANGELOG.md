# seedcord

## 0.19.2-next.0

### Patch Changes

- 554129a: `seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord.
- 554129a: Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one.
- 554129a: `seedcord codegen` now throws and names the file when a class carrying `@RegisterCommand` fails to construct.
- Updated dependencies [1bf7d89]
- Updated dependencies [9b6a31c]
- Updated dependencies [9b6a31c]
- Updated dependencies [2cb3c87]
- Updated dependencies [9b6a31c]
- Updated dependencies [554129a]
- Updated dependencies [5b15463]
- Updated dependencies [8dc4791]
- Updated dependencies [554129a]
- Updated dependencies [5f4e203]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [0ad8bd1]
- Updated dependencies [8dc4791]
- Updated dependencies [6872865]
- Updated dependencies [3ff40e7]
- Updated dependencies [64c9a0e]
- Updated dependencies [554129a]
- Updated dependencies [9b6a31c]
- Updated dependencies [0c6cdc8]
- Updated dependencies [e4e8605]
- Updated dependencies [554129a]
    - @seedcord/errors@0.5.0-next.0
    - @seedcord/core@0.4.0-next.0
    - @seedcord/event-emitter@0.1.5-next.0
    - @seedcord/logger@0.2.2-next.0
    - @seedcord/types@0.10.0-next.0
    - @seedcord/utils@0.8.8-next.0

## 0.19.1

### Patch Changes

- 6b1cfbf: _Kinda BREAKING:_ Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`.
- Updated dependencies [a98d27b]
- Updated dependencies [6b1cfbf]
- Updated dependencies [aa4d4c0]
- Updated dependencies [b29904c]
    - @seedcord/core@0.3.1
    - @seedcord/errors@0.4.3
    - @seedcord/utils@0.8.7

## 0.19.0

### Minor Changes

- a46a7dd: **BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.

### Patch Changes

- Updated dependencies [a46a7dd]
    - @seedcord/core@0.3.0
    - @seedcord/errors@0.4.2

## 0.18.2

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [8f662bb]
- Updated dependencies [1d2f1e3]
    - @seedcord/core@0.2.1
    - @seedcord/event-emitter@0.1.4
    - @seedcord/errors@0.4.1
    - @seedcord/logger@0.2.1
    - @seedcord/utils@0.8.6
    - @seedcord/types@0.9.1

## 0.18.1

### Patch Changes

- Update package.json desc

## 0.18.0

### Minor Changes

- aa6bb3a: **BREAKING:** sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`.

### Patch Changes

- 97b62ef: Update log colors in some places.
- 7553449: Better encapsulate framework internals.

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- d717336: `seedcord dev` and `seedcord build` now correctly resolve the `paths` a project declares in its tsconfig. The build also rewrites dynamic relative imports, which node rejected for having no extension.
- 2476bae: Show the actual CLI version in the TUI top left, and transport version as a row in the status block. Also show 'seedcord create' in the `create-seedcord` banner.
- Updated dependencies [1364c82]
- Updated dependencies [97b62ef]
- Updated dependencies [ad1e4d5]
- Updated dependencies [aa6bb3a]
- Updated dependencies [7553449]
- Updated dependencies [f39cde0]
- Updated dependencies [5c7c3e2]
- Updated dependencies [a259cdc]
- Updated dependencies [1364c82]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c343f4a]
- Updated dependencies [e11cbb3]
- Updated dependencies [ad1e4d5]
- Updated dependencies [1364c82]
    - @seedcord/errors@0.4.0
    - @seedcord/logger@0.2.0
    - @seedcord/core@0.2.0
    - @seedcord/event-emitter@0.1.3
    - @seedcord/types@0.9.0
    - @seedcord/utils@0.8.5

## 0.17.4

### Patch Changes

- 0738efa: Add optional profiling. Enable with `SEEDCORD_DEV_PROFILE=1`
- 71a0b99: _Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
- 8e8e952: _Kinda BREAKING?:_ `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`.
- 2efe2f7: Fixed the channel dot in `seedcord dev` rendering as a white emoji on Windows and Linux. Also dropped the arrow from the two resize hints.
- ca24b0d: Ignore churn files in hmr
- 527a465: Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%.
- Updated dependencies [71a0b99]
- Updated dependencies [8e8e952]
- Updated dependencies [527a465]
    - @seedcord/core@0.1.4
    - @seedcord/logger@0.1.4
    - @seedcord/errors@0.3.4
    - @seedcord/event-emitter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.4

## 0.17.3

### Patch Changes

- Fix seedcord dev failing while attempting to parse decorators

## 0.17.2

### Patch Changes

- dfd7dc2: Fix cli bin missing shebang so npm works correctly
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
- Updated dependencies [9b0a6a6]
    - @seedcord/errors@0.3.3
    - @seedcord/logger@0.1.3
    - @seedcord/core@0.1.3
    - @seedcord/utils@0.8.3

## 0.17.1

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/core@0.1.2
    - @seedcord/errors@0.3.2
    - @seedcord/event-emitter@0.1.2
    - @seedcord/logger@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.17.0

### Minor Changes

- 0642de5: `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place.

### Patch Changes

- d470ad4: Config resolution and the tsc watch relay now log at debug and trace.
- d470ad4: Updated gen file's comment.
- c567fea: Bump deps.
- 5b57bda: A dev log line too long for the pane now wraps onto the next line, and re-wraps when the terminal resizes.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [814902a]
- Updated dependencies [c567fea]
- Updated dependencies [5b57bda]
- Updated dependencies [0642de5]
- Updated dependencies [d470ad4]
- Updated dependencies [d470ad4]
- Updated dependencies [814902a]
    - @seedcord/core@0.1.1
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1
    - @seedcord/event-emitter@0.1.1

## 0.16.0

### Minor Changes

- 789f17a: `seedcord codegen` writes the `Core` augmentation for every attached plugin, so `this.core.db` types with no hand-written `declare module`. It resolves each key off your bot's default export, which needs `moduleResolution: bundler`.
- 789f17a: `seedcord dev` renders each log line as a level chip, a clock, a channel dot, and a label.

    The layout adapts to the terminal size. A short terminal collapses the filter chips, and a shorter one replaces the sidebar with a status line.

- 789f17a: **BREAKING:** `seedcord` is the CLI. The gateway framework moved to `@seedcord/gateway`. Keep importing `defineConfig` from here.
- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [701b669]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [93544a8]
    - @seedcord/core@0.1.0
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/event-emitter@0.1.0

## 0.4.0-next.4

### Patch Changes

- 7174db3: The dev sidebar no longer shows the config paths and now shows the framework version. The rail width locks at the first running render of each run.
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
    - @seedcord/core@0.1.0-next.2
    - @seedcord/types@0.8.0-next.3
    - @seedcord/services@0.9.0-next.4
    - @seedcord/utils@0.8.0-next.3
    - @seedcord/errors@0.3.0-next.2

## 0.4.0-next.3

### Patch Changes

- Updated dependencies [b384e8f]
- Updated dependencies [b384e8f]
- Updated dependencies [7f4fb2e]
    - @seedcord/errors@0.3.0-next.2
    - @seedcord/core@0.1.0-next.1
    - @seedcord/services@0.9.0-next.3
    - @seedcord/types@0.8.0-next.2
    - @seedcord/utils@0.8.0-next.2

## 0.4.0-next.2

### Patch Changes

- 993f609: **BREAKING:** The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`.
- Updated dependencies [993f609]
    - @seedcord/core@0.1.0-next.0
    - @seedcord/types@0.8.0-next.2
    - @seedcord/services@0.9.0-next.2
    - @seedcord/utils@0.8.0-next.2

## 0.4.0-next.1

### Minor Changes

- c046193: **BREAKING:** require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer.

### Patch Changes

- c046193: Measure the `seedcord dev` layout in `useLayoutEffect` so the first frame renders at the correct size.
- c046193: Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change.
- Updated dependencies [c046193]
- Updated dependencies [d8b91f5]
- Updated dependencies [c046193]
    - @seedcord/services@0.9.0-next.1
    - @seedcord/utils@0.8.0-next.1
    - @seedcord/types@0.8.0-next.1
    - @seedcord/errors@0.3.0-next.1

## 0.4.0-next.0

### Minor Changes

- 8635423: A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`.

### Patch Changes

- 8635423: Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted.
- Updated dependencies [8635423]
- Updated dependencies [8635423]
- Updated dependencies [8635423]
    - @seedcord/errors@0.2.2-next.0
    - @seedcord/types@0.7.2-next.0
    - @seedcord/services@0.8.3-next.0
    - @seedcord/utils@0.7.1-next.0

## 0.3.1

### Patch Changes

- 0a19719: small fix in the command desc
- 78377fa: update LICENSE copyright year
- Updated dependencies [78377fa]
- Updated dependencies [c3613bd]
- Updated dependencies [0a19719]
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
    - @seedcord/utils@0.7.0
    - @seedcord/errors@0.2.1
    - @seedcord/services@0.8.2
    - @seedcord/types@0.7.1

## 0.3.0

### Minor Changes

- 7121c18: Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands.
- 7121c18: Type configured emojis precisely. `seedcord codegen` now writes an `EmojiMap` block that tags each key `'application'` or `'guild'`, and `Emojis.X` (and `bot.emojis.X`) resolves to the exact `ApplicationEmoji` or `GuildEmoji` rather than the union. Configure `config.bot.emojis` with the new `EmojiConfig` type and run `seedcord codegen`, you no longer hand-write the `EmojiMap` augmentation. The generated file is renamed from `command-registry.gen.ts` to `seedcord-gen.d.ts`, so delete the old file and re-run `seedcord codegen`.

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [043e2a1]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - @seedcord/services@0.8.1
    - @seedcord/utils@0.6.1
    - @seedcord/errors@0.2.0
    - @seedcord/types@0.7.0

## 0.2.1

### Patch Changes

- 6e39348: Depend on `@seedcord/errors` directly for the CLI's own throws, and correct the config-schema default-value tsdoc tags.
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [180b5a9]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/services@0.8.0
    - @seedcord/types@0.6.0
    - @seedcord/errors@0.1.0
    - @seedcord/utils@0.6.0

## 0.2.0

### Minor Changes

- 19bae0a: `seedcord dev` regenerates the typed slash registry when you accept a command refresh, so option types track command edits without running `seedcord codegen` by hand. Codegen also logs a line before it loads your instance, since reading the commands directory constructs the bot (it never starts it, so nothing logs in or connects).
- 19bae0a: - Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI.
    - **BREAKING** (`@seedcord/cli`): the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.
- 19bae0a: Add `routeLeavesOf` to `@seedcord/utils/internal`, the single walk that turns a slash command's JSON into its route-leaf keys. `@seedcord/cli` codegen now reads route leaves from there and depends on `discord-api-types` for its API enums and types instead of the full `discord.js` runtime.
- 19bae0a: - Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name.
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING**: `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING**: `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.
- 19bae0a: - Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route.
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING**: slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.

### Patch Changes

- 19bae0a: Fix duplicate colors and misalignment in the CLI
- 19bae0a: - Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry.
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING**: `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
    - @seedcord/types@0.5.0
    - @seedcord/utils@0.5.0
    - @seedcord/services@0.7.1

## 0.1.0

### Minor Changes

- 5a529d5: Redesign the `seedcord dev` dashboard and harden its lifecycle.
    - Two-column bottom-up layout: a left rail with the wordmark, phase status, a channel filter, and the hotkey legend, beside a wide log column. Logs are frameless, tail from the bottom, and scroll back through the buffer with the arrows, PgUp/PgDn, and t/b.
    - Channels are a live enable/disable filter rather than one-at-a-time switching, and each log line shows a colored channel tag. The status badge animates while running and shows CLI-computed uptime; the log directory is shown in the rail.
    - Notifications render as cards below the logs: an error card with a bounded stack, a restart-required card, and the y/n command-refresh prompt.
    - The UI renders in the alternate screen, so the terminal and its scrollback are restored on quit, and the on-disk log path is printed on exit. Ctrl-C and `q` always quit, restart and disconnect are idempotent, `d` is a no-op when no session is running, and the Vite runtime detaches its HMR listeners on dispose.
    - Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.

- fe77998: bump `ink` `^6.6.0` → `^7.0.4`. requires react 19.2+ and node 22+.
- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 2c4201b: Bump `commander` and `@commander-js/extra-typings` to v15.
- 7308d36: `seedcord build` now emits self-contained source maps (`--sourceMap --inlineSources`), so production stack traces resolve back to the original TypeScript. Run the built output with `node --enable-source-maps`.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/services@0.7.0
    - @seedcord/types@0.4.0
    - @seedcord/utils@0.4.0
