# Contributing to seedcord

Any help is appreciated, whether that's a bug fix, a feature, or better docs.

seedcord is pre-1.0 and I break things between minors. Open an issue before starting anything large and wait for my reply. Large unsolicited pull requests may be closed without a detailed review, because I cannot keep up with them otherwise.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Build once: `pnpm build`
5. Make your changes
6. Run the gate: `pnpm prePush`
7. Submit a pull request

## What I'm Looking For

- **Bug fixes** - Found something broken? Please fix it
- **Tests** - Especially regression tests and edge cases
- **Documentation** - If there is something we could make more clear, or you found a gap
- **New features** - Open an issue first so we agree on the shape
- **Large features or architectural changes** - Always an issue first. Do not start until there is agreement on the approach

## Before You Start

- Check whether an issue or PR already covers it
- Work out which package you are editing. There are many
- Follow the existing style. The lint config is strict, so run `lint:fix` periodically
- Write tests

## Development Setup

```bash
git clone https://github.com/<username>/seedcord.git
cd seedcord

pnpm install
pnpm build

# per package, in this order
pnpm -C packages/<name> lint:fix
pnpm -C packages/<name> tc
pnpm -C packages/<name> test

# the whole gate, which husky also runs on pre-push
pnpm prePush
```

`mocks/` contains two runnable bots, and running one is the fastest way to see a change work. `mocks/gateway` uses the websocket transport. `mocks/http` uses the interactions endpoint. Both need at least a bot token in a `.env`.

```bash
pnpm -C mocks/gateway dev
```

## Pull Request Guidelines

1. **One thing at a time** - Keep a PR to a single change, or changes in the same scope

2. **Write good commit messages** - Conventional commits, lowercase, one line, no scope. `commitlint.config.mjs` lists the accepted types

    ```
    feat: typed select menu values
    fix: gate order on the http dispatcher
    ```

3. **Add a changeset** - Any change to a published package needs one

    ```bash
    pnpm cs
    ```

    - **Patch**: bug fixes, internal changes
    - **Minor**: new features, backwards-compatible additions
    - **Major**: breaking changes, removals, behavior changes
    - Write one or two plain sentences about what changed for someone using the package. Look at any `CHANGELOG.md` for the shape

4. **Test first** - Write the failing test, watch it fail, then fix it. A regression test that passes before your change proves nothing

5. **Say which transport you tested on** - Gateway and http share most of their surface and diverge in places. If a change touches both, say so

6. **Keep it simple** - Write three similar lines before you write a wrong abstraction

## Code Style

I use a very strict ESLint config. `pnpm lint:fix` over plain `pnpm lint`, always.

- TypeScript only. New runtime code lives under the existing `src` tree of whichever package it belongs to
- **No `any` in production code.** Use `unknown` and narrow it with a type guard. `value as any` and `as unknown as T` are both out. If you cannot get the types to work, open an issue and let's talk through the design. Use TypeScript as it's meant to be used
- Throw through `@seedcord/errors`, with a registered code. A raw `throw new Error(...)` reaching a consumer is a bug
- Comment only where the reason sits outside the file. A comment restating the line below it gets cut in review

`AGENTS.md` at the repo root contains the long version.

## AI-generated code

AI tools are fine, I use them too. The bar is the same as any other code. You have to understand what you are submitting and review it properly before it goes up. Do not send a PR with code you could not explain or debug yourself, and if I ask why something is the way it is, "the AI wrote it" is not an answer.

Same for anything you write in the repo. Issues, PR descriptions, and review replies should come from you, the person who read the change. I want to talk it through with the human doing the work.

AI code often looks correct and misses edge cases, so the testing rules matter more here. Your agents should always have these four skills in `.github/skills` loaded: `tdd`, `code-quality`, `code-commenting-guidelines`, and `writing-voice`.

## CI and checks

Every pull request needs:

- `pnpm prePush` green, which covers build, codegen, type checks, lint, format, and tests
- Passing commitlint
- A changeset, for any change to a published package

A PR that does not pass CI will not get a detailed review.

## Testing

Tests live in `<package>/tests/` mirroring `src/`. Vitest is the runner.

- `pnpm -C <package> test` runs once
- `pnpm -C <package> test:watch` watches
- `pnpm -C <package> coverage` reports

`mocks/gateway` is the reference bot and it exercises most of the framework, so a change that breaks something usually fails there first.

## Questions

Ask on [Discord](https://discord.gg/DzFxY58WXf).
