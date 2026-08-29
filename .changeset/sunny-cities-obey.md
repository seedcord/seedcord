---
'@seedcord/core': minor
---

**BREAKING:** The `responseAttempted` payload is now a union of `ResponseSent` and `ResponseFailed`, both exported. Check `outcome` to reach `error`. Every framework payload field is readonly now, because the bus hands one object to every subscriber.
