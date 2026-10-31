# @seedcord/custom-id

## 0.3.1-next.0

### 🩹 Patch

- Hovering a `CustomId`, its decoded `this.params` or a `match` arm, or an autocomplete's `this.focused` now shows the plain fields, like `{ userId: string; amount: number }`. ([`b3b4489`](https://github.com/seedcord/seedcord/commit/b3b44898c3738ffaa3546319703f545c4feb3f46))
- Fixed the `type-fest` types in the published declarations failing to resolve, since each package listed `type-fest` only as a dev dependency. ([`50db882`](https://github.com/seedcord/seedcord/commit/50db8827aca008f874bf60e5796a696c894056cc))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.14.0 → 0.15.0-next.0

## 0.3.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.14.0-next.0 → 0.14.0

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
