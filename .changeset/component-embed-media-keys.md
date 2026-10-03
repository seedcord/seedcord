---
'discord-component-embed': patch
---

`fromPayload` and `check` now reject any key in `media` other than `url`, like `width` or `proxy_url`. Discord shows the Open Graph card for those.
