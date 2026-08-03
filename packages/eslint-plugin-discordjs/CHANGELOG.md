# eslint-plugin-discordjs

## 0.1.0-next.3

### Patch Changes

- b03c8cd: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.

## 0.1.0-next.2

### Minor Changes

- 94912d9: Add `require-button-props`, a rule reporting a sealed button missing its style or its style's required props (customId, url, skuId, label/emoji). Extend `no-conflicting-button-props` with style-aware checks (url on styles 1-4, skuId conflicts under any style, the Premium prop bans), read builder constructor data in both key casings across the button, select-menu bound, and limit rules, and count the array-form and rest-form call conventions in `no-discord-limit-exceeded`.

## 0.1.0-next.1

### Patch Changes

- 7174db3: update README to add tseslint instructions

## 0.1.0-next.0

### Minor Changes

- 9650385: Initial release. Ten type-aware ESLint rules for discord.js bots.
