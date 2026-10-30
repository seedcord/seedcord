# Contributing to seedcord

Thanks for wanting to help! Bug fixes, features and better docs are all welcome.

seedcord is pre-1.0 and I break things between minors. Open an issue before starting anything large and wait for my reply. I can't keep up with large PRs nobody asked for, so those may get closed without a detailed review. Check whether an issue or PR already covers your idea first.

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md). Report a security problem the way [SECURITY.md](SECURITY.md) describes. If you're using AI, read the [AI policy](../AI_POLICY.md) too.

## Setup

You need the Node version in `engines.node` and the pnpm version in `packageManager`, both in the root `package.json`.

Bun is optional. With it installed, the `seedcord build` tests also compile the built http and gateway fixture bots into bun binaries and run them. Without it they skip those tests. CI's Bun job runs them on every push and on pull requests that are ready for review.

The scripts assume a POSIX shell. On Windows, work inside WSL.

```bash
git clone https://github.com/<username>/seedcord.git
cd seedcord
vp install
vp run build
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
vp -C <package> run lint:fix
vp -C <package> run tc
vp -C <package> test
```

Packages import each other's built `dist`. After you edit one, rebuild it before you check anything that depends on it:

```bash
vp -C packages/core run build
vp -C packages/gateway run tc
```

A new package starts from `turbo gen package`. Then follow the checklist in [`turbo/generators/README.md`](../turbo/generators/README.md).

## Working on a site

The three sites are Next.js apps in `apps/home`, `apps/guide` and `apps/docs`. `vp run build` and `vp run prePush` skip them. `vp run build:all` builds them too.

Run the dev server of the site you change.

```bash
vp -C apps/<site> run dev
```

Each site serves under its own path, the same as on seedcord.org. The guide runs at `localhost:3000/guide` and the reference at `localhost:3000/docs`. To run two at once, give the second one another port with `-p`.

The guide's `dev` skips type-checking its code samples. Run `dev:twoslash` when you change a sample. It checks every sample and shows the type hovers. In dev, the guide's links to the reference go to `localhost:3001/docs`. Run the docs there:

```bash
vp -C apps/guide run dev:twoslash
vp -C apps/docs run dev -p 3001
```

### The reference

The reference reads its pages from artifacts in `generated/`. Build them before your first `dev`, and again after you change a package's public API:

```bash
vp run docs:local
```

Without them, the docs and the guide read the published artifacts from cdn.seedcord.org.

A docs build renders every page of every version into `apps/docs/dist/docs`, which takes a few minutes. Set `DOCS_PACKAGES` to render only the packages you list:

```bash
DOCS_PACKAGES=core,http vp -C apps/docs run build
```

To check a build the way production serves it, run:

```bash
vp run docs:preview
```

It runs the upload step from CI into `apps/docs/.preview`, a folder with the same layout as the R2 bucket, then starts the docs worker at `localhost:8787/docs`. Run it again after every build. Wrangler stalls at startup on a full build, so keep `DOCS_PACKAGES` short for this.

To build one site:

```bash
vp exec turbo build --filter=@seedcord/<site>...
```

A guide build uses about 6 GB of memory. With 8 GB or less, build one site at a time.

### Writing a blog post

Each post is a folder in `apps/home/content/blog`. The [README](../apps/home/content/blog/README.md) there has the steps for writing one.

## Trying a change in a real bot

`mocks/gateway` and `mocks/http` are working bots, one per transport. Copy a mock's `.env.example` to `.env` and fill it in. The example file lists every variable that mock reads. The [guide](https://seedcord.org/guide/discord-application) shows how to create an application and get its token.

```bash
vp -C mocks/gateway run dev
```

Check a mock's `src/bot.ts` for what else it connects to. The gateway mock attaches a database plugin, so it needs that database running. The http mock needs a public URL for Discord to post to, and `seedcord dev` opens one through [cloudflared](https://seedcord.org/guide/tooling/tunnel).

Try every change a bot author would notice in a mock, and use it like they would. Unit tests miss things you only catch by using the bot, like a confusing error message or a button that does nothing after a restart.

When you add or change a handler in a mock, run `vp -C mocks/<name> run codegen`. The gate fails on a stale generated file.

## Hooks

`vp install` sets up two git hooks:

- **pre-commit** runs `vp staged`, which formats the files you staged and lints them with zero warnings allowed. One lint warning blocks the commit, even though plain `vp run lint` lets it through.
- **commit-msg** runs commitlint on your message.

Run `vp run prePush` before you open the PR. It checks the packages your branch changed since `next` and the ones that depend on them. `vp run prePush:all` checks every package. The root `package.json` has both chains.

## Pull request guidelines

1. **One change per PR.** Changes in the same scope can go together.

2. **Commits and PR titles are one lowercase line, conventional commits, no scope.** A breaking change marks the bare type with `!`. `commitlint.config.ts` lists the accepted types. A squash merge turns the PR title into the commit on `next`, so the title follows the same rule.

    ```
    feat: typed select menu values
    fix: gate order on the http dispatcher
    feat!: move errors out of core
    ```

3. **Add a changeset** with `vp run cs` when you change a published package in a way that someone on the latest release will notice. Skip it when you fix code that isn't on `main` yet. Read [`skills/changeset-guidelines`](../.agents/skills/changeset-guidelines/SKILL.md) before you write it. A breaking change is a minor bump while seedcord is pre-1.0. `vp run lint:changesets` checks the format, and CI runs it.

    To see your changeset as the GitHub release post, commit it and run `pnpm release:preview`. It writes the post for the stable release on `main` to `release.md` in the repo root, and `--pre` writes the one for the next prerelease. It versions a temporary copy of `HEAD`, so it doesn't mess with your checkout.

4. **Write the failing test first.** Watch it fail, then fix the code. A regression test that passes before your change proves nothing. Tests live in `<package>/tests/`, mirroring `src/`, and `vp -C <package> run test:watch` reruns them as you work.

5. **Say which transport you tested on.** Gateway and http share most of their surface and differ in places. If a change touches both, say so.

## Code style

The lint config is strict. `lint:fix` fixes what it can and reports the rest.

- **No `any`.** Use `unknown` and narrow it with a type guard. `as unknown as T` is out too. If you can't get the types to work, open an issue and we'll talk through the design.
- **Throw through `@seedcord/errors`** with a registered code. A raw `throw new Error(...)` that reaches a consumer is a bug.
- **Comment only where the reason sits outside the file.** A comment restating the line below it gets cut in review.

[`AGENTS.md`](../AGENTS.md) at the repo root has the full rules. `packages/` and `apps/` each add their own `AGENTS.md` on top of it.

## Using AI

The rules for AI-assisted contributions are in the [AI policy](../AI_POLICY.md). This section is about setting your agent up.

Point your agent at `AGENTS.md`, and have it load these four skills from [`.agents/skills`](../.agents/skills) before any work:

- [`code-quality`](../.agents/skills/code-quality/SKILL.md), plus every file in its folder
- [`code-commenting-guidelines`](../.agents/skills/code-commenting-guidelines/SKILL.md)
- [`writing-voice`](../.agents/skills/writing-voice/SKILL.md)
- [`tdd`](../.agents/skills/tdd/SKILL.md), plus every file in its folder

Have it load the others only for these tasks:

- [`guide-voice`](../.agents/skills/guide-voice/SKILL.md) for any page under `apps/guide/content`, with its two review prompts
- [`changeset-guidelines`](../.agents/skills/changeset-guidelines/SKILL.md) before writing a changeset
- [`envapt`](../.agents/skills/envapt/SKILL.md) when code reads config through `envapt`
- [`release-version`](../.agents/skills/release-version/SKILL.md) for prepping a release, a maintainer-only job
- [`release-docs`](../.agents/skills/release-docs/SKILL.md) for bringing the changesets, READMEs, home page and guide up to date before a release, a maintainer-only job
- [`test-performance`](../.agents/skills/test-performance/SKILL.md) when writing a test, a test helper, or a vitest config, or when a test is slow or fails only in the full suite

Before you open a PR, run [`/branch-audit`](../.claude/commands/branch-audit.md) or have your agent run it. It reviews everything your branch changes against `next`. Fix what it finds before you push.

## CI

[`checks.yml`](workflows/checks.yml) runs on every PR, drafts included, and [`commitlint.yml`](workflows/commitlint.yml) checks every commit in it. CI runs the checks from `vp run prePush:all` on every package. A PR that fails CI won't get a detailed review.

## Questions

Ask on [Discord](https://discord.gg/DzFxY58WXf).
