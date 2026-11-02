---
'@seedcord/gateway': minor
---

**BREAKING:** Fixed a handler running twice on each event when `@RegisterEvent` lists that event twice, across two stacked decorators too. `@RegisterEvent` now throws `DecoratorDuplicateKey` when the file loads.
