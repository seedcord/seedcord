---
'@seedcord/errors': minor
---

**BREAKING:** the error-code set was reworked. Codes were added, removed, and renumbered across every group, so re-check any code you match on by name or by number.

Notable removals, the four per-reporter webhook codes collapse into `ConfigWebhookUrlInvalid` and `ConfigWebhookNotFound`. `PluginMongo*` is now `PluginMongoose*` and `PluginKpg*` is now `PluginKysely*`.
