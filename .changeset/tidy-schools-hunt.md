---
'@seedcord/eslint-config': patch
'create-seedcord': patch
---

Fixed the `prettier/prettier` rule ignoring your `prettier.config.mjs` and enforcing the seedcord defaults. Editing that file now changes what both prettier and eslint expect.
