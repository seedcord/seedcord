---
name: Task Implementer
description: Implement a task from your planned tasks following the TASK_PLAN_TEMPLATE structure. Conducts research, asks clarifying questions via temp.md, then executes implementation with full test coverage and handoff documentation.
argument-hint: task=TASK-<number> allowBreaking?=<true|false>{default=false} info?=<additional info>
model: [GPT-5.4 (copilot), Claude Opus 4.6 (copilot), GPT-5.3-Codex (copilot)]
tools: ['agent', 'edit', 'read', 'search', 'todo', 'execute', 'web', 'context7/*']
---

# Implement Task from Your Planned Tasks

Arguments:

- `task=<TASK-number>` - (Optional) Specific task to implement (e.g., TASK-005). If not provided, you will pick from the master plan in the planned folder.
- `allowBreaking=<true|false>` - (Optional) Whether breaking changes are approved for this task. Default is false. If true, you must still document all breaking changes and update call sites consistently.
- `info=<additional info>` - (Optional) Any additional information relevant to the task implementation.

You are implementing a task from the Seedcord monorepo's planned work. Seedcord is a Discord bot framework (Discord.js + TypeScript) published as packages under `packages/` (core framework, CLI, services, utils, types, plugins, docs-engine, docs-generator). The repo also contains Next.js 16 + React 19 apps under `apps/` (`docs`, `guide`, `home`) and a React-based Ink CLI in `packages/cli`. Tasks are organized in `.vscode/planned/` and completed work is tracked in `.vscode/completed/`. This prompt guides a structured implementation workflow: research → clarify → implement → test → document.

## Prerequisites

**Before you start, understand these critical rules:**

1. Your tasks folder is at `.vscode/planned/` - tasks should be defined as MASTER_PLAN.md or individual TASK-XXX.md files
2. Your completed work gets archived to `.vscode/completed/[DATE]/` for future reference

Read these instruction files carefully:

- [AGENTS.md](../../AGENTS.md) - **MANDATORY** TypeScript/React engineering standards, code quality rules, testing requirements
- [TASK_PLAN_TEMPLATE.md](../../.vscode/templates/TASK_PLAN_TEMPLATE.md) - Task structure template
- Your `${input:name}/MASTER_PLAN.md` or individual task file - Task definitions and status

> Follow the `sleep-loop` skill for the user communication loop.
> Follow the `subagent-context-management` skill before any runSubagent calls.
> Follow the `code-commenting-guidelines` skill when judging whether implementation comments are missing or excessive.

## Workflow

### Phase 1: Research & Clarification (No Implementation Yet)

**Step 1: Gather Context**

Read and analyze:

1. The MASTER_PLAN.md to understand what task you're implementing and its dependencies
2. Any related TASK-XXX.md files from previous handoffs to understand history
3. The codebase areas you'll be modifying:
    - `packages/<pkg>/src/` - Package TypeScript source (framework / CLI / services / utils / types / plugins / docs-engine / docs-generator)
    - `apps/<app>/src/` - Next.js 16 + React 19 app code (components, hooks, utilities) for `docs`, `guide`, `home`
    - `packages/<pkg>/tests/` - Package unit tests (Vitest)
    - `apps/<app>/tests/` - App component tests (Vitest + Testing Library) — when present
    - `src/` - Shared utilities or root-level code if applicable
4. AGENTS.md sections relevant to your task (TypeScript standards, import patterns, testing strategy)

**Step 2: Identify Ambiguities**

Create `.vscode/temp.md` with questions in this format:

```markdown
# Implementation Questions - TASK-XXX

## Clarification Needed

**Q1: [Your question about requirements/scope]**

- [Option A]
- [Option B]
- Other: \_\_\_

**Q2: [Another question]**

- [Option A]
- [Option B]

**Q3: [Third question if needed]**

- [Specific detail needed]

## Context Gathered

- [Summary of what you understood so far]
- [Potential blockers or ambiguities]
```

**Step 3: Wait for Answers**

1. Sleep for 10 seconds in the terminal to allow user time to edit `temp.md`
2. Read the updated `temp.md` file
3. If you have follow-up questions, **APPEND** to `temp.md` (don't overwrite)
4. Repeat sleep + read until you have no more questions OR user tells you to START IMPLEMENTING

**Important:** Do NOT start implementation until all ambiguities are resolved.

### Phase 2: Implementation

Once questions are answered:

1. **Execute implementation** - Follow AGENTS.md guidelines strictly:
    - Prefer object-oriented design for complex domain logic; plain functions for utilities
    - Use `import type` for type-only imports
    - Avoid `any` in production code; prefer `unknown` or concrete types
    - Minimize explicit casts; prefer type guards or narrowing
    - For React: Use functional components, custom hooks, proper state management
    - Run `pnpm -C <package> lint:fix && pnpm -C <package> tc` after every change
2. **Test as you go** - Run Vitest tests frequently to validate changes
3. **Handle breaking changes** - Update all call sites consistently. Let the user know there are breaking changes in handoff notes.

Note: Make use of the #tool:agent/runSubagent tool (if needed for looking through a LOT of context. Should be used sparingly.) for researching the codebase, or whatever other tasks you see fit.

### Phase 3: Handoff Documentation

After completing implementation:

1. **Add handoff notes** to MASTER_PLAN.md's corresponding task section:

    ```
    Completed by: [Your name/model]
    Build status: ✅ PASS (or status)

    ### What was done:
    - [Change 1 with impact]
    - [Change 2]

    ### Tests passing: ✅ All ([X] tests)

    ### Warnings to next implementor:
    - [Important note]

    ### Breaking changes:
    - [None, or list migration path]

    Any other critical information for the next person working in this area.
    ```

2. **Update task status table** - Mark task as ✅ Completed

3. **Update related TODOs** - If task unlocks other work, note it

## Important Guidelines

Must follow AGENTS.md rules.

### TypeScript/React Best Practices

**Component Development:**

- Use functional components with proper TypeScript types
- Extract complex logic into custom hooks
- Avoid inline objects/functions in JSX props (define outside render for stable references)
- Use proper state management (useState, useReducer, or external state libraries)

**Code Quality:**

- Run `pnpm -C packages/<pkg> lint:fix && pnpm -C packages/<pkg> tc` for package changes
- Run `pnpm -C apps/<app> lint:fix && pnpm -C apps/<app> tc` for app (frontend) changes
- Never use `any` - prefer `unknown` and narrow types properly
- Prefer `import type` for type-only imports
- Use TypeScript path aliases where configured

**Testing:**

- Write Vitest tests for all new functionality
- Use Testing Library for React component tests
- Mock external dependencies appropriately
- Aim for meaningful test coverage, not just 100% line coverage
- Tests must pass 100% before task completion

### Breaking Changes

⚠️ **User has approved breaking changes (100% greenlit).** If your task requires breaking APIs:

- Update all call sites in same task
- Document migration path clearly in handoff notes
- Ensure build passes green before declaring task complete

### Commit Message Format

After handoff, provide a message like:

```
chore: Complete TASK-XXX - [Brief title]

- [Change 1 with impact]
- [Change 2]
- [Change 3]

Tests: [X] passing, [Y] new tests added
```

## Example Workflow

**User asks:** "Work on TASK-005" (or `/implementTask eyan` to see eyan's planned tasks, or `/implementTask eyan task=TASK-005` to start that specific task)

**Agent actions:**

1. Read your MASTER_PLAN.md → Find TASK-005 definition in `.vscode/planned/`
2. Read previous handoff notes → Understand context from `.vscode/completed/`
3. Research affected code areas (grep, semantic search)
4. Create/update `.vscode/temp.md` with clarifying questions
5. Sleep 10 seconds
6. Read `temp.md` with answers
7. Ask follow-ups if needed (append to temp.md, don't overwrite)
8. Once clear, implement with lint/typecheck/tests passing at each step:
    - Run `pnpm -C packages/<pkg> lint:fix && pnpm -C packages/<pkg> tc` for packages
    - Run `pnpm -C apps/<app> lint:fix && pnpm -C apps/<app> tc` for apps
    - Run `pnpm -C <package> test` for test validation
9. Update your MASTER_PLAN.md handoff section
10. Provide commit message with task details

## Files You'll Interact With

**Read (don't modify):**

- `.vscode/planned/MASTER_PLAN.md` - Your task definitions and status
- `AGENTS.md` - Engineering rules (at repo root)
- `.vscode/templates/TASK_PLAN_TEMPLATE.md` - Task template

**Create/Modify:**

- `.vscode/temp.md` - For clarifying questions (append new Qs, don't overwrite)
- `packages/<pkg>/src/**/*.ts` - Package implementation code
- `apps/<app>/src/**/*.tsx` or `**/*.ts` - React/Next.js components, hooks, utilities
- `packages/<pkg>/tests/**/*.test.ts` - Package unit tests (Vitest)
- `apps/<app>/tests/**/*.test.tsx` - App component tests (Vitest) — when present
- `.vscode/completed/[DATE]/MASTER_PLAN.md` - Update handoff sections when done

## Quick Checklist Before You Start

- [ ] You have read AGENTS.md thoroughly
- [ ] You understand the project structure (packages/*/src, apps/*/src, packages/*/tests)
- [ ] You identified all ambiguities and created temp.md with questions
- [ ] You waited for and received answers (or user said "START IMPLEMENTING")
- [ ] If you want to implement a specific task, provide it via `task=TASK-XXX` (optional)
- [ ] You understand breaking changes are approved (100% greenlit)
- [ ] You are ready to implement with full test coverage and zero ambiguity
- [ ] You will run lint:fix and tc after every change before running tests

---

**Next action:** Read the MASTER_PLAN to understand what TASK you're implementing. Create `.vscode/temp.md` with any clarifying questions. Do NOT implement until all questions are answered.
