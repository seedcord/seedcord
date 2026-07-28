---
'@seedcord/gateway': major
---

**BREAKING:** `core.bot` no longer emits events, and `Bot` no longer extends the event emitter. The four keys move to the bus under new names. `error:unhandled:interaction` becomes `unhandledInteractionError`, `error:unhandled:event` becomes `unhandledEventError`, `any:event` becomes `anyEvent`, and `any:interaction` becomes `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber class.

**BREAKING:** `Paginator.start(interaction, core)` requires `core`, which it reads for the bus that publishes `responseSent`.
