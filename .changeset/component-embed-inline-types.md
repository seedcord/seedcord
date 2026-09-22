---
'discord-component-embed': patch
---

Installing the package no longer pulls in `discord-api-types`, because the Discord types it uses now ship inside its own type declarations.
