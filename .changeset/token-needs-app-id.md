---
'@seedcord/errors': patch
'create-seedcord': patch
---

Fixed a bot token whose first part holds no application id passing the token check. A bot now throws `ConfigInvalidEnv` for it at startup, and `create-seedcord` asks for the token again.
