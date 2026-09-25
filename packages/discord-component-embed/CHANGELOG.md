# discord-component-embed

## 0.4.1

### 🩹 Patch

- The `Thumbnail` example TSDoc now shows the tagline "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

## 0.4.0

### ✨ Minor

- Added a `discord-component-embed check` command that runs the checks on a JSON file, an HTML file from your build, or a live page. For a page, it fetches the HTML with Discord's crawler user agent and measures the JSON as the page sends it. ([#332](https://github.com/seedcord/seedcord/pull/332))
- Added `fromPayload` to check component embed JSON you already have, like a file you wrote by hand. It turns the JSON into a tree, and `toComponentEmbed` checks that tree against every rule a JSX card goes through. ([#332](https://github.com/seedcord/seedcord/pull/332))

## 0.3.0

### 💥 Breaking

- Fixed an inline script over 3000 bytes passing every check while Discord fell back to the Open Graph card. `toComponentEmbed` and everything built on it now throw `OverLimit` when the JSON is over 3000 bytes, the same way `componentEmbedResponse` already did. ([#331](https://github.com/seedcord/seedcord/pull/331))
- Fixed a card with galleries holding 11 or more media items between them, like 10 + 1, passing every check while Discord fell back to the Open Graph card. `toComponentEmbed` and everything built on it now throw `OverLimit` past 10 items across all galleries. ([#331](https://github.com/seedcord/seedcord/pull/331))
- `TextChild` is no longer exported. Write `TextDisplayProps['children']` where you typed text with it. ([#331](https://github.com/seedcord/seedcord/pull/331))

### ✨ Minor

- `ComponentEmbedError` has a new `path` field with the steps from the root to the component that broke a rule, like `['Container', 'PostCard', 'Section 2']`. The message ends with the same steps after `Found at`. ([#331](https://github.com/seedcord/seedcord/pull/331))

### 🩹 Patch

- Error messages now show what broke a rule and how to fix it, like the start of a label that runs too long or where a `<Thumbnail>` placed straight in a `<Container>` should go. ([#331](https://github.com/seedcord/seedcord/pull/331))
- Fixed `toComponentEmbedJson`, `toComponentEmbedScript`, and `<ComponentEmbed>` spending six of Discord's 3000 bytes on every `<`, like the ones in custom emoji and mentions, by escaping only `</` and `<!--`. ([#331](https://github.com/seedcord/seedcord/pull/331))
- Installing the package no longer pulls in `discord-api-types`, because the Discord types it uses now ship inside its own type declarations. ([#331](https://github.com/seedcord/seedcord/pull/331))

## 0.2.2

### 🩹 Patch

- Improved the TSDoc across the package to say what each symbol is and what you do with it. ([`0c7e467`](https://github.com/seedcord/seedcord/commit/0c7e4674cd7dfd8a6b6e55f7c3b412147b2fd291))

## 0.2.1

### 🩹 Patch

- Shrank the README image from 1.2 MB to 54 KB and added `link-previews` and `discord-link-preview` to the keywords.

## 0.2.0

### 💥 Breaking

- If your own component passes its `children` into one of these components, type that prop as `EmbedNode`. `ReactNode` and Preact's `ComponentChildren` no longer fit. ([#321](https://github.com/seedcord/seedcord/pull/321))
- `<ComponentEmbed>` moved to `discord-component-embed/react`. ([#321](https://github.com/seedcord/seedcord/pull/321))

### ✨ Minor

- Added `toComponentEmbedJson`. It returns the card's JSON with every `<` escaped, for a framework that writes the `<script>` tag itself. ([#321](https://github.com/seedcord/seedcord/pull/321))
- React is an optional peer now. Only `discord-component-embed/react` needs it, from React 17 up. ([#321](https://github.com/seedcord/seedcord/pull/321))
- Added support for trees built with Preact JSX or `preact/compat`. ([#321](https://github.com/seedcord/seedcord/pull/321))
- Added `h()` and a JSX runtime for `jsxImportSource: 'discord-component-embed'`. Both build the tree without React. ([#321](https://github.com/seedcord/seedcord/pull/321))

## 0.1.0

### ✨ Minor

- New package that builds a Discord component embed link preview from JSX and throws when the tree breaks a rule of the format. ([#319](https://github.com/seedcord/seedcord/pull/319))
