---
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/core': minor
---

`start(handler, n)` opens a paginator on any page. `page(handler, n)` renders one without sending it. A source you write yourself takes the new `PageSource<Item>` each transport exports.

**BREAKING:** `Paginator.page` takes the handler in place of a page context, matching `start`. `PaginatorBase.page` is now `protected buildPage`.
