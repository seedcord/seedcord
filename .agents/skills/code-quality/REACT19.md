---
name: react19
description: Use this when writing React components in seedcord. Covers the React 19 APIs in use here, including use() for context, ref as a plain prop, useTransition with async, useActionState, and useOptimistic, plus what's deprecated or removed.
---

# React 19: Seedcord Conventions

The three sites in `apps/` run **Next.js 16 and React 19**. A component is a server component until its file opens with `'use client'`. `apps/docs` keeps client state in Zustand. The CLI's Ink components use the same React.

---

## Rule 1: `use()` over `useContext()`

`use()` reads context and promises. It can run after an early return and inside a condition, which no hook can do. `useContext` still works in React 19, but new code uses `use()`.

```tsx
// Avoid in new code
import { useContext } from 'react';
const theme = useContext(ThemeContext);

// Good: use()
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

**Null-guard pattern** for a context that only exists inside its provider:

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

## Rule 2: `ref` as a plain prop, no `forwardRef`

React 19 passes `ref` to a function component as a normal prop, so `forwardRef` isn't needed. React plans to deprecate it in a later version.

```tsx
// Bad: forwardRef
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ placeholder }, ref) => (
    <input ref={ref} placeholder={placeholder} />
));

// Good: ref as a plain prop
interface InputProps {
    placeholder?: string;
    ref?: React.Ref<HTMLInputElement>;
}
function Input({ placeholder, ref }: InputProps) {
    return <input ref={ref} placeholder={placeholder} />;
}
```

When you need to forward a ref to multiple targets or call it manually, write a small `assignRef` helper that handles both callback refs and `RefObject` refs (see React 19's ref handling docs). If you need this in more than one app, lift it to a shared package to avoid duplicating it.

**TypeScript rule:** ref callback implicit arrow returns are now type errors. Use a block body:

```tsx
// Bad: TypeScript error in React 19 types
<div ref={el => (instance = el)} />

// Good
<div ref={el => { instance = el; }} />
```

**`useRef` must always receive an argument:**

```tsx
// Bad: TypeScript error
const ref = useRef<HTMLDivElement>();

// Good
const ref = useRef<HTMLDivElement>(null);
```

---

## Rule 3: Ref callback cleanup functions

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

## Rule 4: `useTransition` with async functions

`useTransition` now accepts async functions. `isPending` is `true` for the full async duration, making it the standard way to track in-flight mutations without `useState(false)` + manual flag management.

```tsx
// Bad: manual pending state
const [isPending, setIsPending] = useState(false);
async function handleSubmit() {
    setIsPending(true);
    const err = await updateName(name);
    setIsPending(false);
    if (err) setError(err);
}

// Good: useTransition
const [isPending, startTransition] = useTransition();
function handleSubmit() {
    startTransition(async () => {
        const err = await updateName(name);
        if (err) setError(err);
    });
}
```

---

## Rule 5: `useActionState` for form submissions

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

## Rule 6: `useOptimistic` for immediate UI feedback

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

`setOptimistic` must be called inside `startTransition` or a form `action`. Don't call it in a plain event handler.

---

## Rule 7: `<Context>` as provider

```tsx
// Old form, still supported. React plans to deprecate it
<ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>

// React 19 form, for new code
<ThemeContext value="dark">{children}</ThemeContext>
```

A new provider uses `<Context>`. The existing `<Context.Provider>` in `tooling/ui/src/SearchDialog.tsx` can move over the next time someone edits that file.

---

## Rule 8: `use()` with Promises (Suspense integration)

`use()` also unwraps Promises, suspending the component until the Promise resolves. Create the Promise outside the component (not inside render):

```tsx
// Bad: Promise created inside component, re-created every render
function Comments() {
    const comments = use(fetchComments()); // new Promise every render
}

// Good: Promise created outside
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

## Rule 9: Document metadata (no `react-helmet` needed)

React 19 hoists `<title>`, `<meta>`, and `<link>` to `<head>` automatically. Deduplicates by `name`/`rel`.

```tsx
function ProductPage({ product }: { product: Product }) {
    return (
        <article>
            <title>{product.name} | Seedcord</title>
            <meta name="description" content={product.subtitle} />
            <h1>{product.name}</h1>
        </article>
    );
}
```

---

## Removed in React 19

<!--prettier-ignore-start-->

| Removed | Use instead |
| --- | --- |
| `ReactDOM.render()` | `createRoot().render()` |
| `ReactDOM.hydrate()` | `hydrateRoot()` |
| `ReactDOM.findDOMNode()` | `useRef` |
| `react-dom/test-utils` (`act`) | `import { act } from 'react'` |
| `propTypes` on function components | TypeScript |
| `defaultProps` on function components | default parameters |
| String refs (`ref="input"`) | `useRef` or a callback ref |

<!--prettier-ignore-end-->

`forwardRef`, `useContext`, and `<Context.Provider>` still work. Rules 1, 2, and 7 cover what new code uses in their place.

---

## Catch these in review

`vp run react-doctor` reports index keys, `.filter().map()` chains, `includes()` inside a loop, independent awaits in sequence, and related `useState` calls that belong in a `useReducer`. Fix what it reports. Read for the ones below yourself.

**Mutable values in effect deps.** `location.pathname`, `ref.current`, and other mutable globals in a `useEffect` deps array don't trigger a render when they change, so the effect doesn't re-run. Depend on the stable object and read the field inside, or read it inside the effect without listing it as a dep.

```tsx
// Bad
useEffect(() => {
    doSomething();
}, [location.pathname]);

// Good
useEffect(() => {
    doSomething(location.pathname);
}, [location]);
```

**Hydration mismatches.** `new Date()`, `Math.random()`, `window.*`, or any other client-only value in JSX renders one value on the server and another on the client, and hydration throws. Set it in an effect.

```tsx
// Bad
<p>{new Date().toLocaleDateString()}</p>;

// Good
const [now, setNow] = useState<Date | null>(null);
useEffect(() => {
    setNow(new Date());
}, []);
<p>{now?.toLocaleDateString() ?? ''}</p>;
```

**`useState(prop)` that must follow the prop.** The state keeps the first value it got. Remount with a `key` derived from the prop, or read the prop directly.

**An `await` before a synchronous guard.** When the guard doesn't use the awaited value, return first and await after.

**Barrel imports inside one app.** Import from the module file, like `'../store/useAuthStore'`. A barrel one folder away makes the bundler and HMR load every file it re-exports.

**Components past about 200 lines.** Split out focused children. The parent holds the state, effects, and layout, and each child renders one part.

---

## React Compiler

The apps don't run the React Compiler, so nothing memoizes for you. Add a `useMemo` or `useCallback` when a render is measurably slow or a dependency needs a stable identity.
