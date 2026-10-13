---
'@seedcord/gateway': minor
---

Flipped the fallback of `errorStack` from `false` to `true` in `extractErrorResponse.ts`, so unknown faults log the stack trace by default. Gateway's short form appends `causeLine(error)`.