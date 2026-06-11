---
'seedcord': minor
'@seedcord/utils': patch
'@seedcord/services': patch
---

- **BREAKING**: removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`.
- Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
- Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.
