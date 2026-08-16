---
'@seedcord/types': minor
'@seedcord/errors': minor
'@seedcord/logger': minor
---

**BREAKING:** `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these.
