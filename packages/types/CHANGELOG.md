# @seedcord/types

## 0.3.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)

## 0.3.2

### Patch Changes

- bump discord.js version to latest

## 0.3.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent

## 0.3.0

### Minor Changes

- daf5dd9: lots of new utility types for various uses
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- daf5dd9: new function called filterCirculars that cleans up objects with circular refs
  new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead

## 0.2.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps

## 0.2.1

### Patch Changes

- bump deps

## 0.2.0

### Minor Changes

- update export settings (BREAKING)

## 0.1.4

### Patch Changes

- 8a7591a: bump deps

## 0.1.3

### Patch Changes

- move IDocument type export to the plugins package

## 0.1.2

### Patch Changes

- 5ac7d83: cleanup package files and bump deps

## 0.1.1

### Patch Changes

- ae9f9b5: update tsdoc to use correct tags

## 0.1.0

### Minor Changes

- d9e2a50: publish types too

### Patch Changes

- 48a8c9b: fix repository url in package.json
- 8c4ce41: Added eslint for TSDoc
- 48a8c9b: add LICENSE to all package roots
- 48a8c9b: add TSDoc to almost everything

## 0.1.0-alpha.2

### Patch Changes

- 8c4ce41: Added eslint for TSDoc

## 0.1.0-alpha.1

### Patch Changes

- 73a33a5: fix repository url in package.json
- dad89c6: add LICENSE to all package roots
- 73a33a5: add TSDoc to almost everything

## 0.1.0-alpha.0

### Minor Changes

- publish types too
