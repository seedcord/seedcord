---
'@seedcord/errors': minor
---

`PluginKyselyConnectionFailed` and `PluginKyselyBootstrapFailed` cover the two Postgres startup failures that previously surfaced as raw errors.

**BREAKING:** `PluginMongooseModelDecoratorMissing` is removed along with the decorator it reported on.
