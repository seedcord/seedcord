---
'@seedcord/gateway': minor
---

Handlers reply through members on the base, `this.reply` / `defer` / `followUp` / `edit` / `delete` / `send`, with `update` / `deferUpdate` on component kinds and `showModal` on non-modal kinds (a modal handler rejects it at compile time). `this.delete()` removes the initial reply or a message the interaction sent. The autocomplete base defines `this.respond(choices)`. Unmatched interactions dispatch to unhandled defaults that reply "Feature not implemented yet." as a ComponentsV2 text display (empty choices on autocomplete). Webhook exception logs strip ANSI escapes and render the direct error cause, the compact fault log appends the cause's first line, and a `Silence` respects the new `errors.logSilences` config.

**BREAKING:** `ReplySender` is removed from the package exports. Reply through the handler members. A failed `getConfirmation` prompt or `Paginator.start` send now throws into the fault boundary (both previously swallowed the failure), and `Paginator.start` returns `Promise<Message>`.
