---
'@seedcord/eslint-config': patch
---

`@typescript-eslint/naming-convention` no longer warns on an object key that holds a function. A `match` arm keys on a route string or a context menu name, both of which carry slashes and spaces.
