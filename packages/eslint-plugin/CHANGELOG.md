# @seedcord/eslint-plugin

## 0.1.0-next.3

### Minor Changes

- 5ec46ca: The decorator rules `event-handler-missing-register-event`, `middleware-missing-register-decorator`, `command-builder-missing-register-command`, and `interaction-handler-missing-route` match decorators by origin, the same way `subscriber-missing-decorators` does. An aliased or relative import counts, and a same-named decorator from another package no longer passes.
- c959e1a: Add the `no-raw-interaction-acks` rule to the recommended preset. It flags raw discord.js acknowledgement calls on a handler's interaction and names the replacement handler member.
- 5ec46ca: New rule `subscriber-missing-decorators`, on in the recommended preset. A concrete `Subscriber` subclass without `@Subscribe` is never registered by the bus, and a `WebhookLog` reporter without `@WebhookUrl` throws at boot. The decorators match by origin, an aliased import counts and a same-named decorator from another package never satisfies the rule.

### Patch Changes

- b03c8cd: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- Updated dependencies [b03c8cd]
    - eslint-plugin-discordjs@0.1.0-next.3

## 0.1.0-next.2

### Patch Changes

- Updated dependencies [94912d9]
    - eslint-plugin-discordjs@0.1.0-next.2

## 0.1.0-next.1

### Patch Changes

- 7174db3: update README to add tseslint instructions
- Updated dependencies [7174db3]
    - eslint-plugin-discordjs@0.1.0-next.1

## 0.1.0-next.0

### Minor Changes

- 9650385: Add @seedcord/eslint-plugin, type-aware rules that catch seedcord footguns before runtime. Exports `recommended` (the seedcord rules) and a `seedcord` preset that layers them over eslint-plugin-discordjs's recommended set.

### Patch Changes

- Updated dependencies [9650385]
    - eslint-plugin-discordjs@0.1.0-next.0
