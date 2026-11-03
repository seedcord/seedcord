---
'@seedcord/custom-id': patch
'@seedcord/core': patch
---

Hovering a `CustomId`, its decoded `this.params` or a `match` arm, or an autocomplete's `this.focused` now shows the plain fields, like `{ userId: string; amount: number }`.
