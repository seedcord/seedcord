---
'eslint-plugin-discordjs': minor
---

Add `require-button-props`, a rule reporting a sealed button missing its style or its style's required props (customId, url, skuId, label/emoji). Extend `no-conflicting-button-props` with style-aware checks (url on styles 1-4, skuId conflicts under any style, the Premium prop bans), read builder constructor data in both key casings across the button, select-menu bound, and limit rules, and count the array-form and rest-form call conventions in `no-discord-limit-exceeded`.
