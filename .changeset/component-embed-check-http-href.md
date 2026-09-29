---
'discord-component-embed': patch
---

Fixed `check` failing a page whose `<link>` points at an `http://` URL. Discord fetches that JSON over http and shows the card.
