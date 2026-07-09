---
'@seedcord/types': minor
---

`Config.logger?: LoggerConfig` configures logging on any transport, the gateway constructor reads it. The logger seam (`LogLevel`, `LogRecord`, `ILogSink`, `LoggerConfig`, `LogSinkHandle`) is exported from `@seedcord/types/internal` and re-exported by `@seedcord/logger`.
