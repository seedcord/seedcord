---
'@seedcord/core': minor
---

Flipped the fallback of `errorStack` from `false` to `true` in `processErrors.ts`, so unknown faults log the stack trace by default instead of `uuid | message`.