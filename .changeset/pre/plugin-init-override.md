---
'@seedcord/plugin-i18n': patch
'@seedcord/plugin-kysely': patch
'@seedcord/plugin-linked-roles': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-oauth': patch
'@seedcord/plugin-tasks': patch
'create-seedcord': patch
---

`init()` is now marked `override` as `init()` is optional on `Plugin` in `@seedcord/core`.
