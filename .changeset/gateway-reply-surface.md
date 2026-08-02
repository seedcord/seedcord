---
'@seedcord/gateway': minor
---

Handlers reply through members on the base, `this.reply`, `defer`, `followUp`, `edit`, `delete`, and `send`, with `update` and `deferUpdate` on component kinds and `showModal` on non-modal kinds. Autocomplete handlers define `this.respond(choices)`.

**BREAKING:** `ReplySender` is no longer exported. An unmatched interaction now gets a reply from an unhandled default, and a failed `getConfirmation` or `Paginator.start` send throws into the fault boundary.
