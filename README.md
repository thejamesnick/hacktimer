# ⏱️ HackTimer

> I built the timer I use to time every hack. Hack #0. 😂

A CLI that tracks **only real active coding time** — not clock time. Auto-pauses when you go AFK. Logs LOC delta. Tamper-evident so *"shipped in 7h"* actually means something.

```bash
npx hacktimer start .
```

---

## Why

Clock time is a lie. You start a timer, make a coffee, scroll Twitter, come back — and now your "6 hour build" was really 2.5h of actual work.

HackTimer only counts time when files are changing. The moment you stop editing, the clock pauses. No fluff.

---

## Install

```bash
npm install -g hacktimer
# or just run directly
npx hacktimer start .
```

---

## Commands

```bash
hacktimer start <path> [-t 4h]   # start tracking (default timeout: 12h)
hacktimer stop                    # end session + summary
hacktimer status                  # check live session from another terminal
hacktimer report [project] -p week  # day | week | month | year
hacktimer list                    # all tracked projects
hacktimer log [project]           # raw session history
```

**Timeout format:** `30m`, `2h`, `12h`, `24h` — whatever fits your session.

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

*Part of the HACK Series (https://x.com/YukoNikumo) — building one thing a day, live. 🔥*
