- Prefer object-oriented design (inheritance & composition) for complex domain logic; prefer plain functions for small, stateless utilities.

```ts
// Bad
export function a() {}
export function b() {}

// Good
export class UserService {
    create() {}
    update() {}
}
```

---

- Avoid using classes purely as namespaces (static-only classes). Prefer named exports or plain objects.

```ts
// Bad
export class Utils {
    static foo() {}
}

// Good
export function foo() {}
```

---

- Prefer `import type { T } from 'pkg'` for type imports; avoid inline `import('pkg').T` unless documented. Same goes for regular imports as well

```ts
// Bad
type X = import('pkg').Type;
const C: import('pkg').Class;

// Good
import type { Type as X } from 'pkg';
import { Class as C } from 'pkg';
```

---

- Do not use `any` in production code; prefer `unknown` or concrete types and document exceptions inline.

```ts
// Bad
let v: any;

// Good
let v: unknown; // then narrow
```

---

- Tests may use pragmatic casts for fixtures (e.g., `as unknown as Test`), but prefer proper types and short justification comments for casts. (Test override exists)

```ts
// Acceptable in tests
const mock = {} as unknown as Core; // test fixture
```

---

- For tests: avoid `as any`. Prefer `unknown` or explicit fixture types and include a short justification comment for any pragmatic casts so reviewers and automated agents understand why the cast is needed. ESLint will enforce this by replacing `any` with `unknown` automatically and that might cause type errors if the cast is not justified properly. If you must use `as any`, include a comment explaining why (and disable ESLint for that line).

```ts
// Bad
const mock = {} as any;

// Good
const mock = {} as unknown as Test; // justified: simple fixture for unit test
```

---

- Avoid redundant double-casts (`as unknown as T`); prefer single casts or type guards.

```ts
// Bad
const v = x as unknown as T;

// Good
const v = x as T; // or use a type guard
```

---

- Avoid `as any`; if necessary, include an inline justification comment.

```ts
// Bad
const x = y as any;

// Good
// justified:
const x = y as unknown as Expected;
```

---

- Prefer `?.` and `??` over casts for null/undefined handling.

```ts
// Bad
const a = (obj as any).x ?? 'd';

// Good
const a = obj?.x ?? 'd';
```

---

- Use utility types from @seedcord/types of type-fest (for example, `TypedPick`, `TypedOmit`, etc) rather than casts for structural transforms.

```ts
// Bad
type P = any;

// Good
type P = TypedPick<T, 'a' | 'b'>;
```

---

- Minimize explicit casts; prefer narrowing, type predicates, or API refactors.

```ts
// Bad
const s = value as unknown as string;

// Good
if (typeof value === 'string') {
    const s = value;
}
```

---

- Do not cast if the declared types are already correct; adjust types instead.

```ts
// Bad
const s = x as string; // x already string

// Good
const s = x;
```

---

- Run lint/typecheck/tests ALWAYS after changes. `pnpm -C <pkg> tc && pnpm -C <pkg> lint:fix && pnpm -C <pkg> test (if tests are available)

```sh
pnpm -C packages/foo lint:fix
pnpm -C packages/foo tc

# And if tests exist
pnpm -C packages/foo test
```

---

- Do NOT run `pnpm lint`. ALWAYS run `pnpm lint:fix` instead.

```sh
pnpm -C packages/foo lint:fix
```

---

- Prefer `pnpm -C <package> lint:fix` and `pnpm -C <package> tc` from repo root; `cd` into package is a fallback. (docs-generator package as an example)

```sh
pnpm -C packages/docs-generator lint:fix
pnpm -C packages/docs-generator tc
```

---

- Run `pnpm tc` before running package code and re-run after tests/fixes. (Docs)

```sh
pnpm -C packages/foo tc
pnpm -C packages/foo test
pnpm -C packages/foo tc
```

---

- Prefer `pnpm -C <package> <script>` from repo root; use `cd` fallback if needed. (Docs)

```sh
pnpm -C packages/foo test
# fallback
cd packages/foo && pnpm test
```

---

- When seeing 'No such file or directory', confirm with `pwd` and `ls` and use `pnpm -C` to avoid directory mistakes. (Troubleshooting)

```sh
pwd
ls -la
```

---

- Run `pnpm -C <package> lint:fix` regularly during edits.

```sh
pnpm -C packages/foo lint:fix
```

---

- Use package `scripts` for common tasks; add and document new scripts when needed.

```json
{ "scripts": { "dev": "tsx src/index.ts" } }
```

---

- If auto-fixes occur while you edit, re-run lint/tests locally to confirm the final state before PR.

---

- Do not edit `AGENTS.md` or `TASKS.md` without explicit permission.

---

- Prefer `pnpm exec tsx file.ts` (or `pnpm -C <pkg> exec tsx file.ts`) to run files directly. tsx is installed at the root of the repo, so is accessible via pnpm exec.

```sh
pnpm -C packages/foo exec tsx scripts/run.ts
```

---

- Follow DRY and SOLID principles; avoid code duplication and ensure single responsibility.

---

- When moving/renaming files, prefer `git mv` for moving files to preserve history. `mv` is acceptable if `git mv` is not available.

```sh
git mv src/old.ts src/new.ts
```

---

- Prefer changing file extension to `.txt` to preserve files marked for deletion.

---

- If files are large, consider splitting into smaller modules to improve readability and reduce lint noise.

---

- Prefer TypeScript path aliases (tsconfig `paths`) for internal imports when available; avoid overly deep relative imports. Update `tsconfig.json` if needed.

```ts
import { X } from '@ui/components/Button';
```

---

- Use `pnpm -C <package> lint:fix` to fix import order/formatting; ensure CI checks remain green.

---

- Add dependencies with `pnpm add` so `pnpm-lock.yaml` is updated and the latest version is pulled. If you are unfamiliar with the package's version, check its type declarations after adding it.

```sh
pnpm -C packages/foo add lodash
```

---

- Inspect type declarations for third-party packages before relying on them; prefer `import type` when appropriate.

---

- Check the closest `package.json` for available scripts; do not assume scripts that don't exist.

---

- When changing a package used by others, build it (`pnpm -C <pkg> build`) and run dependents' `tc` to verify integration before continuing.

```sh
pnpm -C packages/foo build
pnpm -C packages/bar tc
```

---

- Run `pnpm -C <package> test` for changed packages and dependents when appropriate.

---

- Use `rg` or `grep` to find usages across the repo quickly.

---

- Prefer function declarations for complex exported functions; allow concise arrow expressions and inline callbacks; avoid block-bodied exported arrows.

```ts
// Bad
export const compute = () => {
    /* large */
};

// Good
export function compute() {
    /* large */
}
```

---

- Respect `Note for Agent:` comments in files: read and honor instructions before continuing; remove notes when done. The user may add these notes mid-prompt as type errors or lint errors so they appear when you run checks.

```ts
type NoteForAgentAddedByTheUser = 'some note';
const x: NoteForAgentAddedByTheUser = 42; // This will cause a type error

// This will cause a lint error
('Note for Agent: some note');
```

---

- Only type cast when necessary; prefer type guards, utility types, or refactor to avoid casts.

```ts
// Bad
const v = x as unknown as T;

// Good
if (isT(x)) {
    const v = x;
}
```

---

- At the end of your response, always include a summary of changes made in the files.

---

- After linting/typechecking, the only acceptable result is 0 errors and 0 warnings. After running tests, 100% passing is the only acceptable result. This is not up for debate.

---

- You must not comment out tests or code to fix lint/typecheck errors. Always fix the underlying issue.

---

- You must not skip writing tests just because they are complex. Write whatever mocks or helpers are needed to write the test in a way that it mimics real usage as closely as possible.

---

- If absolutely needed, prefer to disable specific ESLint rules inline with comments rather than disabling them for the whole file or project. Always include a brief justification for the disable.

```ts
// eslint justification: reason for disable
// eslint-disable-next-line rule-name
const x = y as any;
```

---
