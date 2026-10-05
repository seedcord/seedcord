# @seedcord/custom-id

## 0.2.7

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.12.0 → 0.13.0

## 0.2.6

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0

## 0.2.5

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.0 → 0.11.1

## 0.2.4

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0

## 0.2.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.9.0 → 0.10.0

## 0.2.2

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0

## 0.2.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.7.0 → 0.8.0

## 0.2.0

### ✨ Minor

- Added `someOf`. A field holding any subset of a fixed list, decoded as an array of the literal union. It spends one bit per choice, so a five-role picker for example would cost one character in your customId sent to Discord. ([#306](https://github.com/seedcord/seedcord/pull/306))

### 🩹 Patch

- Fixed a bounded `int` field whose range crosses 2^53. It lost precision, and two values could mint the same wire. ([#306](https://github.com/seedcord/seedcord/pull/306))

    Fixed the shape hash, which read only half of an emoji. A changed emoji `oneOf` passed as unchanged and decoded to the wrong choice.

    Fixed the type guards on `bool` and `str`, which now throw `CustomIdValueRejected`. A `bool` took any truthy value, and a `str` threw a raw `TypeError`.

    Fixed the rejection message, which named a range on fields that have none. It now names what the field takes, as in `expects a boolean, got "false"`.

#### 📦 Seedcord packages

- `@seedcord/errors` 0.6.0 → 0.7.0

## 0.1.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0

## 0.1.0

### ✨ Minor

- The typed customId codec ships here now, and it runs against plain discord.js as well as seedcord. Declare a shape with `new CustomId('prefix')`, mint a wire with `encode`, and read it back with `decode`. Check the guide page on CustomId. ([#299](https://github.com/seedcord/seedcord/pull/299))
- `setCustomIdErrors` replaces the two errors a failed decode throws. Return a `Notice` subclass from a seedcord bot to swap the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.0 → 0.5.1
