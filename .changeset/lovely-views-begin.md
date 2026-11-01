---
'@seedcord/gateway': minor
'@seedcord/core': minor
'@seedcord/types': minor
'@seedcord/http': minor
---

**BREAKING:** Plugin `init()`, `ready()`, `dispose()` and `onHmr()`, handler `execute()`, and middleware `after()` can now return without a promise. Code that calls one of them directly and chains `.then()` must `await` it or wrap it in `Promise.resolve()`.
