---
'@seedcord/errors': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/custom-id': minor
'@seedcord/utils': minor
'@seedcord/plugin-mongoose': minor
'@seedcord/plugin-kysely-postgres': minor
'seedcord': minor
'create-seedcord': minor
---

**BREAKING:** A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`.
