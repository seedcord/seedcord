---
'@seedcord/http': patch
---

Fixed an edge bot's sends to one channel or webhook hanging for good after two interactions sent to that channel or webhook at the same time. Each request now gets its own REST client behind `core.rest`.
