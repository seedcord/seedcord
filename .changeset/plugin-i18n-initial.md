---
'@seedcord/plugin-i18n': minor
---

Added `@seedcord/plugin-i18n`, which gives every handler a `t` function that formats your Fluent messages in the user's Discord language. `seedcord codegen` types each message's key and variables. With a `commandTranslations` file per locale, the plugin also translates your commands before each deploy.
