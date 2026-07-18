# @seedcord/http

## 0.1.0-next.0

### Minor Changes

- b03c8cd: **BREAKING:** the `BaseHandler` class is removed from the package root, `@seedcord/core` defines it now. Import it from `@seedcord/core` instead. The type unions (`ValidInteractionTypes`, `Repliables`) are unchanged.
- 3817214: Component and modal handlers decode customIds: the route decorators (exported from the package root) register the definitions, and `this.params` / `this.match` read the decoded values.

    **BREAKING:** `SelectMenuHandler` takes the select kind as its first generic (`SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]>`) and narrows `event.data` to that kind. The manifest row types are removed from the package root exports, `RouteManifest` stays, and the `AutocompleteRoute` identifier now names the decorator.

- 701b669: Add the gate surface: the `@Gated` decorator with per-kind matching (autocomplete handlers and `{ in: 'guild' }` permission gates are compile errors), and a dev-only warning when a dispatch's gate checks run past 750ms of the 3s ack budget combined, naming each gate's share. The root barrel now re-exports the whole `@seedcord/core` surface.

    Gates don't run on autocomplete interactions, matching the gateway dispatcher.

- e17f818: New `@seedcord/http` package, the HTTP-interactions receiver. `createSeedcord()` returns a `(request: Request) => Promise<Response>` handler that verifies the Ed25519 signature over the raw request bytes (WebCrypto, no `node:crypto`), rejects timestamps more than five minutes from the receiver clock and exact replays of an accepted signature with 401, answers a PING with an in-body PONG, and acks every other interaction with an empty 202. Dispatch to handlers is unbuilt. A verified interaction is logged and dropped after the ack. The public key is read from `DISCORD_PUBLIC_KEY` through envapt, missing or malformed values throw at construction.
- c959e1a: `reply()` and `update()` throw the registered `ReplyCallbackMissingMessage` error when the interaction callback carries no created message. `this.delete()` removes the initial reply or a message the interaction sent.
- 137e641: Add the reply surface and manifest dispatch. Handler bases (`SlashHandler`, `ContextMenuHandler`, `ButtonHandler`, `SelectMenuHandler`, `ModalHandler`, `AutocompleteHandler`) reply through `this.reply` / `defer` / `followUp` / `edit` / `send`, component kinds add `update` / `deferUpdate`, non-modal kinds add `showModal`. Matched interactions run their gates before the ack and `execute()` continues past the 202.

    **BREAKING:** `createSeedcord(config, manifest)` replaces the zero-arg form and reads `DISCORD_BOT_TOKEN` at construction.

- 3817214: The handler bases read typed options off the raw payload: `SlashHandler` adds `options` and `match`, `AutocompleteHandler` adds `focused`, `match`, `options`, and `route`. A channel option declared with `addChannelTypes` narrows `getChannel` to the matching resolved-channel subtype.

    **BREAKING:** `ContextMenuHandler` takes a kind generic (`ApplicationCommandType.User` or `Message`) and exposes `target` and `targetMember`.

### Patch Changes

- b03c8cd: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt 8.1. A bot declaring its own envapt needs `^8.1.0` there too, an older pin installs a second copy whose `Envapter` state (the bound source, the detected environment) splits from the framework's.
- Updated dependencies [3817214]
- Updated dependencies [137e641]
- Updated dependencies [b03c8cd]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [e17f818]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
- Updated dependencies [b03c8cd]
- Updated dependencies [c89adde]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [701b669]
- Updated dependencies [137e641]
- Updated dependencies [137e641]
- Updated dependencies [3817214]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
- Updated dependencies [5ec46ca]
    - @seedcord/errors@0.3.0-next.4
    - @seedcord/core@0.1.0-next.5
    - @seedcord/types@0.8.0-next.6
    - @seedcord/utils@0.8.0-next.6
    - @seedcord/logger@0.1.0-next.1
    - @seedcord/rate-limiter@0.1.0-next.3
