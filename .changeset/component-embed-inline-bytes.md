---
'discord-component-embed': minor
---

**BREAKING:** Fixed an inline script over 3000 bytes passing every check while Discord fell back to the Open Graph card. `toComponentEmbed` and everything built on it now throw `OverLimit` for it, the same way `componentEmbedResponse` already did.
