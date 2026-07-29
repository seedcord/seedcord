---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `PluginOptions.transport` and `.runtime` take `'any'` in place of `'both'`. `'any'` is the default for both axes, so a plugin that declares neither is unaffected.

**BREAKING:** `attach` now rejects a plugin whose declared `transport` or `runtime` the host does not run, and an edge host rejects every plugin. The error message contains the plugin's declared value and the bot's.

A plugin declaring any of `transport`, `runtime`, or `needs` can now be attached. Before this, `attach` accepted only plugins that declared no options.

`new Seedcord(config)` on http reads its runtime from the config it is constructed with. A config typed as the whole `HttpConfig` union leaves the host on both runtimes and it accepts no plugins, so narrow the config to `HttpServerConfig` to attach.
