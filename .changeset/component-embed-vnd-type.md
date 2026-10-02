---
'discord-component-embed': minor
---

The script tag and the docs now use `type="application/vnd.discord.component-embed+json"`, Discord's own type for a component embed. `check` accepts it on a `<script>` or `<link>`, and still accepts `application/json`.
