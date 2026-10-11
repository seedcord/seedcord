# Contributing to seedcord

Any help is appreciated, whether that's a bug fix, a feature, or better docs.

seedcord is pre-1.0 and I break things between minors. Open an issue before starting anything large and wait for my reply. Large unsolicited pull requests may be closed without a detailed review, because I cannot keep up with them otherwise. Check whether an issue or PR already covers your idea first.

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md). Report a security problem the way [SECURITY.md](SECURITY.md) describes.

## Setup

You need the Node version in `engines.node` and the pnpm version in `packageManager`, both in the root `package.json`.

Bun is optional. With it installed, the `seedcord build` tests also compile the built http and gateway fixture bots into bun binaries and run them. Without it they skip those tests. CI's Bun job runs them on every push and on pull requests that are ready for review.

The scripts assume a POSIX shell. On Windows, work inside WSL.

```bash
git clone https://github.com/<username>/seedcord.git
cd seedcord
pnpm install
pnpm build
```

Branch off `next` and open your PR against `next`.

The repo uses LF line endings, and `.gitattributes` checks every file out that way. If your clone predates it, commit or stash your work and run:

```bash
git rm --cached -r .
git reset --hard
```

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

## Working on a site

The three sites are Next.js apps in `apps/home`, `apps/guide` and `apps/docs`. `pnpm build` and `pnpm prePush` skip them. `pnpm build:all` builds them too.

Run the dev server of the site you change.

```bash
pnpm -C apps/<site> dev
```

Each site serves under its own path, the same as on seedcord.org. The guide runs at `localhost:3000/guide` and the reference at `localhost:3000/docs`. To run two at once, give the second one another port with `-p`.

The guide's `dev` skips type-checking its code samples. Run `dev:twoslash` when you change a sample. It checks every sample and shows the type hovers. In dev, the guide's links to the reference go to `localhost:3001/docs`. Run the docs there:

```bash
pnpm -C apps/guide dev:twoslash
pnpm -C apps/docs dev -p 3001
```

### The reference

The reference reads its pages from artifacts in `generated/`. Build them before your first `dev`, and again after you change a package's public API:

```bash
pnpm docs:local
```

Without them, the docs and the guide read the published artifacts from cdn.seedcord.org.

A docs build renders every page of every version into `apps/docs/dist/docs`, which takes a few minutes. Set `DOCS_PACKAGES` to render only the packages you list:

```bash
DOCS_PACKAGES=core,http pnpm -C apps/docs build
```

To check a build the way production serves it, run:

```bash
pnpm docs:preview
```

It runs the upload step from CI into `apps/docs/.preview`, a folder with the same layout as the R2 bucket, then starts the docs worker at `localhost:8787/docs`. Run it again after every build. Wrangler stalls at startup on a full build, so keep `DOCS_PACKAGES` short for this.

To build one site:

```bash
pnpm turbo build --filter=@seedcord/<site>...
```

A guide build uses about 6 GB of memory. With 8 GB or less, build one site at a time.

## Trying a change in a real bot

`mocks/gateway` and `mocks/http` are working bots, one per transport. Copy a mock's `.env.example` to `.env` and fill it in. The example file lists every variable that mock reads. The [guide](https://seedcord.org/guide/discord-application) shows how to create an application and get its token.

```bash
pnpm -C mocks/gateway dev
```

Check a mock's `src/bot.ts` for what else it connects to. The gateway mock attaches a database plugin, so it needs that database running. The http mock needs a public URL for Discord to post to, and `seedcord dev` opens one through [cloudflared](https://seedcord.org/guide/tooling/tunnel).

When you add or change a handler in a mock, run `pnpm -C mocks/<name> codegen`. The gate fails on a stale generated file.

## Hooks

`pnpm install` sets up two git hooks:

- **pre-commit** runs `vp staged`, which formats the files you staged and lints them with zero warnings allowed. One lint warning blocks the commit, even though plain `pnpm lint` lets it through.
- **commit-msg** runs commitlint on your message.

Run `pnpm prePush` before you open the PR. It checks the packages your branch changed since `next` and the ones that depend on them. `pnpm prePush:all` checks every package. The root `package.json` has both chains.

## Pull request guidelines

1. **One change per PR.** Changes in the same scope can go together.

2. **Commits and PR titles are one lowercase line, conventional commits, no scope.** A breaking change marks the bare type with `!`. `commitlint.config.ts` lists the accepted types. A squash merge turns the PR title into the commit on `next`, so the title follows the same rule.

    ```
    feat: typed select menu values
    fix: gate order on the http dispatcher
    feat!: move errors out of core
    ```

3. **Add a changeset** with `pnpm cs` for any change to a published package. Read [`skills/changeset-guidelines`](../.agents/skills/changeset-guidelines/SKILL.md) before you write it. A breaking change is a minor bump while seedcord is pre-1.0. `pnpm lint:changesets` checks the format, and CI runs it.

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

AI code often looks correct and misses edge cases, so the testing rules matter more here. Point your agent at `AGENTS.md`.

Have it load these four skills from [`.agents/skills`](../.agents/skills) before any work:

- [`code-quality`](../.agents/skills/code-quality/SKILL.md), plus every file in its folder
- [`code-commenting-guidelines`](../.agents/skills/code-commenting-guidelines/SKILL.md)
- [`writing-voice`](../.agents/skills/writing-voice/SKILL.md)
- [`tdd`](../.agents/skills/tdd/SKILL.md), plus every file in its folder

Have it load the others only for these tasks:

- [`guide-voice`](../.agents/skills/guide-voice/SKILL.md) for any page under `apps/guide/content`, with its two review prompts
- [`changeset-guidelines`](../.agents/skills/changeset-guidelines/SKILL.md) before writing a changeset
- [`envapt`](../.agents/skills/envapt/SKILL.md) when code reads config through `envapt`
- [`release-version`](../.agents/skills/release-version/SKILL.md) for prepping a release, a maintainer-only job

Before you open a PR, run [`/branch-audit`](../.claude/commands/branch-audit.md) or have your agent run it. It reviews everything your branch changes against `next`. Fix what it finds before you push.

## CI

[`checks.yml`](workflows/checks.yml) runs on every PR that is not a draft, and [`commitlint.yml`](workflows/commitlint.yml) checks every commit in it. CI runs the checks from `pnpm prePush:all` on every package. A PR that fails CI will not get a detailed review.

## Questions

Ask on [Discord](https://discord.gg/DzFxY58WXf).
