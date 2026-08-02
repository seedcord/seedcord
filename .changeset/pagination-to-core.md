---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

`Paginator`, `ArraySource`, and `CursorSource` are available on `@seedcord/http`, matching gateway. A source loader on http receives `guildId` and fetches guild data through `core.rest`.

**BREAKING:** a custom `PageSource` takes the page context as a second type parameter, `PageSource<Item, PageContext>`.
