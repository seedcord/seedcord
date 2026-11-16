---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Fixed an error card posting publicly after `defer({ ephemeral: false })`. When a `send()` or `followUp()` passes a different `ephemeral` than the defer, seedcord now deletes the placeholder and sends a new message with that value.
