---
'@seedcord/errors': minor
---

Added `CorePluginGroupTaken` (1215), `CorePluginKeyHoldsGroup` (1216), and `CorePluginKeyEmptySegment` (1217). A grouped plugin key throws one of them when it collides with something the bot already holds, or when a part around the dot is empty.
