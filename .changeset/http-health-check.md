---
'@seedcord/http': minor
---

Added a health path to a node http bot. Its interactions server answers `/health` with a 503 until startup finishes and a 200 after it, and `healthCheck: false` turns it off.
