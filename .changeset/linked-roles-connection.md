---
'@seedcord/plugin-linked-roles': minor
---

A `connected` result from `onResult` or `push()` now has a `connection` field with the values that the plugin sent to Discord, typed by your `records`. `ConnectionResult` and `LinkedRolesResult` now take your records as a type argument, like `LinkedRolesResult<typeof records>`.
