---
'@seedcord/http': minor
'@seedcord/errors': patch
---

An http bot on `runtime: 'server'` deploys the commands at `bot.commands.path` during startup and fills the `Commands` accessor, matching gateway. The application id resolves over REST, since http holds no gateway session to read it from.
