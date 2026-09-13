# @seedcord/custom-id

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
