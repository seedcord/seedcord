---
'@seedcord/core': minor
'@seedcord/gateway': minor
'seedcord': minor
---

Codegen captures a slash channel option's declared `addChannelTypes` into `SlashOptionRegistry`. The gateway `getChannel` narrows to the matching channel subtype, so a text-only option returns `TextChannel` with no cast.
