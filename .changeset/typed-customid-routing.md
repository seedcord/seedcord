---
'seedcord': minor
'@seedcord/services': patch
---

- Add a typed customId system for buttons, modals, and select menus. Define a customId once with `new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny'])`, encode it onto a component, and read the decoded values back in the handler through `this.params` (single route) or `this.match` (several routes), fully typed end to end. Component handlers extend the new `ButtonHandler`, `ModalHandler`, and `SelectHandler` bases.
- Components route by a stable prefix, so a customId minted before its shape changed still reaches its handler and replies with a `StaleCustomId` message instead of failing silently.
- **BREAKING**: `@ButtonRoute`, `@ModalRoute`, and `@SelectMenuRoute` now take `CustomId` definitions instead of string prefixes. Passing a different definition to the decorator than the one in the handler's generic is a compile error.
- **BREAKING**: removed `getArgs()` and `getArg()` from handlers, along with the `-` delimited positional customId arguments. Read decoded values from `this.params` or `this.match` instead.
