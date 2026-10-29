---
'seedcord': minor
'@seedcord/errors': minor
'@seedcord/types': patch
---

Added `seedcord make`, which writes new files from the Handlebars templates in your `templates` folder or in an installed plugin. It asks for each value the templates read. Your own helpers go under `make.helpers` in `seedcord.config.ts`.
