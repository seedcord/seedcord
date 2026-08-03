# Seedcord Agent Guidelines

> Pre-1.0 framework — breaking changes are accepted between minors. Add a `changeset` for every published-package change.

---

## Grounding (read this first)

Most of this framework's design is already settled. Unverified claims produce confident-looking but incorrect output that wastes hours to debug.

Common failure mode: **grounding on the immediate context, then inferring how it connects elsewhere.** Examples: asserting that duplicate call sites share identical implementations without checking their bodies; implementing a hot-reload method without reading the dispatcher; labeling something a contradiction when a decision record already resolved it.

1. **Cite or flag every load-bearing sentence.** Each claim must carry a `file:line` reference from this session, or the word "assumption". Nothing unlabeled. Labeled guesses add one line of reading; unlabeled ones waste hours.

2. **Open both ends before designing APIs.** Before writing an interface, method, type, or claim "X must be Y", read the module that implements or consumes it. A design sketch is unverified until you verify the code.

3. **Check decision records first.** Before claiming a gap, contradiction, or unresolved issue, search the project's decision records and checklists (authority, with later entries superseding earlier ones in the same file). Assume the maintainer already decided it.

4. **One hop out.** For claims depending on how two things connect, open both ends, including the one you are not editing.

Same standard applies to delegated work. Reopen any citation yourself before relaying it—a wrong finding reported with confidence is the same defect with an added layer.

---

## Repository Policy

**Zero Technical Debt.** No workarounds, hacks, or temporary compatibility layers. Choose the cleanest architecture; break things if needed to get it right. After making changes that affect the framework's public surface, regenerate docs (`pnpm docs:extract`, or `pnpm docs:smoke` to extract + run the docs-engine smoke pass).

**Scope discipline.** Only implement what was explicitly asked. Surface additions as a question before implementing — never silently add config tweaks, optimizations, feature flags, or abstractions not in the task description.

**No dead code.** No commented-out code, half-finished `// TODO: complete later` implementations, or unused exports. Before adding `export` to a symbol, verify it is consumed outside the file. If it isn't, drop the `export`. If nothing uses it, delete it.

**Do not edit `AGENTS.md`, `TASKS.md`, or any file in `.changeset/` without explicit permission.**

**Respect `Note for Agent:` comments.** The user may add these mid-flight as deliberately-failing type errors or lint errors so they surface when you run checks. Read and honor them before continuing; remove the comment when done.

```ts
// This will cause a lint error
('Note for Agent: switch to the new effects API');

type NoteForAgentAddedByTheUser = 'switch to the new effects API';
const x: NoteForAgentAddedByTheUser = 42; // forces a type error
```

---

## Design Patterns

- **OOP for complex domain logic** (inheritance & composition). **Plain functions for small, stateless utilities.** Seedcord's framework surface leans on classes — extend or compose them rather than re-implementing parallel function pipelines.

- **No static-only classes as namespaces.** Use named exports instead.

- **Function declarations for complex exported functions.** Arrow expressions for inline callbacks and short utilities only — no block-bodied exported arrows.

- **DRY and SOLID.** No premature abstractions — three similar lines is better than a wrong abstraction. Wait for the third use before extracting.

- **YAGNI (You Aren't Gonna Need It).** Don't add features, config, abstractions, or infrastructure for hypothetical future requirements. Ship what the task requires; surface everything else as a question first.

- **No premature optimization.** Don't optimize for performance without a measured bottleneck. Readable, correct code first — profile, then optimize. Adding memoization, caching, or batching "just in case" creates complexity without verified benefit.

- **Style log messages with `@seedcord/logger`.** Interpolated values in a framework log line (routes, class names, ids, paths) get the truecolor tones defined in `paint`, never default chalk colors (`chalk.cyan`, `chalk.red`, and the rest are banned in log lines). Multi-line output goes through `logger.utils` (`summary`, `block`, `entries`). Unstyled interpolation in a framework log line is a bug.

- **Split large files** (~200+ lines or multiple unrelated responsibilities) into focused modules.

---

## Type Standards

- **No `any` in production code.** Use `unknown` then narrow with a type guard. If a third-party library forces a cast, prefer a single `as Expected` with `// justified: <reason>`.
- **No `as unknown as T` double casts.** Fix the declaration, write a type guard, or refactor the API instead.
- **Don't cast values that are already correctly typed** — adjust the type instead.
- **Prefer `?.` and `??`** for genuinely optional branches — not to suppress errors or hide broken assumptions. See `.github/skills/code-quality/FAIL-FAST-RULES.md` for when NOT to reach for them.
- **Prefer `import type { T } from 'pkg'`** for type-only imports. Avoid inline `import('pkg').T`.
- **Use `type-fest` utility types** (available via the workspace catalog) for structural transforms rather than casts. The shared `@seedcord/types` package re-exports project-specific aliases — check there first.
- **Derive types from their source, never restate them.** A ctor shape is `TypedConstructor<typeof X>` (see `gateway/src/handlers/constructors.ts`), a member union comes from `keyof`, `TypedExtract`/`TypedExclude`, indexed access, or a template-literal map over the owning enum, a narrowed copy from `Pick`/`TypedOmit`. A hand-written structural duplicate drifts from its source.
- **Tests may use pragmatic fixture casts** (`as unknown as Test`) — always include a short justification comment. Tests must not use `as any`; ESLint replaces `any` with `unknown` automatically and that will surface real type errors if the cast wasn't justified.
- **To disable an ESLint rule inline:** `// eslint-disable-next-line <rule> -- <reason>`. Never file-wide or project-wide.
- **Never throw a raw error.** Framework code throws `SeedcordError`, `SeedcordTypeError`, or `SeedcordRangeError` from `@seedcord/errors`, each with a registered code. Translate a third-party throw into one of the three before it propagates to the consumer.

```ts
// Bad
let v: any;
const a = (obj as any).x ?? 'd';
const v = x as unknown as T;

// Good
let v: unknown; // then narrow with a type guard
const a = obj?.x ?? 'd';
if (isT(x)) {
    const v = x;
}
import type { Foo } from 'pkg'; // not import('pkg').Foo
```

---

## Imports & Dependencies

- **Never wire cross-package source paths.** No `paths` or `include` reaching `../../packages/x/src`. Consume via package exports only — the `exports` map in each package's `package.json` is authoritative.
- **Use path aliases** (e.g. `@lib/...`, `@components/...`, `@seedcord/...`) over deep relative imports; update `tsconfig.json` if needed. Apps under `apps/<name>` define their own alias map in their `tsconfig.json`.
- **Add deps with `pnpm add`** so the lock file updates. Inspect type declarations before relying on them.
- **Check upstream peer-dep ranges** before citing compatibility blockers — `curl -s https://registry.npmjs.org/<pkg>/latest`, look at the actual peer range, and check whether a newer version of the conflicting package widens it before pinning or skipping a bump.
- **Workspace catalog rule:** If a dep appears in 2+ packages, add it to `pnpm-workspace.yaml` under the appropriate `catalogs:` key (`deps:` for runtime, `peer:` for peer deps) and reference it as `catalog:deps` / `catalog:peer` in every `package.json`. Never pin the same version string in multiple places.
- **Inspect type declarations for third-party packages** before relying on them. Major version bumps routinely move, rename, or deprecate APIs. Fetch the README of the pinned version when in doubt — don't rely on training knowledge for fast-moving packages (React 19, Next.js 16, Discord.js 14.25, Tailwind 4, ESLint 9).

---

## Workflow

- **Run from repo root:** `pnpm -C <package> <script>`. Use `cd` only as a fallback.
- **Execute scripts** with `pnpm exec tsx file.ts` (tsx is installed at the workspace root) or `pnpm -C <pkg> exec tsx file.ts`.
- **Move/rename files** with `git mv` to preserve history.
- **Find usages** with `rg` or `grep` before modifying or removing anything.
- **Verify paths** with `pwd` and `ls` when hitting "No such file or directory."
- **Use package `scripts`** for common tasks; add and document new scripts when needed. Check the closest `package.json` first — don't assume scripts exist.
- **Prefer changing file extension to `.txt`** to preserve files marked for deletion (preserves git history).
- **When a shared package changes, rebuild it** (`pnpm -C packages/<name> build`) and re-run `tc` on the dependents (e.g. `pnpm -C packages/gateway tc`, `pnpm -C apps/docs tc`).
- **Run `pnpm prePush`** before pushing — it runs `build && tc && lint && test` across the whole workspace and is what husky's pre-push hook gates on.
- **For published packages**, add a `changeset` (`pnpm cs`) so the release pipeline can publish the new version and changelog entry. `pnpm cs:status` shows pending changesets.

---

## Repo Surface (where things live)

A monorepo of focused leaf packages under `packages/`, Next.js apps under `apps/`, and a mock Discord bot under `mock/` consumed by tests. Read a package's own barrel and `package.json` for its current surface.

`.github/skills` holds the skill libraries. `.claude/skills` symlinks to it, and `CLAUDE.md` symlinks to this file.

---

## UI Primitives (apps)

The Next.js apps each own their primitives under `apps/<name>/src/components/ui/`. Raw `<button>` / `<input>` / `<select>` markup is banned when the primitive exists in the app, so read the `components/ui/` index first, every time. Use `cn(...)` (from each app's `@lib/utils`) for class composition and the `tw\`…\``template tag for multi-line class strings. Icon-only actions:`<Button variant="ghost" size="icon">`.

A "one-off style" is a missing variant in the primitive's `VARIANTS` map, not an excuse to inline styles. If a primitive doesn't exist yet, that's a signal to either lift the pattern (when used in 2+ apps) or build the primitive in the app where it belongs.

Same rule applies before writing a new hook, helper, or store in any app: check `apps/<name>/src/lib/`, `src/store/`, and `src/components/` first.

---

## Design fidelity

When a mock or design reference is provided for an app, it is visual ground truth, not a loose reference. Every visible difference between the mock and the implementation is a bug unless explicitly listed in a written "Explicitly Descoped" section. If the project later adopts a UI quality bar doc (e.g. `.vscode/docs/UI_QUALITY_BAR.md`), read it before any UI work — it encodes tokens, animation rules, primitive conventions, and the iteration protocol. Deviations from mock require a written justification in the PR description. The `frontend-iteration` skill documents the interactive iteration loop.

---

## React / Next.js Patterns

These apply to `apps/{docs,guide,home}` and to the Ink-based React surface in `packages/seedcord/src`. `react-doctor` catches many of them (`pnpm react-doctor`, run deliberately, off `prePush`), and the rest are review-enforced:

- **`.filter().map()`** → combine into a single `.reduce()` — never iterate twice.
- **`array.includes()` in a loop** → `new Set()` for O(1) membership; build it once outside the loop.
- **`font-bold` on `<h1>`–`<h6>`** → `font-semibold`. Bold weight crushes counter shapes at display sizes.
- **No em dash (`—`) in JSX text** — use comma, colon, semicolon, or parentheses.
- **`useState(propValue)` without sync** — if the prop can change externally, add `useEffect(() => { setState(prop); }, [prop])`, or remount the component via a `key` that changes with the prop.
- **No array index as React key** — use a stable identity (id, slug, name). Static arrays with no id: use the content string.
- **No mutable values in deps** (`location.pathname`, `ref.current`) — they don't trigger re-renders.
- **No hydration mismatch sources** (`new Date()`, `Math.random()`, `window.*`) reachable from JSX during SSR — move into `useEffect` and back with state.
- **React 19**: `use(Context)` not `useContext(Context)`; `ref` is a normal prop, no `forwardRef`.
- **No barrel imports inside the same app** when the direct file is one folder away.
- **Tailwind v4 syntax**: `bg-(--token)` not `bg-[var(--token)]`; `bg-color/50` not `bg-opacity-50`; `outline-hidden` not `outline-none`.

See `.github/skills/code-quality/REACT19.md` and `.github/skills/code-quality/TAILWIND.md` for the long-form rationale.

---

## Dependencies and Exports

- **YAGNI on deps.** Never `pnpm add` a package until the code using it is written in the same commit. Unused deps are dead code — remove them, don't leave them as "future prereqs."
- **Dead exports.** Before adding `export` to a symbol, verify it is consumed outside the file. Unused exports are dead code — remove the `export` keyword.
- **Export what callers name.** Add `export` to a symbol only when a consumer might have to reference it by name, whether in a variable annotation, a function parameter or return type, or an `extends`/`implements` clause. A helper type that appears only as the structural shape of another exported type's field stays internal. The parent's own declaration still resolves it in the emitted `.d.ts`, and api-extractor rolls it into the docs with a link (no sidebar entry), so the public surface stays limited to what callers actually write.
- **Run a dead-code sweep before committing** with `pnpm knip` from the repo root (configured via `knip.json`), plus the manual `rg` checklist in `.github/skills/code-quality/SKILL.md`.

---

## Tests

- **Tests live in `<package>/tests/`** mirroring `src/` — not in `src/**/*.test.ts`. The lint/tc scripts in each package's `package.json` already cover `tests/**`.
- **Vitest** is the runner; `pnpm -C <pkg> test` runs once, `pnpm -C <pkg> test:watch` watches, `pnpm -C <pkg> coverage` reports.
- **Never run tests before lint:fix and tc pass cleanly** — that includes the test files themselves.
- **Tests may use pragmatic fixture casts** (`as unknown as Test`) with a short justification comment. **No `as any`** even in tests.
- **Don't comment out failing tests** to make a build pass. Fix the root cause.
- **Don't skip writing tests because they're complex** — write whatever mocks or helpers you need to mimic real usage. The `mock/` package is the canonical example of a runnable Discord bot harness you can wire into framework-level tests.

---

## Quality Gates

Run after every change, in order:

```sh
pnpm -C <pkg> lint:fix   # always lint:fix, never plain lint
pnpm -C <pkg> tc
pnpm -C <pkg> test       # only after lint + tc pass; only if the package has tests
```

When changing a shared package, rebuild it and verify dependents:

```sh
pnpm -C packages/<name> build
pnpm -C packages/<dependent> tc
pnpm -C apps/<dependent-app> tc
```

Before pushing, run the full workspace gate:

```sh
pnpm prePush             # build && tc && lint && test, what husky's pre-push hook runs
```

**The only acceptable outcomes:**

- `lint:fix` → 0 errors, 0 warnings
- `tc` → 0 errors
- `test` → 100% passing
- `prePush` → exit 0

**Do not:**

- Comment out tests or code to fix failures — fix the root cause.
- Skip tests because they're complex — write mocks and helpers to make them work.
- Weaken assertions or add broad `eslint-disable` to bypass failures.
- Skip hooks (`--no-verify`, `--no-gpg-sign`) unless the user explicitly asked.

If auto-fixes occur while you edit, re-run lint/tc/tests locally to confirm the final state before opening a PR.

---

## Response Format

At the end of the final response, include a concise summary of which files changed, what was done in each, and why.
