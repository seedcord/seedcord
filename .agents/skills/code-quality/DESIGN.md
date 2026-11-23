---
name: design
description: Use this before writing a fix, a feature, or a refactor in seedcord, and when a review asks whether a change is a patch. Covers finding the root cause, when repeated fixes mean the design is wrong, letting data carry the difference between two paths, one source of truth, types that can't hold a bad state, and writing the smallest version first.
---

# Design rules

These decide the shape of a change before any code exists. Most review rounds that run long trace back to one of them.

---

## 1. Fix the line that writes the bad value

A bug shows up in the code that reads a value. It starts in the code that writes it. Before proposing a fix, answer these four and put the answers in the message:

1. Which line writes the bad value? Give its `file:line`.
2. Which code reads that value? List every reader.
3. Why does the writer produce a value that the readers don't expect? That mismatch is the root cause. The reader someone reported is only where it showed up.
4. Would a reader written tomorrow break the same way? If yes, the fix is a patch. Make the wrong use fail to compile or fail lint, or delete the second way of writing the value.

A helper that converts the value at each reader is a patch, even when one function does all the converting. It turns into the root fix only once the type system forces every reader through it.

When a fix turns out to be a patch, say so in the same message and list the root-cause options.

## 2. A second fix to the same spot could mean the shape is wrong

The first fix to a spot is a bug fix. When the same spot needs another fix in the same piece of work, however that problem came up, stop and look at the code around it before patching again. Two unrelated bugs can sit close together. When both fixes give one member a behavior that its neighbors already get, the structure is the problem.

Before adding a flag, a field, or a branch so one member gets a behavior, check whether its neighbors already get it from the code around them. A timeout, an ordering, error reporting, a log line, and a cache key are all common cases. If they do, move the odd member into that structure as one more entry, case, or handler, and delete its special path.

## 3. Ask the question once and let data carry the answer

Two paths that differ in a few details share one shape. Build that shape once and put the differences in values.

```ts
// Bad: every function asks which transport this is
function timeout(kind: Transport) {
    return kind === 'http' ? 3_000 : 15_000;
}
function label(kind: Transport) {
    return kind === 'http' ? 'interactions' : 'gateway';
}

// Good: one table holds the answer for each transport
const TRANSPORTS = {
    http: { timeoutMs: 3_000, label: 'interactions' },
    gateway: { timeoutMs: 15_000, label: 'gateway' }
} satisfies Record<Transport, TransportInfo>;
```

The tell is one question asked in more than one place. Common shapes are a flag checked in several functions, two helpers that each pick half of one decision, and a parameter that only one caller passes. Each one means the code checks too far down. Move it up to where the answer is known.

Keep a branch when the two paths do different work. Data holds values. A check that runs on one path only is behavior, so keep it in code.

## 4. One source of truth

A rule, a value, a path, or a decision gets computed in one place, and every reader calls that place. Two copies of one rule are a bug to fix in the same change, and so is a free function left beside the class that replaced it. [AGENTS.md](../../../AGENTS.md#other-important-rules) covers the case where two copies can't share code.

## 5. Pick a shape that can't hold the wrong state

Choose a data structure that can't hold the bad state. A discriminated union beats two optional fields that must be set together. A `Map` keyed by id beats an array that the code searches by id. [TYPESCRIPT.md](./TYPESCRIPT.md) has the type-level tools.

Adding one more optional field each time a case comes up is the common way to get this wrong. Every optional field doubles the states that the type allows, and most of those states never happen. Each reader then guards against them with `?.` and `??`. When a type keeps growing optional fields, write out the cases that really exist and make each one a member of a union. [FAIL-FAST-RULES.md](./FAIL-FAST-RULES.md) covers when a `?.` is right.

```ts
// Bad: sixteen combinations, and most of them are nonsense
interface Reply {
    content?: string;
    embeds?: Embed[];
    deferred?: boolean;
    ephemeral?: boolean;
}

// Good: the two replies that exist
type Reply = { kind: 'deferred'; ephemeral: boolean } | { kind: 'message'; content: string; embeds: Embed[] };
```

When several functions read or change the same state, put them in a class with it. Free functions that all take the same arguments mean that class is missing. [OOP.md](./OOP.md) covers when a class fits.

## 6. Use the language before building a mechanism

The repo targets a recent Node and TypeScript, and both ship features for problems people still solve by hand. Before writing a mechanism, describe the problem in one plain sentence and search the language and runtime docs for a feature built for it. Then check how the repo already uses that feature and match it.

Pick a feature because it fits the problem in front of you. Using one because another file does turns it into a habit, and a habit fits some places badly. [AGENTS.md](../../../AGENTS.md#other-important-rules) covers checking that every runtime that the code reaches has the feature.

## 7. Smallest version first

Write the smallest version that does the task, run it, and read the diff before adding anything. Add a helper, a guard, a flag, an option, or a config entry only when a run fails without it or someone asked for it.

Before handing over, read each block you added and say which part of the task needs it. Delete each block that the task doesn't need. A small task that grew a large diff is a reason to cut.

The goal is the simplest code that does the whole job, with every feature and the same speed. It solves only the problems that the repo has today.

## 8. Fix the machinery once

When something doesn't work, put the fix in the framework or the tool. An answer like "the author just has to write it this way" moves the cost onto every future caller, forever, to save writing the fix once. Price the real fix and build it.

An escape hatch is fine only when the real mechanism can't be built. Say what proves that before using one. A private script with one caller won't get more callers, so the plain call is the fix there.
