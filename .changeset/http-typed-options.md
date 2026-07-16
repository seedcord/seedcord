---
'@seedcord/http': minor
---

The handler bases read typed options off the raw payload: `SlashHandler` adds `options` and `match`, `AutocompleteHandler` adds `focused`, `match`, `options`, and `route`. A channel option declared with `addChannelTypes` narrows `getChannel` to the matching resolved-channel subtype.

**BREAKING:** `ContextMenuHandler` takes a kind generic (`ApplicationCommandType.User` or `Message`) and exposes `target` and `targetMember`.
