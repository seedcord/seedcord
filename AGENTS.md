# seedcord agent guidelines

Rules for anyone working in this repo with an AI coding tool. `CLAUDE.md` symlinks to this file.

Two things live elsewhere. [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) covers setup, PR mechanics, and where AI-generated code stands. Each package's `README.md` describes that package.

seedcord is pre-1.0. Breaking changes go in minor versions. Pick the cleanest design and break things to get it right. Add a changeset for every change to a published package.

---

## Ground every claim

The expensive failure here is a confident sentence about how two modules connect that nobody checked.

1. **Cite or flag every load-bearing claim.** Give a `file:line` you opened this session, or write the word "assumption". A labelled guess costs one line of reading. An unlabelled one costs an afternoon.
2. **Open both ends.** Read the module that implements a thing and the module that consumes it. Do this before you write an interface or the words "X must be Y".
3. **Verify before you repeat.** A claim from a subagent, a summary, or your own memory is unverified until you reopen the source. Findings from another agent are input. They are never evidence.

This applies to work you delegate. Reopen a citation yourself before relaying it.

---

## Repo map

Six workspace globs, declared in `pnpm-workspace.yaml`.

<!-- prettier-ignore-start -->

| glob | what belongs there |
| --- | --- |
| `packages/*` | framework leaves |
| `plugins/*` | one plugin per backing service |
| `cli/*` | command-line tools |
| `tooling/*` | shared configs, the docs pipeline, and the UI kit |
| `apps/*` | the Next.js sites |
| `mocks/*` | one runnable bot per transport |

<!-- prettier-ignore-end -->

The root [`README.md`](README.md) lists every published package. `private` in a package.json says whether it publishes. The `exports` map is its surface.

Never wire a cross-package source path. Never point `paths` or `include` at another package's `src`.

`./internal` entries are framework wiring. A symbol reachable only through one gets no TSDoc and no changeset line.

---

## Two transports

Everything ships against one of two transports.

`@seedcord/gateway` holds a websocket connection through a stateful `Seedcord` class, built on discord.js. It carries message, member, voice, and reaction events.

`@seedcord/http` answers Discord's interactions endpoint. Node runs through a `Seedcord` class. `@seedcord/http/edge` builds a handler through `createSeedcord` for Web-standard runtimes. Discord posts only interactions here.

Both transports re-export all of `@seedcord/core`. A bot installs one seedcord package. Code they share belongs in `core`. A plugin extends `@seedcord/core/plugin`, which both transport barrels re-export.

Keep Node-only code out of anything the edge build reaches. Answer a question for both transports unless the task names one.

---

## Other important rules

- **Never throw a raw `Error`.** Framework code throws `SeedcordError`, `SeedcordTypeError`, or `SeedcordRangeError` from `@seedcord/errors`, each with a registered code. Translate a third-party throw before it reaches a consumer.
- **Routes, class names, ids, and paths get a `paint` tone** from `@seedcord/errors`. `paint` also carries `bold`, `italic` and `underline` for the parts that use no color. Multi-line output goes through `logger.utils`.
- **Derive types from their source.** A constructor shape is `TypedConstructor<typeof X>`. A member union comes from `keyof`, an indexed access, or `TypedExtract`. A hand-written copy drifts.
- **Only implement what was asked.** Surface additions as a question first. Wait for the third use before extracting an abstraction.
- **No dead code.** Before adding `export`, confirm something outside the file names the symbol. A symbol that exists only for a test belongs in the test folder.
- **Grep every consuming surface before deleting anything.** That includes markdown and generated output. Show no callers or name the replacement.
- **Commit subjects are one lowercase line with no scope and no body.** Write `feat:`, never `feat(http):`. A breaking change marks the bare type, `feat!:`.
- **Move files with `git mv`.** Add dependencies with `pnpm add` so the lockfile updates.

---

## Commands and gates

Run from the repo root. `pnpm -C <package> <script>` targets one package.

```sh
pnpm -C <pkg> lint:fix   # always lint:fix, never plain lint
pnpm -C <pkg> tc
pnpm -C <pkg> test       # after lint and tc pass
```

Rebuild a shared package before you check its dependents:

```sh
pnpm -C packages/<name> build
pnpm -C packages/<dependent> tc
```

Two whole-workspace gates exist and they differ:

- `pnpm prePush` runs every check across every package.
- `pnpm prePush:affected` runs the same checks through `turbo --affected`. **The husky pre-push hook runs this one.** A green hook covers less than a green `prePush`.

Both start with `build` and `codegen:check`, then `check:catalog`, the script and markdown lint, `tc`, `lint`, `fmt:check`, and `test`. The root `package.json` has the exact chain.

`pnpm knip` (dead code) and `pnpm react-doctor` (React patterns) are real gates. **No hook and no CI job runs them.** Run them by hand when the change warrants it.

Zero lint errors, zero lint warnings, zero from `tc`, every test passing. Fix the cause. Never comment out a test, weaken an assertion, or add a broad `eslint-disable` to get past a failure. Disable a rule inline with a reason, `// eslint-disable-next-line <rule> -- <why>`, never file-wide.

Watch warnings. `lint-staged` passes `--max-warnings=0`, so a warn-severity rule blocks your commit. Plain `pnpm lint` lets it through.

Regenerate docs with `pnpm docs:extract` after changing the public surface.

---

## Tests

Tests live in `<package>/tests/` mirroring `src/`, never beside the source. Vitest runs them.

Reproduce a bug with a failing test before fixing it. A test that passes before the fix proves nothing. This holds however the bug surfaced.

Tests reach behavior through public interfaces. A test that reads a private method breaks on the next refactor and tells you nothing about the contract.

A test pins behavior. `tsc`, ESLint, and the build already reject a missing export, a renamed symbol, a wrong type, and a malformed manifest, so a test asserting any of those gives you a second place to edit when the rule changes.

Nothing gets a test for staying absent. A deleted export leaves no caller that compiles, and that is the proof.

A fixture cast is fine with a short comment naming what makes it safe. `any` stays banned in tests.

---

## Apps

The three Next.js apps have their own rules in [`apps/AGENTS.md`](apps/AGENTS.md). Read it before touching `apps/`.

---

## Ask before acting outside the repo

Anything that leaves this machine needs an explicit request first: opening a PR, filing or commenting on an issue, publishing a package, and deploying. Prepare the work, show it, and wait.
