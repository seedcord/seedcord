---
'@seedcord/core': patch
---

`and` and `or` now bracket an arm that is itself a combinator. `or(and(A, B), C)` names itself `(A & B) | C` on a `@Gated` hover and in the compile error for a gate that does not fit its handler.
