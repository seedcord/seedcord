---
'@seedcord/eslint-config': patch
---

Fixed `restrict-template-expressions` rejecting an emoji in a template string, like `${Emojis.Streak}`, on both transports.
