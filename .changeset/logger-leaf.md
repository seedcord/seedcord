---
'@seedcord/logger': minor
---

New `@seedcord/logger` package. The core (`Logger`, `LoggerChannelRegistry`, `ObjectConsoleSink`) assembles a `LogRecord` and routes it through a level gate and two sink layers (config sinks plus a capture layer). The winston console and file sinks are exported from `@seedcord/logger/node`, so the core has no `node:*` imports and runs in edge workers. The `installSink` handle and `WinstonFileSink` implement `Symbol.dispose` for `using`.
