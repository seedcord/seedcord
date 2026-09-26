# Contributing to seedcord

Any help is appreciated, whether that's a bug fix, a feature, or better docs.

seedcord is pre-1.0 and I break things between minors. Open an issue before starting anything large and wait for my reply. Large unsolicited pull requests may be closed without a detailed review, because I cannot keep up with them otherwise. Check whether an issue or PR already covers your idea first.

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md). Report a security problem the way [SECURITY.md](SECURITY.md) describes.

## Setup

You need the Node version in `engines.node` and the pnpm version in `packageManager`, both in the root `package.json`.

The scripts assume a POSIX shell. On Windows, work inside WSL.

```bash
git clone https://github.com/<username>/seedcord.git
cd seedcord
pnpm install
pnpm build
```

Branch off `next` and open your PR against `next`.

## Working on a package

Run these from the repo root, in this order:

```bash
pnpm -C <package> lint:fix
pnpm -C <package> tc
pnpm -C <package> test
```

Packages import each other's built `dist`. After you edit one, rebuild it before you check anything that depends on it:

```bash
pnpm -C packages/core build
pnpm -C packages/gateway tc
```

A new package starts from `turbo gen package`. Then follow the checklist in [`turbo/generators/README.md`](../turbo/generators/README.md).

## Trying a change in a real bot

`mocks/gateway` and `mocks/http` are working bots, one per transport. Copy a mock's `.env.example` to `.env` and fill it in. The example file lists every variable that mock reads. The [guide](https://guide.seedcord.org/discord-application) shows how to create an application and get its token.

```bash
pnpm -C mocks/gateway dev
```

Check a mock's `src/bot.ts` for what else it connects to. The gateway mock attaches a database plugin, so it needs that database running. The http mock needs a public URL for Discord to post to, and `seedcord dev` opens one through [cloudflared](https://guide.seedcord.org/tooling/tunnel).

When you add or change a handler in a mock, run `pnpm -C mocks/<name> codegen`. The gate fails on a stale generated file.

## Hooks

`pnpm install` sets up three husky hooks:

- **pre-commit** runs `lint-staged` with zero warnings allowed, then checks formatting. One lint warning blocks the commit, even though plain `pnpm lint` lets it through.
- **commit-msg** runs commitlint on your message.
- **pre-push** runs `pnpm prePush:affected`, which checks the packages your branch changed and the ones that depend on them.

Run `pnpm prePush` before you open the PR. It checks every package. The root `package.json` has both chains.

## Pull request guidelines

1. **One change per PR.** Changes in the same scope can go together.

2. **Commits and PR titles are one lowercase line, conventional commits, no scope.** A breaking change marks the bare type with `!`. `commitlint.config.ts` lists the accepted types. A squash merge turns the PR title into the commit on `next`, so the title follows the same rule.

    ```
    feat: typed select menu values
    fix: gate order on the http dispatcher
    feat!: move errors out of core
    ```

3. **Add a changeset** with `pnpm cs` for any change to a published package. Read [`skills/changeset-guidelines`](skills/changeset-guidelines/SKILL.md) before you write it. A breaking change is a minor bump while seedcord is pre-1.0. `pnpm lint:changesets` checks the format, and CI runs it.

4. **Write the failing test first.** Watch it fail, then fix the code. A regression test that passes before your change proves nothing. Tests live in `<package>/tests/`, mirroring `src/`, and `pnpm -C <package> test:watch` reruns them as you work.

5. **Say which transport you tested on.** Gateway and http share most of their surface and differ in places. If a change touches both, say so.

## Code style

The lint config is strict. `lint:fix` fixes what it can and reports the rest.

- **No `any`.** Use `unknown` and narrow it with a type guard. `as unknown as T` is out too. If you cannot get the types to work, open an issue and we'll talk through the design.
- **Throw through `@seedcord/errors`** with a registered code. A raw `throw new Error(...)` that reaches a consumer is a bug.
- **Comment only where the reason sits outside the file.** A comment restating the line below it gets cut in review.

[`AGENTS.md`](../AGENTS.md) at the repo root has the full rules. `packages/` and `apps/` each add their own `AGENTS.md` on top of it.

## AI-generated code

AI tools are fine. I use them too. The bar is the same as any other code. You have to understand what you are submitting and review it properly before it goes up. Do not send a PR with code you could not explain or debug yourself, and if I ask why something is the way it is, "the AI wrote it" is not an answer.

Same for anything you write in the repo. Issues, PR descriptions, and review replies should come from you, the person who read the change. I want to talk it through with the human doing the work.

AI code often looks correct and misses edge cases, so the testing rules matter more here. Point your agent at `AGENTS.md` and have it load the skills in [`.github/skills`](skills).

## CI

[`checks.yml`](workflows/checks.yml) runs on every PR that is not a draft, and [`commitlint.yml`](workflows/commitlint.yml) checks every commit in it. CI runs a subset of `pnpm prePush`. A PR that fails CI will not get a detailed review.

## Questions

Ask on [Discord](https://discord.gg/DzFxY58WXf).
