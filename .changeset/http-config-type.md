---
'@seedcord/http': patch
---

Fixed a type error when you assign a config key like `botColor` or `ownerIds` to `seedcord.config` on an http bot. TypeScript rejected any optional key that your `new Seedcord()` call left out.
