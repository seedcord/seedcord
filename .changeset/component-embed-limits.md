---
'discord-component-embed': minor
---

**BREAKING:** Fixed a card with galleries holding 11 or more media items between them, like 10 + 1, passing every check while Discord fell back to the Open Graph card. `toComponentEmbed` and everything built on it now throw `OverLimit` past 10 items across all galleries.
