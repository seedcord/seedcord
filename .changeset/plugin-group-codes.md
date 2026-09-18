---
'@seedcord/errors': minor
---

Added `CorePluginGroupTaken` (1215) for nesting under a name the bot already uses, `CorePluginKeyHoldsGroup` (1216) for attaching a plugin where a group sits, and `CorePluginKeyMalformed` (1217) for a key with an empty part or a second dot. A repeated key still throws `CorePluginKeyExists`.
