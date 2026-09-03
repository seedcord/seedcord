---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/types': patch
---

`CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows.
