# @seedcord/rate-limiter

## 0.1.8

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0

## 0.1.7

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.11.0 → 0.12.0

## 0.1.6

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.10.1 → 0.11.0

## 0.1.5

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.9.1 → 0.10.0

## 0.1.4

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/types` 0.9.0 → 0.9.1

## 0.1.3

### 🩹 Patch

- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

#### 📦 Seedcord packages

- `@seedcord/types` 0.8.2 → 0.9.0

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/types` 0.8.1 → 0.8.2

## 0.1.1

### 🩹 Patch

- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

#### 📦 Seedcord packages

- `@seedcord/types` 0.8.0 → 0.8.1

## 0.1.0

### 💥 Breaking

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/rate-limiter`, with `MemoryRateLimiter` (exact sliding window) and `buildKey`. Pass your own `config.store` for a durable backend. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.7.2-next.0 → 0.8.0
