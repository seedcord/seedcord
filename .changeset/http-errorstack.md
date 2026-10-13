---
'@seedcord/http': minor
---

Flipped the fallback of `errorStack` from `false` to `true` in `dispatchInteraction.ts`, so unknown faults log the stack trace by default. http's short form now also appends `causeLine(error)` to match gateway.