---
'seedcord': minor
'@seedcord/types': minor
---

Move error handling from the per-method `@Catchable`/`@EventCatchable` decorators to one controller boundary that catches every throw across the interaction and event lifecycle (middleware, construct, gate phase, execute).

- A `Denial` renders through `ReplySender`, a reporting `Denial` and a raw error publish to `handledException`/`unknownException`, and a `Silence` stops silently. Events are report-only and never auto-reply.
- Removes `@Catchable`, `@EventCatchable`, and the `setBreak`/`setErrored`/`shouldBreak`/`hasErrors` handler flags. Throw a `Silence` to stop a handler without a reply.
- `FaultSource` gains an `event` arm. Duplicate faults are throttled to one report per minute per route.
- `ignoreCustomIds` is now `CustomIdMatcher[]`, matched against the raw customId. Adds `errors.ignoreApiCodes` and `errors.ignoreEventApiCodes` (both empty by default, so a handler's own discord.js api error reports).
