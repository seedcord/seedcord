name: prevent-reinvention description: Use this before adding code, config, or components in the seedcord monorepo. Audit the existing surface first, then either reuse what exists or add a clean shared extension in the right package. Follow these checks unless the user explicitly instructs otherwise.

# Prevent Reinvention & Tech-Debt Discipline

Seedcord is a monorepo. Focused leaf packages under `packages/` (`@seedcord/core`, `@seedcord/gateway`, `@seedcord/http`, `@seedcord/types`, `@seedcord/utils`, `@seedcord/logger`, `@seedcord/errors`) hold the framework, and the `seedcord` package under `cli/` re-exports them and ships the CLI. Docs tooling (`@seedcord/docs-engine`, `@seedcord/docs-generator`) is under `tooling/`, the Next.js 16 and React 19 apps are in `apps/{docs,guide,home}`, and `mocks/` holds runnable bots for end-to-end tests. There is a unified `tsconfig` package, an `eslint-config` package, a `tsdown-config` package, and a workspace catalog (`pnpm-workspace.yaml`) that pins shared versions. Every new piece of code is one of two things:

1. **Reuse** of an existing primitive, helper, type, convention, or pattern.
2. **A justified, named extension** to that existing surface, added in the right package, exported through the right boundary, then reused.

There is **no third option.** If neither reuse nor a clean shared extension fits, stop and ask the user. Do not invent a local workaround. Inline duplication is not a "small thing." Reinventing a Logger, a CooldownManager, a string utility, or a bus subscriber helper is not a "quick win." Each duplicate creates tech debt that compounds across packages and across PRs until the conventions stop mattering and someone has to do a multi-package cleanup. The same logic applies to types, error classes, validation, and code structure: a small antipattern shipped today becomes a multi-file migration in three months.

Before writing any new code, run the checks below. If the answer to any is "I haven't checked," go check. Only depart from these checks when the user explicitly asks for a different approach or a repo-level instruction overrides them.

---

## Reuse Checks (Part 1, run BEFORE writing)

### 1. Does the helper already exist in a shared package?

If you're about to write a string utility, number helper, object helper, type-fest-style mapped type, brand utility, logger, cooldown manager, lifecycle hook, typed event emitter, error class, or health check: **read the shared package indexes first.**

- `packages/utils/src/index.ts` re-exports `misc`, `numbers`, `objects`, `strings`, `brand`. Look here for `cn`-style guards, formatting helpers, set/object operations, and string transforms before writing your own.
- `packages/types/src/index.ts` exports shared TypeScript `Types` and `Interfaces`. Use `import type { … } from '@seedcord/types'` for the existing alias. Do not define the same alias locally.
- `@seedcord/core/node`, `HealthCheck` and the lifecycle coordinators. `@seedcord/logger`, the `Logger`. Compose these. Do not parallel-implement them inside a bot or plugin.
- `packages/event-emitter/src/index.ts`, `TypedEventEmitter`, the typed cross-runtime event emitter. Extend it for typed events. Do not hand-roll an emitter or add `mitt` / `eventemitter3`.
- `packages/seedcord/src/{bot,bus,hmr,interfaces,miscellaneous,Seedcord.ts}` is the framework surface. The bus (`core.bus`, `Subscriber<K>`, `@Subscribe(...)`, `BusEvents` augmentation), interfaces, and the `Seedcord` orchestrator are first-class, public APIs.
- `plugins/*` holds the first-party plugin packages. If your "feature" is really a plugin, it becomes a package there. The contract itself is `@seedcord/core/plugin`.
- `packages/cli/src` is the seedcord CLI built on Commander + Ink. CLI-shaped features extend this. Do not build a new ad-hoc CLI.

If your helper is "almost" one that already exists but has one different behavior, that is a missing **option / overload / variant**. It is not a new helper. Extend the existing one and use it. Inline duplication of "just one slightly different formatter" is how packages drift.

### 2. Is the literal value a typed constant?

Any magic number, error message format, ANSI color string, log prefix, env var name, or repeated literal you're about to scatter across files:

- Check whether `@seedcord/types` already defines the union or enum.
- Check whether `@seedcord/utils` already exposes the constant or formatter.

If the value isn't there but you're about to use it more than once, **add a named constant first, then use it.** The threshold for "this needs a name" is three uses. The cost of naming a literal is one export. The cost of not naming it is grepping across the monorepo later.

For app code under `apps/docs` (and `apps/guide`, `apps/home` when populated), the same rule applies inside that app: look at `apps/docs/src/lib` (`logger.ts`, `hotkeys.ts`, `utils.ts`, `memberAccess.ts`, `entityMetadata.ts`, `settings/`, `shiki.ts`), `apps/docs/src/components/ui/` (`Button`, `CodeBlock`, `Tooltip`, `CopyButton`, `Icon`, etc.), and `apps/docs/src/store/` before writing a new helper, primitive, or store. A Tailwind class fragment used three times belongs in a shared constant in `lib/`.

### 3. Use the project's `cn` for classNames (never `[...].join(' ')`)

Inside `apps/docs/src` (and any sibling app), `cn` is exported from `@lib/utils`. It wraps `clsx` + `tailwind-merge`, which:

- Dedupes conflicting Tailwind utilities (`cn('px-2', 'px-4')` → `'px-4'`). Arrays joined by space carry dead conflicting classes.
- Filters falsy values, so `cn('a', isActive && 'b')` works directly, with no ternary returning empty string and no `.filter(Boolean)` boilerplate.

The companion `tw` template tag in the same file lets you author multi-line class strings without losing formatter support. Match what the existing primitives (e.g. `Button.tsx`) do. Use `cn` + `tw`, never `Array.join`.

The only legitimate use of `.join(' ')` in this repo is joining non-className strings (CLI args, log fragments).

### 4. Does a shared hook / store / type already exist?

Before writing a new hook, Zustand store, type alias, or React context in an app:

- `apps/docs/src/lib` holds utility helpers (`utils`, `hotkeys`, `logger`, `memberAccess`, `entityMetadata`, `shiki`, `settings/`).
- `apps/docs/src/components/ui` holds primitives (`Button`, `CodeBlock`, `CodePanel`, `CopyAnchorButton`, `CopyButton`, `Tooltip`, `Icon`, `ScrollToTopButton`).
- `apps/docs/src/store` holds Zustand stores.
- `apps/docs/src/components/{providers,header,layout,docs,search}` are the feature areas. Look here before parallel-building a "new" header or search.

If the helper would be reused across apps (`docs` + `guide` + `home`), it belongs in a shared package. Do not copy-paste it between apps. The current shared frontend surface is intentionally thin. When something genuinely deserves to be shared, surface that to the user before creating a new top-level package.

### 5. Where does this kind of file live in this repo?

Before creating any file, look at sibling packages. The conventions are consistent across `packages/seedcord`, `packages/gateway`, `packages/core`, `packages/utils`, `packages/types`, `packages/docs-engine`, `packages/docs-generator`:

- Tests live in `<package>/tests/` mirroring `src/`. Do not put tests in `src/**/*.test.ts`.
- Vitest is the runner (`vitest run` / `vitest dev`). Coverage runs via `vitest run --coverage`.
- Lint and tc scripts cover both `src/**` and `tests/**`.
- ESLint configs at the package root as `eslint.config.mjs` (flat config), composed from `@seedcord/eslint-config`.
- TypeScript configs extend `@seedcord/tsconfig` and never cross package source-path boundaries (no `paths` or `include` reaching into another package's `src`).
- Build packages use `@seedcord/tsdown-config` via tsdown, emitting `dist/index.d.mts` + `dist/index.mjs`. Published packages ship ESM only.
- Shared deps must live in `pnpm-workspace.yaml`'s `catalogs:` (`deps:` for app/runtime, `peer:` for peer deps) and be consumed as `catalog:deps` / `catalog:peer` from every `package.json`. Never pin the same version twice.

If you find yourself dropping a test in `src/`, putting setup in a non-conventional place, or wiring `paths` to another package's source: you're not matching the convention. Mirror an existing package.

### 6. Was this asked for?

If you're tempted to add a tsup `external` block, a custom prettier plugin, a "performance" optimization, a config tweak, a feature flag, a backward-compat shim, an abstraction, or anything else that wasn't in the task description: **don't.** Scope discipline is non-negotiable.

If you genuinely think the addition is needed, surface it as a question to the user _before_ implementing. "I'm about to add X to tsup.config because Y. Does that match what you want?" is cheap. Adding it silently and getting reviewed at PR time is expensive, because the diff buries the question in 200 lines of legitimate changes and the user can't tell what's their requirement and what's your improvisation.

### 7. Are you using a new npm package?

Before writing any code that uses a package not already in the workspace, fetch and read its README. Use `WebFetch` on the GitHub README or npmjs.com page for the exact version pinned in `pnpm-workspace.yaml`'s catalogs or in the consuming `package.json`. Never rely on training knowledge. Major version bumps routinely move, rename, or deprecate APIs. Seedcord deliberately tracks recent majors (Next.js 16, React 19, Discord.js 14.25, Tailwind 4, ESLint 9), so stale knowledge is especially likely to bite.

**Why:** Using stale knowledge about modern packages produces code built on deprecated subpaths and silently broken imports that the user has to fix mid-PR.

**How:**

1. Check the pinned version: `grep -E '<pkg>|catalog' pnpm-workspace.yaml package.json`
2. `WebFetch` the README for that version
3. Only then write code based on what the README actually documents

---

### 8. Is a "compatibility issue" actually real?

If you hit a peer-dependency conflict or a "this package doesn't support X" wall, **check upstream before giving up.** The pattern is always:

- `curl -s https://registry.npmjs.org/<pkg>/latest` for the metadata
- Read the actual peer range. Check whether a newer version of the conflicting package widens that range.

Saying "compatibility issue" without checking the upstream version range is a lie of omission. It locks the repo at stale versions forever. Same pattern for ESLint plugins, build tools, type packages, anything pinned via peer deps. Look upstream first.

---

## Code-Quality Rules (Part 2)

Type standards, error handling, structure, commenting, and validation discipline are defined as global always-on rules in `AGENTS.md`. Follow those while writing. They apply to every PR, whether or not you are running a reinvention audit.

For targeted guidance on specific topics, see:

- **[`FAIL-FAST-RULES.md`](./FAIL-FAST-RULES.md)** covers null/undefined handling, invariant checks, and when NOT to use `?.` / `??`
- **[Code-Commenting Guidelines](../code-commenting-guidelines/SKILL.md)** covers when comments help vs. when they're noise

---

## Anti-patterns to refuse outright

Framework / packages:

- **Hand-rolled rate limiters, logger wrappers, lifecycle managers, or error hierarchies** when `@seedcord/rate-limiter`, `@seedcord/logger`, `@seedcord/core/node`, and `@seedcord/errors` already provide them.
- **Duplicate type aliases** in app or package code when `@seedcord/types` already exposes the same shape.
- **Local string/number/object helpers** that already live in `@seedcord/utils`.
- **Parallel CLI flows.** Extend `@seedcord/cli`'s Commander + Ink structure.

Apps:

- **Inline button/tooltip/code-block markup** in a `docs` page when `apps/docs/src/components/ui/` already exports the primitive.
- **Hardcoded class strings** scattered across components when a `tw\`…\``constant in the same file (or a shared`lib/` export) covers the case.
- **`[a, b, c].join(' ')` for classNames.** Use `cn(a, b, c)` from `@lib/utils`.

Files & config:

- **Test files in `src/`** when every other package puts them in `tests/`.
- **Unrequested config blocks** (tsup externals, custom plugins, polyfills, aliases) added to "improve" build output without measurement or ask.
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

If no existing surface fits and there is no clean shared extension path, stop and ask the user. Do not add an app-local exception.

1. **Add it in the shared package.** Do not add it in the consuming app or downstream package.
    - Pure type / interface: `@seedcord/types`
    - Pure helper (string/number/object/brand/misc): `@seedcord/utils`
    - Runtime service (logger, rate limiter, lifecycle, error class, health check): `@seedcord/logger` / `@seedcord/rate-limiter` / `@seedcord/core/node` / `@seedcord/errors`
    - Typed event emitter: `@seedcord/event-emitter`
    - Framework-level bus event, interface, or orchestrator hook: `@seedcord/seedcord`
    - Plugin-shaped behavior: a package under `plugins/`
    - CLI command / Ink component for the CLI: `@seedcord/cli`
    - Doc-extraction or doc-rendering logic: `@seedcord/docs-generator` / `@seedcord/docs-engine`
2. **Add the export** to the relevant `src/index.ts` (and `internal.index.ts` if it's an internal-only surface). Update the package.json `exports` field and the tsup config entry if the package uses tsup.
3. **Rebuild the package** (`pnpm -C packages/<name> build`) so consumers see the new export.
4. **Use it from the call site.** Inline duplication of the new helper defeats the point.
5. **Document the rationale inline** only if the addition exists for a non-obvious reason (a specific Discord.js quirk, a runtime constraint, a license requirement). Otherwise the name is the documentation.

If the change is published-package-affecting, also add a `changeset` (`pnpm cs`) so the version bump and changelog land with the code.

---

## Review checklist

Before opening a PR, ask:

1. Did I grep the relevant `@seedcord/*` package indexes (and the app's `lib/` / `components/ui/`) before writing my helper / type / primitive?
2. Is every repeated literal either a named constant in a shared package or a typed alias in `@seedcord/types`?
3. Am I using `cn()` for classNames in app code, and avoiding array `.join`?
4. Are my tests in `tests/` mirroring `src/` like every other package?
5. Does my code have zero `any`, zero `as unknown as T` doubles, zero silent fallbacks?
6. Did the task ask for every config change in my diff, or did I add improvements?
7. For every version pin I left untouched citing "compatibility," did I cite the upstream peer-dep range?
8. Did I delete the comments that just restate the code below them?
9. If the change is public-API-affecting, did I add a `changeset`?
10. Does `pnpm -C <pkg> lint:fix && pnpm -C <pkg> tc && pnpm -C <pkg> test` exit cleanly?

If any answer is "no" or "I didn't check," the PR is not ready.
