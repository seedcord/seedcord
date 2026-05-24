---
name: react19
description: Use this when writing React components in seedcord. Covers the React 19 APIs in use here — use() for context, ref as a plain prop, useTransition with async, useActionState, useOptimistic — and what's deprecated or removed. This is a client-only Vite SPA; server actions and RSC do not apply.
---

# React 19 — Seedcord Conventions

This repo runs **React 19.x.x** across all packages. It is a **client-only Vite SPA** — no server components, no RSC. State: Zustand (client) + TanStack Query (server).

**Form strategy:** Complex forms (checkout, auth) use `react-hook-form` + Zod for field-level validation and per-input error state. Simple one-action mutations ("set default address", "cancel order") should use `useTransition` with async or `useActionState` — the native React 19 pattern. Don't reach for react-hook-form when there's no validation to manage.

---

## Rule 1 — `use()` instead of `useContext()`

`use()` is React 19's unified primitive for reading context and promises. Unlike hooks, it can appear after early returns and inside conditionals.

```tsx
// Bad — useContext (deprecated pattern)
import { useContext } from 'react';
const theme = useContext(ThemeContext);

// Good — use()
import { use } from 'react';
const theme = use(ThemeContext);
```

**Conditional read (valid with `use()`, invalid with `useContext()`):**

```tsx
function Heading({ children }: { children?: React.ReactNode }) {
    if (!children) return null; // early return before use() — valid in React 19
    const theme = use(ThemeContext);
    return <h1 style={{ color: theme.color }}>{children}</h1>;
}
```

**Null-guard pattern** (used in Drawer and Modal):

```tsx
const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext(): DrawerContextValue {
    const ctx = use(DrawerContext);
    if (ctx === null) throw new Error('Must be used inside <Drawer>.');
    return ctx;
}
```

`use()` cannot be used inside `try/catch`. Wrap with an Error Boundary instead.

---

## Rule 2 — `ref` as a plain prop — no `forwardRef`

`forwardRef` is deprecated in React 19. Components accept `ref` directly as a prop.

```tsx
// Bad — forwardRef (deprecated)
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ placeholder }, ref) => (
    <input ref={ref} placeholder={placeholder} />
));

// Good — ref as a plain prop
interface InputProps {
    placeholder?: string;
    ref?: React.Ref<HTMLInputElement>;
}
function Input({ placeholder, ref }: InputProps) {
    return <input ref={ref} placeholder={placeholder} />;
}
```

When you need to forward a ref to multiple targets or call it manually, write a small `assignRef` helper that handles both callback refs and `RefObject` refs (see React 19's ref handling docs). If you need this in more than one app, lift it to a shared package rather than duplicating it.

**TypeScript rule:** ref callback implicit arrow returns are now type errors. Use a block body:

```tsx
// Bad — TypeScript error in React 19 types
<div ref={el => (instance = el)} />

// Good
<div ref={el => { instance = el; }} />
```

**`useRef` must always receive an argument:**

```tsx
// Bad — TypeScript error
const ref = useRef<HTMLDivElement>();

// Good
const ref = useRef<HTMLDivElement>(null);
```

---

## Rule 3 — Ref callback cleanup functions

React 19 ref callbacks can return a cleanup function, removing the need for a separate `useEffect`:

```tsx
<input
    ref={(el) => {
        if (!el) return;
        const observer = new ResizeObserver(handleResize);
        observer.observe(el);
        return () => observer.disconnect(); // called on unmount or ref change
    }}
/>
```

---

## Rule 4 — `useTransition` with async functions

`useTransition` now accepts async functions. `isPending` stays `true` for the full async duration, making it the standard way to track in-flight mutations without `useState(false)` + manual flag management.

```tsx
// Bad — manual pending state
const [isPending, setIsPending] = useState(false);
async function handleSubmit() {
    setIsPending(true);
    const err = await updateName(name);
    setIsPending(false);
    if (err) setError(err);
}

// Good — useTransition
const [isPending, startTransition] = useTransition();
function handleSubmit() {
    startTransition(async () => {
        const err = await updateName(name);
        if (err) setError(err);
    });
}
```

---

## Rule 5 — `useActionState` for form submissions

Use `useActionState` when a form action has state (errors, success messages, pending). It queues multiple submissions sequentially.

```tsx
import { useActionState } from 'react';

type State = { error: string | null };

const [state, dispatch, isPending] = useActionState<State, FormData>(
    async (prev, formData) => {
        const err = await submitForm(formData.get('email') as string);
        if (err) return { error: err };
        redirect('/dashboard');
        return { error: null };
    },
    { error: null }
);

return (
    <form action={dispatch}>
        <input name="email" type="email" />
        <button disabled={isPending}>Submit</button>
        {state.error && <p>{state.error}</p>}
    </form>
);
```

The form resets automatically on successful submission.

---

## Rule 6 — `useOptimistic` for immediate UI feedback

Wrap server mutations that should reflect immediately in the UI. React auto-reverts if the action fails.

```tsx
import { useOptimistic, useTransition } from 'react';

const [optimisticCount, setOptimisticCount] = useOptimistic(serverCount);
const [, startTransition] = useTransition();

function handleLike() {
    startTransition(async () => {
        setOptimisticCount((c) => c + 1); // immediate UI update
        await likePost(postId); // real mutation
    });
}
```

`setOptimistic` must be called inside `startTransition` or a form `action` — not in a plain event handler.

---

## Rule 7 — `<Context>` as provider (`<Context.Provider>` deprecated)

```tsx
// Old pattern — still works but deprecated
<ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>

// React 19 pattern — prefer for new code
<ThemeContext value="dark">{children}</ThemeContext>
```

Existing `<Context.Provider>` usages in the codebase don't need immediate migration, but use the new pattern when adding new context providers.

---

## Rule 8 — `use()` with Promises (Suspense integration)

`use()` also unwraps Promises, suspending the component until the Promise resolves. Create the Promise outside the component (not inside render):

```tsx
// Bad — Promise created inside component, re-created every render
function Comments() {
    const comments = use(fetchComments()); // new Promise every render
}

// Good — Promise created outside
const commentsPromise = fetchComments();

function Comments() {
    const comments = use(commentsPromise); // stable reference
    return comments.map((c) => <p key={c.id}>{c.text}</p>);
}

function Page() {
    return (
        <Suspense fallback={<p>Loading…</p>}>
            <Comments />
        </Suspense>
    );
}
```

---

## Rule 9 — Document metadata (no `react-helmet` needed)

React 19 hoists `<title>`, `<meta>`, and `<link>` to `<head>` automatically. Deduplicates by `name`/`rel`.

```tsx
function ProductPage({ product }: { product: Product }) {
    return (
        <article>
            <title>{product.name} — Seedcord</title>
            <meta name="description" content={product.subtitle} />
            <h1>{product.name}</h1>
        </article>
    );
}
```

---

## What's removed — don't use these

| Removed                               | Use instead                   |
| ------------------------------------- | ----------------------------- |
| `React.forwardRef()`                  | ref as plain prop             |
| `useContext()`                        | `use()`                       |
| `<Context.Provider>`                  | `<Context>`                   |
| `ReactDOM.render()`                   | `createRoot().render()`       |
| `ReactDOM.hydrate()`                  | `hydrateRoot()`               |
| `ReactDOM.findDOMNode()`              | `useRef`                      |
| `react-dom/test-utils` (`act`)        | `import { act } from 'react'` |
| `propTypes` on function components    | TypeScript                    |
| `defaultProps` on function components | ES6 default parameters        |
| String refs (`ref="input"`)           | `useRef` or callback ref      |

---

## React Compiler (recommended, not yet installed)

`eslint-plugin-react-compiler` is **not currently installed** in the seedcord apps. When it is added to `apps/{docs,guide,home}`, run it at warning level and treat its warnings as errors — they indicate components that won't benefit from automatic memoization.

Key rules the compiler enforces:

- No mutation of props or state during render
- Hooks called in consistent order (no conditional hooks)
- Stable identities for values used in deps arrays

Once the compiler is installed, **do not** add `useMemo` or `useCallback` manually unless the compiler flags a specific case — the compiler handles memoization automatically for compliant components. Until then, prefer simple, correctly-shaped components over scattering manual memo hooks "just in case."
