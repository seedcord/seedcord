---
'@seedcord/plugin-kysely': minor
---

**BREAKING:** The plugin now takes `dialect`, a function that returns any Kysely dialect. It no longer takes `pool`, `connectionString`, `onConnectSQL`, or `forceInsecureSSL`, and it no longer creates a missing database. For Postgres, pass `dialect: () => new PostgresDialect({ pool: new Pool({ connectionString }) })` and run your `onConnectSQL` statements in its `onCreateConnection`.
