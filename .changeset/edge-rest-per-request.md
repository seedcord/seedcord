---
'@seedcord/http': patch
---

Fixed an edge bot's sends to a channel or webhook hanging for good once two interactions sent to it at the same time. Each request now gets its own REST client behind `core.rest`.
