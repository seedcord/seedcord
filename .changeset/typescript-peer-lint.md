---
'eslint-plugin-discordjs': patch
'@seedcord/eslint-plugin': patch
'@seedcord/eslint-config': patch
---

Fixed the peer conflict a project on TypeScript 5 hit at install. The `typescript` peer now accepts 5.0 up to 6.0, the range typescript-eslint supports.
