# Dev Docs Update

You are updating existing development documentation before a context reset or at the end of a work session.

## Purpose

This command ensures that progress, decisions, and context are captured so work can continue seamlessly after a context reset.

## Process

### 1. Locate Active Dev Docs

Look in `dev/active/` for the current task's documentation directory.

### 2. Update Each File

#### Update `[task]-tasks.md`
- Mark completed tasks with `[x]`
- Add any new tasks discovered during implementation
- Note any blockers or dependencies
- Update current status

#### Update `[task]-context.md`
- Add any new key files that were created or modified
- Document any new decisions made
- Update integration points if changed
- Add any new patterns established

#### Update `[task]-plan.md` (if needed)
- Update scope if it changed
- Note any risks that materialized
- Update success criteria status

### 3. Add Session Notes

At the bottom of `[task]-tasks.md`, add a session summary:

```markdown
## Session Notes - [Date]

### Completed This Session
- [What was accomplished]

### Current State
- [Where things stand now]

### Next Steps
- [What should be done next]

### Blockers/Questions
- [Anything blocking progress]
```

## Output Format

After updating:
1. Summarize changes made to each file
2. Highlight current status
3. List immediate next steps for resuming work

## When to Use

- Before ending a coding session
- When context is getting long
- Before starting a different task
- When you need to hand off to another developer
