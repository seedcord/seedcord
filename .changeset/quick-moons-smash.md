---
'seedcord': minor
'create-seedcord': patch
'@seedcord/errors': patch
---

Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%.
