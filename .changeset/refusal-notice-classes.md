---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** Every gate and permission helper now replaces a refusal with a `Notice` class that seedcord constructs with that refusal's data, like the missing permission names or a cooldown's `resetAt`. Write a small class where you passed `{ message }`, a `Notice` instance, or Cooldown's functions. `missingNotice` and `dangerousNotice` became one `notice` that also covers `inverse`.
