# Skill Developer

## Overview

This meta-skill provides guidelines for creating, modifying, and maintaining Claude Code skills and hooks for this project.

## Skill Structure

```
.claude/
├── settings.json           # Hooks and permissions configuration
├── hooks/
│   ├── skill-activation-prompt.sh   # Entry point shell script
│   ├── skill-activation-prompt.ts   # Main activation logic
│   └── post-tool-use-tracker.sh     # File edit tracking
├── skills/
│   ├── skill-rules.json             # Skill activation rules
│   ├── backend-dev-guidelines/
│   │   ├── SKILL.md                 # Main skill file
│   │   └── resources/               # Detailed resource files
│   ├── frontend-dev-guidelines/
│   │   ├── SKILL.md
│   │   └── resources/
│   └── skill-developer/
│       └── SKILL.md
├── commands/
│   ├── dev-docs.md                  # Development documentation generator
│   └── dev-docs-update.md           # Update existing dev docs
└── agents/
    └── (specialized agents go here)
```

## Creating a New Skill

### 1. Create the Skill Directory

```bash
mkdir -p .claude/skills/[skill-name]/resources
```

### 2. Create SKILL.md

The main skill file should:
- Be under 500 lines (progressive disclosure)
- Provide high-level overview
- Link to resource files for details
- Include quick navigation table

```markdown
# [Skill Name]

## Overview
[Brief description of what this skill covers]

## Quick Navigation
| Resource | Description |
|----------|-------------|
| [Topic](./resources/topic.md) | Description |

## Core Patterns
[Most important patterns and examples]

## Key Conventions
[List of conventions to follow]

## Common Mistakes
[What to avoid]

## See Also
[Links to related skills/docs]
```

### 3. Create Resource Files

Each resource file should:
- Focus on one topic
- Be under 500 lines
- Include practical examples
- Be self-contained

### 4. Add to skill-rules.json

```json
{
  "skill-name": {
    "name": "skill-name",
    "description": "What this skill does",
    "enforcement": "suggest",
    "priority": "medium",
    "promptTriggers": {
      "keywords": ["keyword1", "keyword2"],
      "intentPatterns": ["create.*pattern", "add.*pattern"]
    },
    "fileTriggers": {
      "pathPatterns": ["path/**/*.ts"],
      "excludePatterns": ["**/*.test.ts"]
    }
  }
}
```

## Skill Rules Configuration

### Enforcement Types

| Type | Behavior |
|------|----------|
| `suggest` | Skill suggested, execution continues |
| `warn` | Warning displayed, execution continues |
| `block` | Requires skill usage before proceeding |

### Priority Levels

| Priority | Use Case |
|----------|----------|
| `critical` | Security, auth - always surface |
| `high` | Core business logic |
| `medium` | Supporting functionality |
| `low` | Nice-to-have enhancements |

### Trigger Types

#### Prompt Triggers
- `keywords`: Simple substring matching (case-insensitive)
- `intentPatterns`: Regex patterns for intent matching

#### File Triggers
- `pathPatterns`: Glob patterns for file paths
- `excludePatterns`: Patterns to exclude
- `contentPatterns`: Patterns to match in file content

## Creating Hooks

### Hook Types

| Hook | When Triggered |
|------|----------------|
| `UserPromptSubmit` | Before processing user prompt |
| `PostToolUse` | After a tool is used |
| `Stop` | When Claude stops responding |

### Hook Structure

```json
{
  "hooks": {
    "HookType": [
      {
        "type": "shell",
        "command": "bash .claude/hooks/hook-name.sh",
        "tools": ["Edit", "Write"],  // Optional: filter by tools
        "description": "What this hook does"
      }
    ]
  }
}
```

### Hook Input/Output

Hooks receive JSON on stdin:
```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "allowed_tools": [...],
  "prompt": "..."  // For UserPromptSubmit
}
```

Output printed to stdout is displayed to Claude.

## Creating Slash Commands

### Command Structure

Create `.claude/commands/[command-name].md`:

```markdown
# Command Title

[Instructions for Claude when this command is invoked]

## Process
1. Step 1
2. Step 2

## Output Format
[How to format the response]
```

### Usage

Users invoke with: `/command-name [arguments]`

## Best Practices

### Skills
1. **Keep SKILL.md focused** - High-level overview only
2. **Use progressive disclosure** - Details in resource files
3. **Include examples** - Practical, copy-paste ready
4. **Document conventions** - Be explicit about patterns
5. **List common mistakes** - Help avoid pitfalls

### Hooks
1. **Fail gracefully** - Exit 0 on non-critical failures
2. **Be fast** - Don't block the user
3. **Log errors** - To stderr for debugging
4. **Use environment variables** - `CLAUDE_PROJECT_DIR`, `CLAUDE_SESSION_ID`

### Commands
1. **Clear instructions** - Tell Claude exactly what to do
2. **Structured output** - Define expected format
3. **Handle edge cases** - What if info is missing?

## Testing Skills

1. Edit a file that should trigger the skill
2. Ask a question with trigger keywords
3. Verify skill suggestion appears
4. Check that skill content is helpful

## Maintenance

- Review and update skills as project evolves
- Remove outdated patterns
- Add new conventions as they emerge
- Keep documentation in sync with code
