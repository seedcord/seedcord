---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Select menus get one decorator and one base per kind. Each base declares only the members its own menu resolves. For example, `@UserMenuRoute` pairs with `UserMenuHandler`. The two-argument `SelectMenuHandler<Kind, Defs>` won't work going forward. Check the updated guide page for the new usage.
