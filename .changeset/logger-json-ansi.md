---
'@seedcord/logger': minor
---

Added a `json-ansi` format for `WinstonConsoleSink` that keeps ANSI color codes in `message`, so a tool that spawns the bot can render them. A bot in development prints it by default when its output is piped or redirected.
