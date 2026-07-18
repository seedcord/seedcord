---
'@seedcord/http': minor
---

Add the gate surface: the `@Gated` decorator with per-kind matching (autocomplete handlers and `{ in: 'guild' }` permission gates are compile errors), and a dev-only warning when a dispatch's gate checks run past 750ms of the 3s ack budget combined, naming each gate's share. The root barrel now re-exports the whole `@seedcord/core` surface.

Gates don't run on autocomplete interactions, matching the gateway dispatcher.
