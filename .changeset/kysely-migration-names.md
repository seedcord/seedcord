---
'@seedcord/plugin-kysely-postgres': minor
---

**BREAKING:** Fixed your built bot throwing `corrupted migrations` against a database that `seedcord dev` migrated from a file or an array path. Because the recorded name kept its extension, `001-create-users.ts` and `001-create-users.js` counted as two migrations. If a database already holds a name like that, rename its row in `kysely_migration` to the name without the extension.
