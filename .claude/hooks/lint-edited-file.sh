#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit) — lint the edited JS/TS file and surface any issues.
# Reads the hook JSON payload on stdin; exit 2 feeds ESLint output back so it gets fixed.

input=$(cat)

file=$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || echo "")

# Only lint JS/TS source files.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true

# Lint just this file using the project's local ESLint (flat config).
out=$(npx --no-install eslint "$file" 2>&1)
status=$?

if [ "$status" -ne 0 ]; then
  echo "ESLint reported issues in $file — please fix before continuing:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
