# ⏱️ HackTimer

> I built the timer I use to time every hack. Hack #0. 😂

A CLI that tracks **only real active coding time** — not clock time. Auto-pauses when you go AFK. Logs LOC delta. Tamper-evident so *"shipped in 7h"* actually means something.

```bash
npx myhacktimer start .
```

---

## Why

Clock time is a lie. You start a timer, make a coffee, scroll Twitter, come back — and now your "6 hour build" was really 2.5h of actual work.

HackTimer only counts time when files are changing. The moment you stop editing, the clock pauses. No fluff.

---

## Install

```bash
npm install -g myhacktimer
# or just run directly
npx myhacktimer start .
```

---

## Commands

```bash
hacktimer start <path> [-t 4h]   # start or resume session (default timeout: 12h)
hacktimer start <path> --daemon  # run in background, close terminal freely
hacktimer stop                    # pause session — resume anytime with start
hacktimer end                     # end session forever + final summary
hacktimer status                  # check live session from another terminal
hacktimer report [project] -p week  # day | week | month | year
hacktimer list                    # all tracked projects
hacktimer log [project]           # raw session history
```

**Timeout format:** `30m`, `2h`, `12h`, `24h` — whatever fits your session.

**Sessions persist forever** — `stop` just pauses, `start` always resumes. Only `end` closes a session for good.

---

## How it works

- Watches your folder with `chokidar` for `add`, `change`, `unlink` events
- Resets a 10-minute inactivity timer on every file change
- When the timer fires → pauses. Next file change → resumes
- Snapshots LOC at `start` and `stop`, computes delta
- Saves everything to `~/.hacktimer/sessions.json`

---

## Integrity

Two layers so *"I shipped this in X hours"* isn't just vibes:

1. **HMAC-SHA256** — the entire session file is hashed on every write and verified on every read. Mismatch = warning + reset.
2. **Read-only file** — `chmod 444` after every write. Editing it manually requires a deliberate `chmod`, which feels intentional and leaves a trace.

Not unbreakable — it's a local tool. But it makes casual faking obvious. That's the point.

---

## Example output

```
✅ HackTimer started for ./my-hack
   ⏱️  Timeout: 12h | Active time: 0h 0m
   👀  Watching for file changes...
   ⏸️  Pauses automatically after 10min of no edits

⏸️  Paused — my-hack
────────────────────────────────────────
⏱️  Active coding time:  2h 10m
────────────────────────────────────────
   Run hacktimer start . to resume anytime.

🏁 Session ended for my-hack
────────────────────────────────────────
⏱️  Active coding time:  6h 48m
📝 LOC delta:           +980 lines
💾 Timeout used:        57%  (6h 48m / 12h)
────────────────────────────────────────
✅ Saved. Great work! 🔥
```

---

## Stack

Node.js + TypeScript. `chokidar` for watching. `commander` for CLI. `chalk` for colour. HMAC via built-in `crypto`. Zero database, zero cloud, zero telemetry.

Everything stays on your machine.

---

## Agent Skill

Install the skill so any agent (Kiro, Claude Code, Copilot, etc.) knows how to use hacktimer:

```bash
curl -fsSL https://raw.githubusercontent.com/thejamesnick/hacktimer/main/skills/install.sh | bash
```

Or manually copy `skills/hacktimer/SKILL.md` into `~/.agent-skills/hacktimer/SKILL.md`.

---

*Part of the HACK Series (https://x.com/YukoNikumo) — building one thing a day, live. 🔥*
