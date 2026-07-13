---
'@seedcord/http': minor
---

Add the reply surface and manifest dispatch. Handler bases (`SlashHandler`, `ContextMenuHandler`, `ButtonHandler`, `SelectMenuHandler`, `ModalHandler`, `AutocompleteHandler`) reply through `this.reply` / `defer` / `followUp` / `edit` / `send`, component kinds add `update` / `deferUpdate`, non-modal kinds add `showModal`. Matched interactions run their gates before the ack and `execute()` continues past the 202.

**BREAKING:** `createSeedcord(config, manifest)` replaces the zero-arg form and reads `DISCORD_BOT_TOKEN` at construction.
