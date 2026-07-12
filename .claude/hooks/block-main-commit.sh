#!/usr/bin/env bash
# PreToolUse(Bash) guard — enforce trunk-based development.
# Blocks `git commit` / `git merge` when the current branch is `main`.
# Reads the hook JSON payload on stdin; exit 2 blocks the tool call and shows the reason.

input=$(cat)

is_blocked=$(printf '%s' "$input" | python3 -c '
import sys, json, shlex, re
try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    cmd = ""
blocked = False
# Handle compound commands (&&, ||, ;, |); inspect each git invocation subcommand.
for part in re.split(r"&&|\|\||;|\|", cmd):
    try:
        toks = shlex.split(part.strip())
    except Exception:
        continue
    for i, t in enumerate(toks):
        if t == "git":
            for st in toks[i + 1:]:
                if st.startswith("-"):
                    continue
                if st in ("commit", "merge"):
                    blocked = True
                break
            break
print("1" if blocked else "0")
')

if [ "$is_blocked" = "1" ]; then
  branch=$(git branch --show-current 2>/dev/null || echo "")
  if [ "$branch" = "main" ]; then
    echo "⛔ Trunk-based rule: do not commit or merge directly on 'main'." >&2
    echo "Create a feature branch first, e.g.: git switch -c <type>/<summary>" >&2
    echo "See docs/engineering/git-workflow.md." >&2
    exit 2
  fi
fi
exit 0
