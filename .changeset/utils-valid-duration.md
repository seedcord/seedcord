---
'@seedcord/utils': minor
---

**BREAKING:** `ValidDuration` now takes the literal as a type argument, like `ValidDuration<TText>`, and rejects a literal that `parseDuration` would return `null` for, like `'0s'` or `'1.5h'`.
