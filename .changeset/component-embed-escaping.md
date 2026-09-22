---
'discord-component-embed': patch
---

Fixed `toComponentEmbedJson`, `toComponentEmbedScript`, and `<ComponentEmbed>` spending six of Discord's 3000 bytes on every `<`, like the ones in custom emoji and mentions, by escaping only `</` and `<!--`.
