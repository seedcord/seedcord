---
name: prevent-reinvention
description: Use this before adding code, config, or components in the seedcord monorepo. Audit the existing surface first, then either reuse what exists or add a clean shared extension in the right package. Follow these checks unless the user explicitly instructs otherwise.
---

# Prevent Reinvention & Tech-Debt Discipline

The root `AGENTS.md` has the repo map. Every new piece of code is one of two things:

1. **Reuse** of an existing primitive, helper, type, convention, or pattern.
2. **A justified, named extension** to that existing surface, added in the right package, exported through the right boundary, then reused.

If neither one fits, stop and ask the user. A local workaround copies what already exists. A second logger, rate limiter, string helper, or bus subscriber helper splits one behavior across two places. The copies drift apart, and someone later has to clean up several packages at once. Types, error classes, and validation follow the same rule.

Before writing any new code, run the checks below. If the answer to any is "I haven't checked," go check. Only depart from these checks when the user explicitly asks for a different approach or a repo-level instruction overrides them.

---

## Reuse Checks (Part 1, run BEFORE writing)

### 1. Does the helper already exist in a shared package?

If you're about to write a string utility, number helper, object helper, type-fest-style mapped type, brand utility, logger, cooldown manager, lifecycle hook, typed event emitter, error class, or health check: **read the shared package indexes first.**

- `packages/utils/src/index.ts` re-exports `files`, `misc`, `numbers`, `objects`, `strings`. Look here for guards, formatting helpers, set/object operations, and string transforms before writing your own.
- `packages/types/src/index.ts` exports shared TypeScript `Types` and `Interfaces`. Use `import type { … } from '@seedcord/types'` for the existing alias. Do not define the same alias locally.
- `@seedcord/core/node`, `HealthCheck` and the lifecycle coordinators. `@seedcord/logger`, the `Logger`. Compose these. Do not parallel-implement them inside a bot or plugin.
- `packages/event-emitter/src/index.ts`, `TypedEventEmitter`, the typed cross-runtime event emitter. Extend it for typed events. Do not hand-roll an emitter or add `mitt` / `eventemitter3`.
- `packages/core/src/subscribers` holds the bus: `core.bus`, `Subscriber`, `@Subscribe(...)`, and the `Subscriptions` interface a bot augments with its own events. Both transports re-export it. Extend it before building another event channel.
- `plugins/*` holds the first-party plugin packages. If your "feature" is really a plugin, it becomes a package there. The contract itself is `@seedcord/core/plugin`.
- `cli/seedcord/src` is the seedcord CLI built on Commander + Ink. CLI-shaped features extend this. Do not build a new ad-hoc CLI.

When your helper is almost one that exists, with one different behavior, the existing one is missing an **option, overload, or variant**. Extend it and use it. A second formatter that differs in one detail is how packages drift apart.

### 2. Is the literal value a typed constant?

Any unnamed number, error message format, ANSI color string, log prefix, env var name, or other literal that you're about to repeat across files:

- Check whether `@seedcord/types` already defines the union or enum.
- Check whether `@seedcord/utils` already exposes the constant or formatter.

If the value isn't there but you're about to use it more than once, **add a named constant first, then use it.** Three uses means it needs a name. Naming it costs one export. Leaving it unnamed costs a grep across the monorepo later.

For app code, the same rule applies inside that app: look at `tooling/ui/src` and the app's `src/lib` before writing a new helper or primitive. A Tailwind class fragment used three times belongs in a shared constant.

### 3. Use the project's `cn` for classNames

Build classNames with `cn` and `tw` from `@seedcord/ui`. [TAILWIND.md](./TAILWIND.md#rule-1-use-cn-for-dynamic-classnames) covers both.

### 4. Does a shared hook / store / type already exist?

Before writing a new hook, Zustand store, type alias, or React context in an app:

- `tooling/ui/src` holds the primitives, and `tooling/ui/src/lib` holds shared hooks and helpers.
- `apps/docs/src/lib` holds docs helpers, and `apps/docs/src/store` holds Zustand stores.
- `apps/docs/src/components/{providers,header,layout,docs,search}` are the docs feature areas. Look here before parallel-building a "new" header or search.

If the helper would be reused across apps (`docs` + `guide` + `home`), it belongs in `@seedcord/ui`. Do not copy-paste it between apps.

### 5. Where does this kind of file live in this repo?

Before creating any file, look at sibling packages. The conventions are consistent across `packages/*` and `tooling/*`:

- Tests live in `<package>/tests/` mirroring `src/`. Do not put tests in `src/**/*.test.ts`.
- Vitest is the runner (`vp test run` / `vp test dev`). Coverage runs via `vp test run --coverage`.
- Lint and tc scripts cover both `src/**` and `tests/**`.
- ESLint configs at the package root as `eslint.config.ts` (flat config), composed from `@seedcord/eslint-config`.
- TypeScript configs extend `@seedcord/tsconfig` and never cross package source-path boundaries (no `paths` or `include` reaching into another package's `src`).
- Build packages use `@seedcord/tsdown-config` via tsdown, emitting `dist/index.d.mts` + `dist/index.mjs`. Published packages ship ESM only.
- Shared deps must live in `pnpm-workspace.yaml`'s `catalogs:` (`deps:` for app/runtime, `peer:` for peer deps) and be consumed as `catalog:deps` / `catalog:peer` from every `package.json`. Never pin the same version twice.

If you find yourself adding a test in `src/`, putting setup in a non-conventional place, or wiring `paths` to another package's source: you're not matching the convention. Mirror an existing package.

### 6. Was this asked for?

Leave out anything that the task didn't ask for. Common cases are a bundler `external` block, a custom prettier plugin, a speed optimization, a config tweak, a feature flag, a backward-compat shim, and an abstraction. [DESIGN.md](./DESIGN.md#7-smallest-version-first) covers how small the change should be.

If you think the addition is needed, ask the user _before_ writing it. "I'm about to add X to the `pack` block in vite.config.ts because Y. Does that match what you want?" costs one message. Adding it without asking hides the question in 200 lines of real changes, and the user can't tell which parts they asked for.

### 7. Are you using a new npm package?

Before writing any code that uses a package that the workspace doesn't have yet, fetch and read its README. Read the GitHub README or the npmjs.com page for the exact version pinned in `pnpm-workspace.yaml`'s catalogs or in the consuming `package.json`. Never rely on training knowledge. Major version bumps routinely move, rename, or deprecate APIs. Seedcord deliberately tracks recent majors, so stale knowledge is especially likely to bite.

**Why:** Using stale knowledge about modern packages produces code built on deprecated subpaths and silently broken imports that the user has to fix mid-PR.

**How:**

1. Check the pinned version: `grep -E '<pkg>|catalog' pnpm-workspace.yaml package.json`
2. Fetch the README for that version
3. Only then write code based on what the README actually documents

---

### 8. Is a "compatibility issue" actually real?

If you hit a peer-dependency conflict or a "this package doesn't support X" wall, **check upstream before giving up.** The pattern is always:

- `curl -s https://registry.npmjs.org/<pkg>/latest` for the metadata
- Read the actual peer range. Check whether a newer version of the conflicting package widens that range.

Saying "compatibility issue" without checking the upstream version range is a lie of omission. It locks the repo at stale versions forever. Same pattern for ESLint plugins, build tools, type packages, anything pinned via peer deps. Look upstream first.

---

### 9. Does a dependency already in the tree export it?

Before you write a type, a helper, a constant, or a parser for something a dependency deals with, check whether that dependency exports one. Check 7 covers a package you are adding. This check covers every package that the workspace has installed.

1. Read the `exports` map in the dependency's `package.json`. A subpath like `cf/config` or `@seedcord/errors/internal` is a separate surface.
2. Open the `.d.ts` behind each entry and read its export list. A bundled `.d.ts` re-exports from a chunk file, so follow the import to find the declarations.
3. Use the exported type with `Parameters`, `ReturnType`, `Partial`, or an indexed access. Call the exported helper. Only write your own when nothing in the dependency fits, and say so in the PR.

A real miss: a test helper took `{ env?: Record<string, unknown>; [field: string]: unknown }` for a `cloudflare.config.ts` worker, where `cf/config` exports `WorkerConfig` and the `bindings` and `exports` helpers. A Durable Object binding missing its `worker` field then failed at build time. With `Partial<WorkerConfig>`, `tc` would have reported it.

This applies to tests as much as to source. A test helper typed loosely accepts a config the real tool rejects.

---

## Code-Quality Rules (Part 2)

`AGENTS.md` sets the rules for errors, derived types, and dead code on every PR. For the rest, see:

- **[`DESIGN.md`](./DESIGN.md)** covers root causes, one source of truth, and the smallest version first
- **[`FAIL-FAST-RULES.md`](./FAIL-FAST-RULES.md)** covers null/undefined handling, invariant checks, and when NOT to use `?.` / `??`
- **[Code-Commenting Guidelines](../code-commenting-guidelines/SKILL.md)** covers when comments help vs. when they're noise

---

## Anti-patterns to refuse outright

Framework / packages:

- **Hand-rolled rate limiters, logger wrappers, lifecycle managers, or error hierarchies** when `core.rateLimiter`, `@seedcord/logger`, `@seedcord/core/node`, and `@seedcord/errors` already provide them.
- **Duplicate type aliases** in app or package code when `@seedcord/types` already exposes the same shape.
- **Local string/number/object helpers** that already live in `@seedcord/utils`.
- **Parallel CLI flows.** Extend `cli/seedcord`'s Commander + Ink structure.

Apps:

- **Inline button/tooltip/code-block markup** when `@seedcord/ui` already exports the primitive.
- **Hardcoded class strings** scattered across components when a `tw` constant in the same file covers the case.
- **`[a, b, c].join(' ')` for classNames.** Use `cn(a, b, c)` from `@seedcord/ui`.

Files & config:

- **Test files in `src/`** when every other package puts them in `tests/`.
- **Unrequested config blocks** (bundler externals, custom plugins, polyfills, aliases) added to "improve" build output without measurement or ask.
- **Cross-package source paths** (`paths` or `include` reaching `../../packages/x/src`). Consume via package exports.
- **Pinning the same dep twice** when the workspace catalog already exposes it.
- **"Compatibility issue"** as a reason to skip a version bump without showing the upstream peer-dep range.

Code quality:

- **`as any`** is banned.
- **`as unknown as T`** double casts when a single cast or type guard works.
- **Silent fallbacks** (`obj?.x ?? null` returned to a caller that needed the real value).
- **Decorative comments** that restate the line below them.
- **Banner comments** like `/* ============ Header ============ */`.
- **Static-only classes** used as namespaces. Use named exports instead.
- **Pre-emptive "for the future"** abstractions: feature flags, plugin registries, helper hierarchies. YAGNI.
- **Mid-flight scope creep**, adding "while I'm here" cleanups in a focused PR.
- **Commenting out** code or tests to bypass failures.

When you catch yourself doing one of these, **stop and back up.** Either reuse what exists, extend it the right way, or ask the user. Do not ship the duplicate "for now."

---

## When extending a shared package

If you genuinely need a new helper, type, error class, service, or framework primitive:

When nothing that exists fits and you can't extend a shared package cleanly, stop and ask the user. Don't add an app-local exception.

1. **Add it in the shared package.** Do not add it in the consuming app or downstream package.
    - Pure type / interface: `@seedcord/types`
    - Pure helper (string/number/object/brand/misc): `@seedcord/utils`
    - Runtime service (logger, rate limiter, lifecycle, error class, health check): `@seedcord/logger` / `@seedcord/core` / `@seedcord/core/node` / `@seedcord/errors`
    - Typed event emitter: `@seedcord/event-emitter`
    - Framework-level bus event, interface, or orchestrator hook: `@seedcord/core`
    - Plugin-shaped behavior: a package under `plugins/`
    - CLI command / Ink component for the CLI: `cli/seedcord`
    - Doc-extraction or doc-rendering logic: `@seedcord/docs-generator` / `@seedcord/docs-engine`
2. **Add the export** to the relevant `src/index.ts` (and `internal.index.ts` if it's an internal-only surface). Update the package.json `exports` field and the `pack` entry in `vite.config.ts` for a new entry point.
3. **Rebuild the package** (`vp -C packages/<name> run build`) so consumers see the new export.
4. **Use it from the call site.** Inline duplication of the new helper defeats the point.
5. **Document the rationale inline** only if the addition exists for a non-obvious reason (a specific Discord.js quirk, a runtime constraint, a license requirement). Otherwise the name is the documentation.

If the change is published-package-affecting, also add a `changeset` (`vp run cs`) so the version bump and changelog ship with the code.

---

## Review checklist

Before opening a PR, ask:

1. Did I check the relevant `@seedcord/*` package indexes (and `@seedcord/ui`, plus the app's `lib/`) before writing my helper / type / primitive? Did I read the `.d.ts` exports of every third-party dependency it describes?
2. Is every repeated literal either a named constant in a shared package or a typed alias in `@seedcord/types`?
3. Am I using `cn()` for classNames in app code, and avoiding array `.join`?
4. Are my tests in `tests/` mirroring `src/` like every other package?
5. Is my code free of `any`, `as unknown as T` double casts, and silent fallbacks?
6. Did the task ask for every config change in my diff, or did I add improvements?
7. For every version pin I left untouched citing "compatibility," did I cite the upstream peer-dep range?
8. Did I delete the comments that only restate the code below them?
9. If the change is public-API-affecting, did I add a `changeset`?
10. Does `vp run check --filter=<pkg>` exit cleanly?

If any answer is "no" or "I didn't check," the PR is not ready.
