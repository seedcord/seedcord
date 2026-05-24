---
name: "loop-sesh"
description: "Single-session research, clarification, and implementation workflow with no ambiguity."
argument-hint: "task=The task, feature, bug fix, or prompt you want to accomplish (required)"
---

# Looping Work Session

**Description:** Single-session research, clarification, and implementation workflow with no ambiguity.

**Input Arguments:**

- `task`: The task, feature, bug fix, or prompt you want to accomplish (required)

---

## Workflow Overview

This prompt enforces a disciplined, single-session workflow:

1. **Research Phase** → Understand the codebase deeply
2. **Clarification Loop** → Ask questions, get answers via `temp.md`, continue until clarity
3. **Implementation Phase** → Build the solution
4. ⚠️ **No early termination** → Session continues until complete

You will never leave a session with unanswered questions or partial work.

---

## Phase 1: Research (First 2-3 Minutes)

**Your immediate actions:**

1. Read the task description provided in the `task=` argument
2. Search the codebase for relevant patterns, similar implementations, and dependencies
3. Read AGENTS.md to understand architectural constraints
4. Identify ambiguities, open questions, and decision points
5. **Do NOT ask questions yet** — just gather context

**Tools to use:**

- `search_subagent` for exploring relevant code patterns
- `grep_search` for finding specific implementations
- `read_file` for understanding key modules
- `semantic_search` for architecture patterns

---

## Phase 2: Clarification Loop (In .vscode/temp.md)

**Create `.vscode/temp.md`** with this structure:

```markdown
# Clarification Loop - [Task Name]

## Research Findings

- [Summary of what you found in the codebase]
- [Current architecture patterns]
- [Integration points identified]
- [Constraints from AGENTS.md]

## Questions for Clarity

**Q1: [Clarifying question about the task]**

- Option A: [choice]
- Option B: [choice]
- Other: \_\_\_

**Q2: [Next question]**

- [provide options or details needed]

**Q3: [Continue as needed]**

---

**Your answers:**
[User provides answers here]
```

**Then:**

1. **Sleep for 10 seconds** — gives you time to answer
2. **Read the updated temp.md** — get your answers
3. **If more questions needed:**
   - **APPEND** new questions to temp.md (don't overwrite)
   - **APPEND** a note: `--- Q for follow-up ---`
   - Sleep 10 seconds again
   - Repeat until no ambiguities remain

4. **When done:** You will write in temp.md either:
   - `// All questions answered - ready to implement` (agent proceeds)
   - `START IMPLEMENTING` (ignore remaining questions if any, begin work immediately)

---

## Phase 3: Implementation

**Once clarification is complete:**

1. Collect all decisions and answers from temp.md
2. Plan the implementation (tasks, files, changes)
3. Build the solution incrementally
4. Run tests and validation
5. Clean up and finalize

**Critical rules during implementation:**

- Follow AGENTS.md architectural guidelines strictly
- No allocations in hot paths (Section 3)
- Proper event subscription/unsubscription (Section 6)
- Cache references, avoid repeated calls (Section 10)
- Write tests as you implement (Section 19)
- Format code and run build/test tasks before finishing

---

## Session Discipline

⚠️ **Non-negotiable rules:**

- ✅ You will **NOT** end this session early
- ✅ You will **NOT** ask questions and wait for a new message — use temp.md loop
- ✅ You will **NOT** stop after clarifications — continue to implementation
- ✅ You will **NOT** leave ambiguities unresolved
- ✅ You will **NOT** implement without understanding all constraints
- ✅ You will use temp.md for ALL communication
- ✅ You will append (not overwrite) follow-up questions
- ✅ You will sleep for 10 seconds between reads

---

## Quick Checklist Before Starting

- [ ] Read the `task` input: ${input:task}
- [ ] Research the codebase (don't skip this)
- [ ] Identify all ambiguities
- [ ] Create `.vscode/temp.md` with detailed questions
- [ ] Sleep 10 seconds
- [ ] Begin the loop (ask, sleep, read, append, repeat)
- [ ] Once clarity achieved, implement fully
- [ ] Build, test, format before finishing

---

**Next action:** Read your task description and begin Phase 1 research immediately.
