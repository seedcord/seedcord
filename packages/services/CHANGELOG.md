# @seedcord/services

## 0.4.0

### Minor Changes

- a1a90e6: new StrictEventEmitter class. Plugin extends this now so strongly typed EventEmitter methods are available on all plugins. To use, pass a map of events as the generic to Plugin<here>.

### Patch Changes

- a1a90e6: custom seedcord errors and error codes

## 0.3.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)
- Updated dependencies
    - @seedcord/types@0.3.3

## 0.3.2

### Patch Changes

- bump discord.js version to latest
- Updated dependencies
    - @seedcord/types@0.3.2

## 0.3.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent
- Updated dependencies [aaa59b7]
    - @seedcord/types@0.3.1

## 0.3.0

### Minor Changes

- daf5dd9: **BREAKING:** BaseService was renamed to MongoService
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- daf5dd9: new function called filterCirculars that cleans up objects with circular refs
  new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - @seedcord/types@0.3.0

## 0.2.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
    - @seedcord/types@0.2.2

## 0.2.1

### Patch Changes

- bump deps
- Updated dependencies
    - @seedcord/types@0.2.1

## 0.2.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - @seedcord/types@0.2.0

## 0.1.1

### Patch Changes

- 8a7591a: bump deps
- Updated dependencies [8a7591a]
    - @seedcord/types@0.1.4

## 0.1.0

### Minor Changes

- dabf324: move services to its own package
