---
'@seedcord/cli': minor
---

Bump `ink` `^6.6.0` → `^7.0.4`. Requires React 19.2+ and Node 22+ (already satisfied by seedcord catalog peers). `ink-spinner@5.0.0`'s declared peer (`ink: ">=4.0.0"`) accepts ink 7, so no replacement spinner needed. seedcord's only `useInput`-touching site (`ChannelSelector.tsx`) uses `key.escape` whose semantics are unchanged in ink 7.
