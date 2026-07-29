---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/plugins': minor
---

Both transports now export a `Plugin` base bound to their own `Core`, so a plugin reads `this.core.bot` on gateway and `this.core.rest` on http with no `Core` import. A plugin that runs on either transport keeps extending the base from `@seedcord/core/plugin`, whose `this.core` carries the shared members.

**BREAKING:** a plugin constructor takes `CoreBase` as its first parameter. Naming a transport `Core` there is a compile error at `attach`. Read the transport type off `this.core`.

Every attach gate reports as a sentence naming both values, for example `this plugin declares transport 'http' and this bot runs 'gateway'`.

**BREAKING:** a transport the imported base does not serve is a compile error on the type argument, so `Plugin<{ transport: 'http' }>` from `@seedcord/gateway` is rejected where it is declared.

**BREAKING:** `Mongo` and `KyselyPg` declare `transport: 'gateway'` and no longer expose a public `core`.
