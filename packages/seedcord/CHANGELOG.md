# seedcord

## 0.6.0

### Minor Changes

- 615eac2: add 'once' and 'on' functionality when registering event handlers
- e48b386: add option to choose "once" or "on" for effects for triggering them

### Patch Changes

- fix logging for event handler. wrong ref to class name
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
