---
'@seedcord/http': minor
---

`new Seedcord(config).start(port)` runs an HTTP-interactions bot on a node server: handler discovery from `config.bot.interactions.path`, dev HMR, a health server, coordinated shutdown with an in-flight drain, and plugin `attach`. `HttpConfig` discriminates on `runtime`, node-server options are compile errors on the `'edge'` arm. `this.api` on handlers is the typed Discord API (`@discordjs/core/http-only`) over the shared REST client. Edge builds import from `@seedcord/http/edge`.
