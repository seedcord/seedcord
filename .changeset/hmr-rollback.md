---
'seedcord': minor
'@seedcord/cli': minor
'@seedcord/errors': patch
---

A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`.
