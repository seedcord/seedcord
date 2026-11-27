# @seedcord/plugin-oauth

## 0.2.2-next.0

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.17.0 → 0.18.0-next.0
- `@seedcord/errors` 0.16.1 → 0.17.0-next.0
- `@seedcord/utils` 0.10.0 → 0.10.1-next.0
- `@seedcord/core` 0.14.1 → 0.15.0-next.0

## 0.2.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.14.0 → 0.14.1

## 0.2.0

### ✨ Minor

- Added `isRedirectListed()` to `OAuthClient`. It tells you whether the client's `redirectUri` is under Redirects on your application's OAuth2 page. Discord refuses logins until it is. ([#477](https://github.com/seedcord/seedcord/pull/477))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.16.0 → 0.16.1

## 0.1.0

### ✨ Minor

- Added `@seedcord/plugin-oauth`, which logs people in with Discord and calls the API as them, like `this.core.oauth.as(userId).guilds()`. It keeps each user's tokens encrypted in your bot's `kv` and refreshes them before they expire. ([#473](https://github.com/seedcord/seedcord/pull/473))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.16.0-next.1 → 0.16.0
- `@seedcord/utils` 0.10.0-next.1 → 0.10.0
- `@seedcord/types` 0.17.0-next.1 → 0.17.0
