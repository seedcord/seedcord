---
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/core': minor
---

`start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound.

**BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.
