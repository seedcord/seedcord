# TODO [#]: [Task Name]

(Note: File name should be TASK-[TODO_NUMBER]-[TASK_NAME].md)

## Overview

[1-2 sentences explaining what this TODO does]

## Goals

1. **[Goal 1 Title]**: [1-2 sentence explanation]
2. **[Goal 2 Title]**: [1-2 sentence explanation]
3. **[Goal 3 Title]**: [1-2 sentence explanation]

---

## Reasoning

### Why [Goal 1]?

**Current Problems:**

- [Problem 1]
- [Problem 2]
- [Problem 3]

**Solution:**

- [Solution approach 1]
- [Solution approach 2]

### Why [Goal 2]?

**Current Problems:**

- [Problem 1]

**Solution:**

- [Solution approach]

---

## Files to Change

### Files to DELETE Entirely

1. `packages/<pkg>/src/path/file.ts`
2. `apps/<app>/src/path/file.tsx`

### Files to MOVE (OPTIONAL)

Move from [old location] to [new location]:

1. `packages/<pkg>/src/old.ts` → `packages/<pkg>/src/new.ts`
2. `apps/<app>/src/components/Old.tsx` → `apps/<app>/src/components/New.tsx`

### Files to MODIFY

#### [Category 1: e.g., "Core Framework Surface"]

1. `packages/seedcord/src/Seedcord.ts` - **MAJOR** - [what changes]
2. `packages/seedcord/src/index.ts` - **MINOR** - [what changes, e.g., add export]

#### [Category 2: e.g., "Tests"]

1. `packages/seedcord/tests/foo.test.ts` - **MAJOR** - [what changes]
2. `packages/services/tests/logger/logger.test.ts` - **MINOR** - [what changes]

#### [Category 3: e.g., "App Wiring"]

1. `apps/docs/src/lib/docs/engine.ts` - **MAJOR** - [what changes]

---

## Implementation Approach

### [Component/Feature 1]

**Purpose:** [What does this do]

**Key Responsibilities:**

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

**Integration Points:**

- [Where it connects — e.g., consumed by `@seedcord/cli` for the dev server]
- [What it depends on — e.g., `@seedcord/services` `Logger`]

**Considerations:**

- [Important design note 1]
- [Important design note 2]

---

### [Component/Feature 2]

**Purpose:** [What does this do]

**Key Responsibilities:**

- [Responsibility 1]
- [Responsibility 2]

**Integration Points:**

- [Where it connects to other systems]

**Considerations:**

- [Important design note]

---

## Acceptance Criteria

### Functional Requirements

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Code Quality

- [ ] `pnpm -C <pkg> lint:fix` — 0 errors, 0 warnings
- [ ] `pnpm -C <pkg> tc` — 0 errors
- [ ] `pnpm -C <pkg> test` — 100% passing
- [ ] `pnpm prePush` (if cross-cutting) — clean

### Publishing (if a published package is touched)

- [ ] `changeset` added via `pnpm cs`
- [ ] Bump level (patch / minor / major) matches the actual surface change

---

## Testing Requirements

### Unit Tests (Vitest)

1. **[Test Suite 1]**
    - [Test case 1]
    - [Test case 2]

2. **[Test Suite 2]**
    - [Test case 1]
    - [Test case 2]

### Integration Tests (OPTIONAL)

1. [Integration test 1 — e.g., wire through `mock/` to exercise a real Discord-flavored flow]
2. [Integration test 2]

---

## Migration Notes (OPTIONAL — required if behavior changes for consumers)

### For seedcord users (downstream)

1. [Step 1]
2. [Step 2]
3. [Search/replace strategy if applicable]

### For internal call sites

1. [Step 1]
2. [Step 2]

---

## Pseudocode Examples (OPTIONAL)

**IMPORTANT: Use pseudocode or high-level sketches. Do NOT write complete, production-ready TypeScript here. Small, focused snippets are preferred to illustrate critical logic or APIs, but must not include full class implementations, detailed error handling, or every overload. Keep examples brief and limited to the essential flow.**

### Example 1: [Algorithm or Data Flow]

```
[Brief description of what this shows]

function doThing(input)
  - step 1: validate or prepare
  - step 2: execute main logic
  - step 3: return or notify result
```

### Example 2: [Another Algorithm or Pattern]

```
[Brief description]

class HighLevelConcept
  property1: type1
  property2: type2

  method1(param): returnType
    - do thing
    - return result
```

**DO NOT include:**

- ❌ Full TS class implementations
- ❌ Complete method bodies
- ❌ Production-ready code

**DO include:**

- ✅ Algorithm flow
- ✅ Data structure descriptions
- ✅ Pseudocode outlines
- ✅ High-level patterns

---

## Risks and Mitigation (OPTIONAL)

| Risk     | Mitigation        |
| -------- | ----------------- |
| [Risk 1] | [How to mitigate] |
| [Risk 2] | [How to mitigate] |

---

## Related TODOs / GitHub Issues

- **TODO [X]**: [Dependency type] - [Brief description]
- **#[issue]**: [Linked GitHub issue if any]

---

## Handoff Template (OPTIONAL - Fill in after completion)

**Status:** ✅ Completed (or 🔄 In Progress)

```
Completed by: [Name/AI Model]
Build status: ✅ Passing (or appropriate status)

### What was done:
- [Change 1 with impact]
- [Change 2 with impact]
- [Change 3 with impact]

### Blockers encountered:
- [Blocker 1 and resolution]
- [Or: None]

### Breaking changes:
- [Breaking change 1 - migration path]
- [Or: None]

### Files modified count: [X]
### Files created count: [X]
### Files deleted count: [X]

### Key decisions made:
- [Design decision 1 - rationale]
- [Design decision 2 - rationale]

### Tests passing: ✅ All ([X] tests)

### Verification performed:
- pnpm -C <pkg> lint:fix && tc && test → ✅
- pnpm prePush (if cross-cutting) → ✅
- Manual smoke (e.g., `pnpm docs:smoke`, `mock/` bot run) → ✅

### Changeset added:
- [.changeset/<slug>.md — patch/minor/major against <pkgs>]
- [Or: N/A, no published-package change]

### Warnings to next implementor (TODO [next]):
- [Important warning 1]

### Information for TODO [next] implementor:
- [API change needed]
- [File location change]
- [Updated terminology]

### Critical notes:
- [Any critical information for handoff]
```

---

## Notes

- **Complexity:** [Low / Medium / High]
- **Files Affected:** [~X files]
- **Touches published packages:** [Yes / No — if yes, changeset required]
