---
'discord-component-embed': patch
---

Fixed every `<` in a card's text, like the ones in custom emoji and mentions, costing six bytes of Discord's 3000-byte limit, because now only `</` and `<!--` get escaped.
