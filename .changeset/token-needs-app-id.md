---
'@seedcord/errors': patch
'create-seedcord': patch
---

Fixed the token check accepting a bot token whose first part holds no application id. A bot now throws `ConfigInvalidEnv` for it at startup, and `create-seedcord` asks for the token again.
