---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'seedcord': minor
---

Plugins can now define `codegen()`, and `seedcord codegen` writes what it returns into `seedcord-gen.ts`. A plugin reads that back with `Generated<typeof ThePlugin>`, keyed by its `static readonly id`.
