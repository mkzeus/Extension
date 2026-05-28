#!/usr/bin/env bash
set -e

# ---- OmniRoute / Claude config ----
export ANTHROPIC_API_KEY="sk-2e24154ceb147be9-59b670-0ec65138"
#"sk-277332958239b972-a4f9cc-27cf98ea"
export ANTHROPIC_BASE_URL="http://localhost:20128"

# Model (must match what OmniRoute exposes)
export ANTHROPIC_MODEL="kr/claude-sonnet-4.5"
#"kr/claude-sonnet-4.5"

# Optional tweaks
export ANTHROPIC_TIMEOUT=600
export CLAUDE_CODE_LOG=info

# Run Claude Code
exec claude code "$@"
