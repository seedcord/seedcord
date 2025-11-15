# seedcord

## 0.10.3

### Patch Changes

- 398b08f: A previous change to make interaction handler routing decorators be very strict with types made it so that you couldn't use more than one on a single InteractionHandler anymore, which was a previous behavior that worked. This change now infers the types provided to the generic of InteractionHandler, extracts the type of the class, and compares it to the types expected by each decorator being used. It'll also tell you which one is missing in case of a mismatch.

## 0.10.2

### Patch Changes

- strictly type the SelectMenuRoute decorator on a select menu interaction handler based on the SelectMenuType passed in

## 0.10.1

### Patch Changes

- ce0d4bc: add inferred literal string type to buildCustomId method so the customId shows up on hover

## 0.10.0

### Minor Changes

- 2049570: you can now pass in a tuple to the emojis map like [emojiName, guildId] where both the values are strings. the injector will then look through cached guilds and inject the emoji from that guild.
- 6d12a7c: seedcord provided Emojis map will now either have the full ApplicationEmoji object, GuildEmoji object, or the provided string if an emoji is not found.
- 6fc2b8f: require all emojis in the EmojiMap to be provided in config
- c0bf149: **BREAKING**: replaced the checkPermissions param-based calls with an options-style api and overloads that now require passing the target (role or member) and context (guild or channel) explicitly; added inverse and custom error support so usage signatures have changed and previous direct calls will need updating

### Patch Changes

- 485670a: add optional custom error input for hasPermsToAssign function as well
- Updated dependencies [6e067da]
- Updated dependencies [c0bf149]
    - @seedcord/utils@0.3.6
    - @seedcord/services@0.5.0

## 0.9.1

### Patch Changes

- fix incorrect break on silent preventing unknownException effect from firing

## 0.9.0

### Minor Changes

- c27ca87: **BREAKING**: new option to silence caught errors in event handlers. you can now prevent the decorator from trying to send the error response in chat. The signature of the decorator has changed, making it a breaking change.

## 0.8.1

### Patch Changes

- debug logging for emoji injection

## 0.8.0

### Minor Changes

- a1a90e6: ignored key list for interactions now also accepts RegExp patterns.
- a1a90e6: core.bot will now emit some useful events. (unhandled errors and all events)
- a1a90e6: new StrictEventEmitter class. Plugin extends this now so strongly typed EventEmitter methods are available on all plugins. To use, pass a map of events as the generic to Plugin<here>.
- a1a90e6: **BREAKING**: strongly type routing decorators so they can only be applied to the correct handler classes
- a1a90e6: **BREAKING**: signature for the @RegisterEvent decorator has changed. It now accepts a list of event configs. Examples in its TSDoc.
- a1a90e6: **BREAKING**: global Emojis and augmentable interface for the same. better DX than mutating user's own Emojis object
- a1a90e6: (beta feature) new Confirmable decorator makes it very easy to require a confirmation before running the "execute" method in handlers
- a1a90e6: populate method that can be overridden to execute synchronous code. it's called at the end of the constructor in handlers.

### Patch Changes

- a1a90e6: logger instance in handlers available via this.logger
- a1a90e6: custom seedcord errors and error codes
- a1a90e6: better validation for UNKNOWN_EXCEPTION_WEBHOOK_URL
- a1a90e6: make sure that a registered command can only ever be guild OR global. this should not be breaking. If it is, your code was not following best practices.
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
    - @seedcord/services@0.4.0
    - @seedcord/utils@0.3.5

## 0.7.1

### Patch Changes

- fix "undefined" in log message on startup when registering events. will now show handler count per event in logging

## 0.7.0

### Minor Changes

- fix login before handlers were registering making some of them useless

## 0.6.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)
- Updated dependencies
    - @seedcord/services@0.3.3
    - @seedcord/types@0.3.3
    - @seedcord/utils@0.3.4

## 0.6.2

### Patch Changes

- bump discord.js version to latest
- Updated dependencies
    - @seedcord/services@0.3.2
    - @seedcord/types@0.3.2
    - @seedcord/utils@0.3.3

## 0.6.1

### Patch Changes

- fix logging for event handler. wrong ref to class name

## 0.6.0

### Minor Changes

- 615eac2: add 'once' and 'on' functionality when registering event handlers
- e48b386: add option to choose "once" or "on" for effects for triggering them

### Patch Changes

- Updated dependencies [d8b4c50]
    - @seedcord/utils@0.3.2

## 0.5.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent
- Updated dependencies [aaa59b7]
    - @seedcord/services@0.3.1
    - @seedcord/types@0.3.1
    - @seedcord/utils@0.3.1

## 0.5.0

### Minor Changes

- daf5dd9: new middlewares feature for both interactions and other events with priority sorting
- daf5dd9: added metadata to default UnknownException so it's easier to debug issues down the line in bots
- daf5dd9: better parsing and handling for DEFAULT_BOT_COLOR from env file as a hex string, or number, or a Discord.js Color string
- daf5dd9: buildSlashRoute method as an alternative to building the argument for command-based route decorators
- 0a74a7b: **BREAKING:** remove action row components for modals. (we are not following deprecations till seedcord v1 is out. minor versions will be breaking changes)
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages
- daf5dd9: **BREAKING:** utils in seedcord are no longer static methods on classes but standalone functions

### Patch Changes

- daf5dd9: some tsdoc for better info and documentation
- daf5dd9: improve type exports and tsdoc
- daf5dd9: update effects related docs for clarity
- daf5dd9: export missing classes and entities
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - @seedcord/services@0.3.0
    - @seedcord/types@0.3.0
    - @seedcord/utils@0.3.0

## 0.4.3

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- 5625037: add a way to specify HOST for healthcheck
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
    - @seedcord/services@0.2.2
    - @seedcord/types@0.2.2
    - @seedcord/utils@0.2.3

## 0.4.2

### Patch Changes

- Updated dependencies
    - @seedcord/utils@0.2.2

## 0.4.1

### Patch Changes

- bump deps
- Updated dependencies
    - @seedcord/services@0.2.1
    - @seedcord/types@0.2.1
    - @seedcord/utils@0.2.1

## 0.4.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - @seedcord/services@0.2.0
    - @seedcord/types@0.2.0
    - @seedcord/utils@0.2.0

## 0.3.0

### Minor Changes

- 2ada52b: update how emit stacks is handled via new config property
- 4585b73: config entry to be able to ignore specific custom-ids from the InteractionController
- 4611ac7: make commands registry maps public via bot. Also validate existence of bot token automatically

### Patch Changes

- e47636a: validate existence of unknown_interaction_url
- 8a7591a: bump deps
- ad2e3c3: use djs Collection object
- Updated dependencies [8a7591a]
    - @seedcord/services@0.1.1
    - @seedcord/types@0.1.4
    - @seedcord/utils@0.1.1

## 0.2.1

### Patch Changes

- move IDocument type export to the plugins package
- Updated dependencies
    - @seedcord/types@0.1.3

## 0.2.0

### Minor Changes

- dabf324: move services to its own package
- 0258dd5: add ComponentsV2 builders to BuilderComponent and a number utility

### Patch Changes

- 0ed832b: debug logging in emoji injector
- Updated dependencies [dabf324]
- Updated dependencies [f0650e8]
    - @seedcord/utils@0.1.0
    - @seedcord/services@0.1.0

## 0.1.1

### Patch Changes

- 72137e9: eslint issue fixes
- c188583: move buildCustomId method to BaseComponent so all components can access
- 5ac7d83: cleanup package files and bump deps
- Updated dependencies [5ac7d83]
    - @seedcord/types@0.1.2

## 0.1.0

### Minor Changes

- 2a141ec: Created a new package called @seedcord/plugins and moved mongo there
- d9e2a50: migrate to monorepo and first test for package
- 48a8c9b: renamed hooks to effects because these aren't lifecycle hooks but fire-and-forget side effects

### Patch Changes

- 8c4ce41: Added eslint for TSDoc
- 48a8c9b: add LICENSE to all package roots
- 48a8c9b: add TSDoc to almost everything
- Updated dependencies [d9e2a50]
- Updated dependencies [48a8c9b]
- Updated dependencies [8c4ce41]
- Updated dependencies [48a8c9b]
- Updated dependencies [48a8c9b]
    - @seedcord/types@0.1.0

## 0.1.0-alpha.3

### Minor Changes

- 2a141ec: Created a new package called @seedcord/plugins and moved mongo there

### Patch Changes

- 8c4ce41: Added eslint for TSDoc
- Updated dependencies [8c4ce41]
    - @seedcord/types@0.1.0-alpha.2

## 0.1.0-alpha.2

### Minor Changes

- 956f225: renamed hooks to effects because these aren't lifecycle hooks but fire-and-forget side effects

### Patch Changes

- dad89c6: add LICENSE to all package roots
- 73a33a5: add TSDoc to almost everything
- Updated dependencies [73a33a5]
- Updated dependencies [dad89c6]
- Updated dependencies [73a33a5]
    - @seedcord/types@0.1.0-alpha.1

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies
    - @seedcord/types@0.1.0-alpha.0

## 0.1.0-alpha.0

### Minor Changes

- migrate to monorepo and first test for package
