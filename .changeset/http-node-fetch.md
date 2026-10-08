---
'@seedcord/http': minor
'@seedcord/errors': minor
---

The node `Seedcord` now has `fetch(request)` for mounting the bot on a route in your own server, like a Hono app. Set `port: false` to turn off the built-in server. `fetch` throws `CoreFetchBeforeStart` until `start()` is called, and answers 503 once shutdown begins.
