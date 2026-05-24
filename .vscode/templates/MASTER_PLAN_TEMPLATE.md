# Master Implementation Plan

**Project:** [Project Name / Branch Name]

**Date Created:** [Date]

---

## 🎉 PROJECT COMPLETION SUMMARY

**Status:** 🔄 **IN PROGRESS** ([Date])

**Overview of all tasks:**

| Phase | Task        | Status | Build | Tests |
| ----- | ----------- | ------ | ----- | ----- |
| [#]   | [Task Name] | 🔄     | ❓    | ❓    |
| [#]   | [Task Name] | ⏳     | ❌    | ❓    |

**Current Verification ([Date]):**

- 🔄 Build (`pnpm build`): [Status]
- 🔄 Typecheck (`pnpm tc`): [Status]
- 🔄 Lint (`pnpm lint:fix`): [Status]
- 🔄 Tests (`pnpm test`): [X/Y passing]
- 🔄 prePush (`pnpm prePush`): [Status]

**Deliverables:**

- [Primary deliverable 1]
- [Primary deliverable 2]
- [Primary deliverable 3]

---

## Table of Contents

1. [Implementation Order](#implementation-order)
2. [Dependency Graph](#dependency-graph)
3. [Task Status Tracker](#task-status-tracker)
4. [Phase Summaries](#phase-summaries)
5. [Handoff Notes](#handoff-notes)
6. [Critical Dependencies](#critical-dependencies)

---

## Code Sample Policy

⚠️ **CRITICAL: All code samples in task files are SUGGESTIONS ONLY**

**How to use task file code samples:**

- **DO** use code samples as reference implementations and design guidance
- **DO** adapt patterns and structure to fit the actual codebase context
- **DO** follow established project conventions over sample code style
- **DO** write code based on actual requirements as you work through each phase
- **DO NOT** copy-paste code samples verbatim without understanding context
- **DO NOT** treat samples as final implementations that must be used exactly

**Why samples are suggestions:**

1. **Context Changes**: Actual codebase may have evolved since task was written
2. **Dependencies Differ**: Real dependencies / catalog versions may not match sample assumptions
3. **Style Varies**: Project conventions (AGENTS.md) take precedence over sample formatting
4. **Iteration Required**: Implementation often reveals better approaches than initial design
5. **Integration Reality**: Real integration points may differ from design-time assumptions

**Best Practice:**

1. Read the task file thoroughly to understand **what** needs to be done and **why**
2. Review code samples to understand the **pattern** and **approach**
3. Examine the actual codebase to find similar existing patterns
4. Write new code that follows existing patterns while meeting task requirements
5. Adapt sample code concepts to match reality, don't force reality to match samples

---

## Implementation Order

### Rationale

**Why this order?**

---

## Phase [#]: [Phase Name]

### [#️⃣] TODO [#]: [Task Name]

**Why [this position]:**

- [Reason 1]
- [Reason 2]
- [Reason 3]

**Scope:**

- [Change 1]
- [Change 2]
- [~X files affected]

**Touches published packages:** [Yes — list / No]

**Success Criteria:**

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

### [#️⃣] TODO [#]: [Task Name]

**Why [this position]:**

- [Reason 1]
- [Reason 2]

**Scope:**

- [Change 1]
- [Change 2]
- [~X files affected]

**Success Criteria:**

- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Dependency Graph

**OPTIONAL** - Include if multiple tasks have complex dependencies

```
┌─────────────────────────────┐
│  TODO [#]: [Task Name]      │  ⬅️ START HERE
└─────────────────────────────┘
           │
           ├─────────┬─────────┐
           ▼         ▼         ▼
    ┌───────────┐ ┌───────┐ ┌────────┐
    │ TODO [#]  │ │TODO[#]│ │TODO[#] │
    │ [Task]    │ │[Task] │ │[Task]  │
    │ (time)    │ │(time) │ │(time)  │
    └───────────┘ └───────┘ └────────┘
```

---

## Task Status Tracker

**Update this table as each task is completed. Append notes below each completed task.**

| Phase | TODO | Title       | Status         | Notes                                     |
| ----- | ---- | ----------- | -------------- | ----------------------------------------- |
| [#]   | [#]  | [Task Name] | ⏳ Not Started | See [TODO [#] Handoff](#todo-[#]-handoff) |
| [#]   | [#]  | [Task Name] | 🔄 In Progress | See [TODO [#] Handoff](#todo-[#]-handoff) |

**Status Legend:**

- 🔄 In Progress
- ⏳ Blocked / Waiting
- ✅ Completed
- ❌ Failed / Needs Rework

---

## Phase Summaries

### Phase [#]: [Phase Name]

**Phase Goal:** [Overall purpose]

**What gets built:**

- [System/feature 1]
- [System/feature 2]
- [System/feature 3]

**What gets deleted:**

- [Old file/system 1]
- [Old file/system 2]

**What stays the same:**

- [Important: what doesn't change]

**Impact:** [How does this improve the codebase?]

---

### Phase [#]: [Phase Name]

**Phase Goal:** [Overall purpose]

**What gets built:**

- [System/feature 1]

**What gets deleted:**

- [Old file/system 1]

**Impact:** [How does this improve the codebase?]

---

## Handoff Notes

**Instructions for implementors:** After completing a TODO, update this section with blockers, decisions, and important information for the next person/agent.

### TODO [#] Handoff (This exact placeholder format should be copied for each TODO)

**Status:** 🔄 In Progress (or ✅ Completed)

**Prerequisites met:**

- [x] Prerequisite 1
- [x] Prerequisite 2

```
Completed by: [Name/AI Model]
Build status: ✅ Passing (or 🔄 In Progress)

### What was done:
- [Change 1 with impact]
- [Change 2 with impact]

### Blockers encountered:
- [Blocker 1 and resolution]
- [Or: None]

### Breaking changes:
- [Breaking change 1 - migration path]

### Files modified count: [X]
### Files created count: [X]
### Files deleted count: [X]

### Key decisions made:
- [Design decision 1 - rationale]

### Tests passing: ✅ All ([X] tests)

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

### TODO [#] Handoff

**Status:** ⏳ Not Started (or 🔄 In Progress / ✅ Completed)

**Prerequisites from TODO [#]:**

- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

```
[When completed, fill in like above example]
```

---

## Critical Dependencies

⚠️ **DO NOT SKIP OR REORDER - These must be sequential:**

| Violation                          | Consequence                          |
| ---------------------------------- | ------------------------------------ |
| Implement TODO [X] before TODO [Y] | [System Z would be broken - explain] |
| [Violation 2]                      | [Consequence]                        |

---

## Parallel Work (OPTIONAL)

You may parallelize these to save time:

**During TODO [X]:** [Task that can happen in parallel]
**During TODO [Y]:** [Task that can happen in parallel]

---

## How to Update This Document

**After completing each task:**

1. Update the status table (Status column)
2. Fill in the handoff section for that TODO
3. Update the next task's prerequisites if any changed
4. Add a changeset (`pnpm cs`) if a published package was touched
5. Commit with a conventional message that references the TODO

**Example commit message:**

```
feat(<pkg>): Complete TODO [#] - [Task Name]

- [What was done 1]
- [What was done 2]
- All tests passing
- Handoff notes added for TODO [Next]
```

---

## Summary

**Key Principle:** [Guiding principle of the implementation order]

Begin with [TODO [#]: Task Name] when ready. See [TASK_PLAN_TEMPLATE.md](./TASK_PLAN_TEMPLATE.md) for individual task details.
