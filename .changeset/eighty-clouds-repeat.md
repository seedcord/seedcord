---
'@seedcord/logger': patch
---

Fix a sink that threw was still receiving records. The error line already said it won't. Now it does what the line said all this time.
