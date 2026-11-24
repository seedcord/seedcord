# @seedcord/plugin-linked-roles

## 0.2.0-next.1

### ✨ Minor

- A `connected` result from `onResult` or `push()` now has a `connection` field with the values that the plugin sent to Discord, typed by your `records`. `ConnectionResult` and `LinkedRolesResult` now take your records as a type argument, like `LinkedRolesResult<typeof records>`. ([`f97a2e9`](https://github.com/seedcord/seedcord/commit/f97a2e9d05c3ad8d0e34f05509a363e74005609c))

## 0.1.1-next.0

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.14.0 → 0.14.1-next.0
- `@seedcord/plugin-oauth` 0.2.0 → 0.2.1-next.0

## 0.1.0

### ✨ Minor

- Added `@seedcord/plugin-linked-roles`, which sets up Discord's Linked Roles for your bot and types the values you return, like `metadata: { matches_won }` for an integer record. ([#477](https://github.com/seedcord/seedcord/pull/477))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.16.0 → 0.16.1
- `@seedcord/plugin-oauth` 0.1.0 → 0.2.0
