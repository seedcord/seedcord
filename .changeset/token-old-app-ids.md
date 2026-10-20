---
'@seedcord/errors': patch
'create-seedcord': patch
---

Fixed the token check rejecting tokens of apps made before October 2015, which have 17-digit application ids.
