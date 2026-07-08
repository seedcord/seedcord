---
'seedcord': patch
'@seedcord/plugins': patch
---

Some smol internal refactors. `seedcord` uses `using` in the `confirm` prompt and an async generator for the codegen directory walk. `@seedcord/plugins` uses `await using` for the pg pool and clients in the database bootstrapper.
