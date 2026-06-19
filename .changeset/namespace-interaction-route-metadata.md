---
'seedcord': patch
---

Harden interaction routing against metadata-key collisions. Route metadata is now keyed by unique Symbols instead of plain strings, so a third-party `Reflect.defineMetadata` call using a generic string key can no longer overwrite a handler's routes.
