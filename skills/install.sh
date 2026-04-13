#!/bin/bash

# HackTimer Skill Installer
# Installs the hacktimer skill for any agent that supports the Agent Skills standard.
#
# Supports: Kiro, Claude Code, GitHub Copilot, and any agent reading ~/.agent-skills/
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/thejamesnick/hacktimer/main/skills/install.sh | bash

RAW_BASE="https://raw.githubusercontent.com/thejamesnick/hacktimer/main/skills/hacktimer"
SKILL_FILE="SKILL.md"
SKILL_NAME="hacktimer"
INSTALLED=0

install_to() {
  local dir="$1"
  mkdir -p "$dir"
  curl -fsSL "$RAW_BASE/$SKILL_FILE" -o "$dir/$SKILL_FILE"
  if [ $? -eq 0 ]; then
    echo "  ✅ $dir"
    INSTALLED=$((INSTALLED + 1))
  else
    echo "  ✗  Failed to write to $dir"
  fi
}

echo ""
echo "📦 Installing hacktimer skill..."
echo ""

# ~/.agent-skills/ — shared standard location (any agent)
install_to "$HOME/.agent-skills/$SKILL_NAME"

# ~/.kiro/skills/ — Kiro
if [ -d "$HOME/.kiro" ]; then
  install_to "$HOME/.kiro/skills/$SKILL_NAME"
fi

# ~/.claude/skills/ — Claude Code
if [ -d "$HOME/.claude" ]; then
  install_to "$HOME/.claude/skills/$SKILL_NAME"
fi

# ~/.config/github-copilot/skills/ — GitHub Copilot
if [ -d "$HOME/.config/github-copilot" ]; then
  install_to "$HOME/.config/github-copilot/skills/$SKILL_NAME"
fi

echo ""
if [ $INSTALLED -gt 0 ]; then
  echo "✅ Skill installed to $INSTALLED location(s)."
  echo "   Restart your agent and the hacktimer skill will be available."
else
  echo "✗ No skill locations found. Installed to ~/.agent-skills/ only."
fi
echo ""
