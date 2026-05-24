---
name: subagent-context-management
description: Use this skill when delegating work to sub-agents (runSubagent) in the Seedcord project. Defines what sub-agents should and should not return to avoid context overflow, how to pick the right model, and when sub-agents are worth the overhead. Apply this before every runSubagent call.
---

# Sub-Agent Context Management

Add it as a new section at the top of the skill body, right after the frontmatter and before "⚠️ The Core Rule":

---

## Language Protocol

**All communication between orchestrator and sub-agents must be terse, instruction-dense English.**

### Rules

- No preamble, no pleasantries, no restating the task
- Omit filler: articles, conjunctions, and transitional phrases where meaning is unambiguous
- Lead with the verb
- Specify exactly what to return — format, fields, nothing extra

## ⚠️ The Core Rule

**Sub-agents must return summaries, not dumps.**

Context overflow silently degrades output quality. The model starts forgetting earlier instructions. Requesting full file contents is the most common cause.

## What sub-agents MUST return

✅ Specific line ranges with direct relevance to your task (not entire files)
✅ API signatures and interface declarations (not full implementations)
✅ File paths + class names for dependency lists (not the classes themselves)
✅ Violation summaries with `file:line` references (not surrounding code)
✅ Targeted snippets: 5–15 lines max per finding
✅ Flow descriptions in plain text (not code reconstructions)

## What sub-agents must NEVER return

❌ Full file contents
❌ Entire class implementations
❌ Large code blocks copy-pasted for "context"
❌ "All code related to X"
❌ Anything that could be replaced with a file path + one-sentence description

## Example prompts

**❌ BAD — will overflow context:**

```
"Find all code related to minion spawning and return it"
"Scan Assets/Scripts and return their contents for audit"
```

**✅ GOOD — targeted research:**

```
"Research minion spawning for TASK-005. Return:
1. Classes involved in spawning (names + file paths only)
2. Public API of MinionSpawner (signatures only, no implementations)
3. Where spawn timing is controlled (file:line + 3 lines of context)
4. Integration points with the wave system (brief description)
5. Existing test file paths + test names only

DO NOT return full implementations."
```

```
"Search Assets/Scripts for AGENTS.md Section 3 violations. Return:
1. Files with per-frame allocations (paths only)
2. Each violation: file:line + 3 lines of context
3. Violation count by severity (HIGH/MEDIUM/LOW)
4. Most common violation types (summary only)

DO NOT return full file contents."
```

## When to use sub-agents

✅ Auditing or exploring > 20 files
✅ Tracing a pattern or dependency across a large codebase
✅ Task touches > 10 files and you need integration point mapping
✅ Architecture is unfamiliar and requires exploration before implementation
✅ Need to find all call sites of a method across the full project

## When NOT to use sub-agents

❌ < 10 files (read them yourself — the overhead isn't worth it)
❌ You already know which files are affected
❌ Task plan includes specific file references
❌ Simple implementation following an existing, understood pattern
❌ You're doing detailed analysis of violations you've already found

## ⚠️ Parallel Agents and File Conflicts

**Parallel agents that write to overlapping files WILL clobber each other.**

When two agents run simultaneously without isolation:

- Agent B reads a file, Agent A writes it, Agent B writes its (stale) version → A's changes are lost
- No error is thrown — the last writer wins silently

### Rule: Always use worktrees for parallel write agents

Before spawning two or more agents that will write code:

1. **Check for overlap**: If their file sets share even one file (including test helpers, shared services, package.json), use isolated worktrees.
2. **Use `isolation: "worktree"` on the Agent tool call**: This gives each agent its own branch/directory; the orchestrator merges results after both finish.
3. **Read-only agents** (Explore subagents, research-only) are safe to parallelize without worktrees.

### Rule: If worktrees weren't used, verify before committing

After parallel write agents complete without worktrees:

- Read every file both agents claimed to touch
- Check for missing changes — the last writer may have silently dropped the other's edits
- Run full quality gates (`lint:fix`, `tc`, `test`) before committing
- Fix gaps manually before making any commit

### Tell agents about concurrent peers

If an agent will run alongside another that touches shared infrastructure (test helpers, config, package.json), include in the prompt:

> "Another agent is concurrently editing [file list]. Do NOT touch those files. Or if they are working on the same files, make sure they are aware of it."

## Subagent Types

- **Research Sub-agents**: For codebase exploration, pattern tracing, and dependency mapping. They return summaries of findings. The Explore subagent is an example.
- **Bug-Fixing Sub-agents**: For targeted fixes across multiple files. They return specific line edits or file paths. The Bug Fixer subagent is an example.
    - For complex bugs, it is recommended to use a Bug Fixer Democracy, or BFD for short, where 3-5 Bug-Fixing Sub-agents should be invoke simultaneously with the same prompt, and then once all are done, another Bug-Fixing Sub-agent should be invoked to aggregate the results and determine the best fix based on the returned summaries. This approach can help mitigate individual sub-agent errors and provide a more robust solution.
- **Core Review Sub-agents**: For reviewing code changes before commit. They return feedback on potential issues, style violations, or logic errors. The Code Reviewer subagent is an example.
    - This one can also be used to help with refactoring tasks.
- **Planning Sub-agents**: For generating implementation plans or task breakdowns. They return structured plans or checklists. The Task Planner subagent is an example.
- **Execution Sub-agents**: For performing specific actions in the codebase, such as refactoring or applying fixes. They return success/failure status and any relevant output. The Task Implementer subagent is an example.
    - This one can also be used to help with refactoring tasks.
