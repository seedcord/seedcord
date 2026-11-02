---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** The override options on every gate and permission helper now take a `Notice` class for seedcord to construct with that refusal's data, like the missing permission names or a cooldown's `resetAt`. Write a small class where you passed `{ message }`, a `Notice` instance, or Cooldown's functions. `missingNotice` and `dangerousNotice` became one `notice` that also covers `inverse`.
