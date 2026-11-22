# @seedcord/plugin-oauth

## 0.1.0-next.0

### ✨ Minor

- Added `@seedcord/plugin-oauth`, which logs people in with Discord and calls the API as them, like `this.core.oauth.as(userId).guilds()`. It keeps each user's tokens encrypted in your bot's `kv` and refreshes them before they expire. ([#473](https://github.com/seedcord/seedcord/pull/473))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.16.0-next.0 → 0.16.0-next.1
- `@seedcord/types` 0.17.0-next.0 → 0.17.0-next.1
- `@seedcord/utils` 0.10.0-next.0 → 0.10.0-next.1
