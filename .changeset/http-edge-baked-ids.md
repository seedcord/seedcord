---
'@seedcord/http': minor
---

An edge bot now reads its public key, command ids and emoji ids from the worker `seedcord build` wrote, and `Commands`, `ContextMenus` and `Emojis` now work on edge. The bot no longer reads `DISCORD_PUBLIC_KEY`. A worker built some other way throws `CoreEdgeUnbuilt` on its first POST.
