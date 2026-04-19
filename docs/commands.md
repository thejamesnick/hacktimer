# Commands Reference

Full reference for every `hacktimer` command.

---

## `hacktimer start <path>`

Start tracking a project folder. If an open session already exists for that folder, it resumes automatically.

```bash
hacktimer start .                   # start/resume in current directory
hacktimer start ~/projects/my-hack  # absolute path
hacktimer start . -t 4h             # custom timeout
hacktimer start . -i 5m             # custom inactivity threshold
hacktimer start . --daemon          # detach from terminal
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `-t, --timeout <duration>` | `12h` | Session timeout — hard stop at this limit. Formats: `30m`, `2h`, `12h`, `24h` |
| `-i, --inactivity <duration>` | `10m` | Auto-pause after this long with no file changes. Formats: `5m`, `10m`, `1h` |
| `-d, --daemon` | off | Detach from terminal and run in background |

**Behaviour:**
- Validates that `<path>` exists before starting
- Snapshots current LOC count as the baseline
- Watches for `add`, `change`, `unlink` file events
- Resets the inactivity timer on every file change
- Prints a live update every 2 minutes while running
- Warns at 80% of timeout; hard-stops at 100%
- Checkpoints `activeMinutes` to disk every 2 minutes

**Example output:**
```
✅ HackTimer started for my-hack
   ⏱️  Timeout: 12h | Active time: 0h 0m
   👀  Watching for file changes...
   ⏸️  Pauses automatically after 10min of no edits
```

---

## `hacktimer stop`

Pause the current session. Keeps the session open — you can resume with `start` anytime.

```bash
hacktimer stop
```

**What it does:**
- Saves `activeMinutes` accumulated so far
- Clears the active session marker (`activeProject`, `activeSessionId`)
- Keeps `activeProjectPath` so `end` can find the session later
- Does **not** write an `end` date — the session stays open

**Example output:**
```
⏸️  Paused — my-hack
────────────────────────────────────────
⏱️  Active coding time:  2h 10m
────────────────────────────────────────
   Run hacktimer start . to resume anytime.
```

---

## `hacktimer end`

End the current session permanently. Works whether the session is actively running or was previously paused.

```bash
hacktimer end
```

**What it does:**
- Takes a final LOC snapshot and computes the delta
- Writes the `end` timestamp to the session
- Clears all active session state from the store
- Prints a final summary

**Example output:**
```
🏁 Session ended for my-hack
────────────────────────────────────────
⏱️  Active coding time:  6h 48m
📝 LOC delta:           +980 lines
💾 Timeout used:        57%  (6h 48m / 12h)
────────────────────────────────────────
✅ Saved. Great work! 🔥
```

---

## `hacktimer status`

Show the current live session state. Reads from the store — works from any terminal, even if a different terminal is running the tracker.

```bash
hacktimer status
```

**Example output (active):**
```
▶️  Tracking: my-hack
⏱️  Active time: 2h 14m
📝 LOC so far: ~+340 lines
⏳ Remaining: 9h 46m
```

**Example output (no session):**
```
💤 No active session running.
   Run hacktimer start <path> to begin.
```

---

## `hacktimer report [project] [--period <period>]`

Aggregate sessions by time period.

```bash
hacktimer report                       # all projects, this week
hacktimer report my-hack               # one project, this week
hacktimer report my-hack -p day        # today
hacktimer report my-hack -p month      # this month
hacktimer report my-hack -p year       # this year
```

**Options:**

| Flag | Default | Values |
|---|---|---|
| `-p, --period <period>` | `week` | `day`, `week`, `month`, `year` |

**Example output:**
```
📊 Report for my-hack (timeout: 12h)
📅 This week: 18.4h | +2,340 LOC
─────────────────────────────
2026-04-13 : 6.8h | +980 LOC
2026-04-12 : 4.2h | +650 LOC
2026-04-11 : 7.4h | +710 LOC
─────────────────────────────
🏆 Total ever: 67.3h | +12,450 LOC
```

---

## `hacktimer list`

List all tracked projects with total hours and timeout settings.

```bash
hacktimer list
```

**Example output:**
```
📁 Tracked Projects
─────────────────────────────
my-hack          67.3h total | 12h timeout
helius-pnl        4.1h total | 12h timeout
```

---

## `hacktimer log [project]`

Show raw session history — useful for copy-pasting into posts or auditing.

```bash
hacktimer log             # all projects
hacktimer log my-hack     # one project
```

**Example output:**
```
📋 Sessions for my-hack
─────────────────────────────
sess_001  2026-04-13  6.8h  +980 LOC
sess_002  2026-04-12  4.2h  +650 LOC
sess_003  2026-04-11  7.4h  +710 LOC
```

---

## Global Options

| Flag | Description |
|---|---|
| `--help` | Show help for any command |
| `--version` | Show current version |
