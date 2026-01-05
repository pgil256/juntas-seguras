#!/bin/bash
# Post-tool-use tracker for Edit, MultiEdit, and Write operations
# Tracks edited files for build/type-check orchestration

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name and file path from hook input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

# Skip if not an edit operation
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "MultiEdit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Skip if no file path
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Skip markdown files
if [[ "$FILE_PATH" == *.md ]]; then
  exit 0
fi

# Get project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Create cache directory
CACHE_DIR="$PROJECT_DIR/.claude/tsc-cache"
mkdir -p "$CACHE_DIR"

# Get session ID for tracking
SESSION_ID="${CLAUDE_SESSION_ID:-default}"

# Log the edited file
EDIT_LOG="$CACHE_DIR/edited-files-$SESSION_ID.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | $TOOL_NAME | $FILE_PATH" >> "$EDIT_LOG"

# Determine the relevant project/directory
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

# Track affected directories for potential type checking
AFFECTED_FILE="$CACHE_DIR/affected-dirs-$SESSION_ID.txt"

# Extract the top-level directory
TOP_DIR=$(echo "$REL_PATH" | cut -d'/' -f1)

# Add to affected directories if it's a TypeScript/JavaScript file
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx ]]; then
  echo "$TOP_DIR" >> "$AFFECTED_FILE"
  # Deduplicate
  if [[ -f "$AFFECTED_FILE" ]]; then
    sort -u "$AFFECTED_FILE" -o "$AFFECTED_FILE"
  fi
fi

# Generate type-check command if tsconfig exists
COMMANDS_FILE="$CACHE_DIR/commands-$SESSION_ID.txt"

if [[ -f "$PROJECT_DIR/tsconfig.json" ]]; then
  # Detect package manager
  if [[ -f "$PROJECT_DIR/pnpm-lock.yaml" ]]; then
    PKG_MGR="pnpm"
  elif [[ -f "$PROJECT_DIR/yarn.lock" ]]; then
    PKG_MGR="yarn"
  else
    PKG_MGR="npm"
  fi

  # Add type-check command
  echo "$PKG_MGR run build --dry-run 2>/dev/null || $PKG_MGR exec tsc --noEmit" >> "$COMMANDS_FILE"

  # Deduplicate commands
  if [[ -f "$COMMANDS_FILE" ]]; then
    sort -u "$COMMANDS_FILE" -o "$COMMANDS_FILE"
  fi
fi

exit 0
