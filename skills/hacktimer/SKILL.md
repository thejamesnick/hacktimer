---
name: hacktimer
description: Use this skill when the user wants to track coding time, start, pause or end a hacktimer session, check session status, view reports, list projects, or view session logs using the hacktimer CLI.
---

# HackTimer

HackTimer tracks **real active coding time** — not clock time. Auto-pauses after 10 minutes of inactivity, logs LOC delta, tamper-evident storage via HMAC-SHA256. Sessions persist across restarts — `stop` pauses, `start` always resumes, only `end` closes a session forever.

## Install

```bash
npm install -g myhacktimer
# or without installing
npx myhacktimer start .
```

## Commands

### Start or resume a session
```bash
hacktimer start <path>              # start fresh or resume paused session
hacktimer start . --daemon          # run in background, close terminal freely
hacktimer start . --timeout 4h     # custom timeout (30m, 2h, 4h, 12h, 24h)
```

### Pause (stop)
```bash
hacktimer stop
```
Saves current time, kills watcher. Session stays open — resume anytime with `start`.

### End forever
```bash
hacktimer end
```
Closes the session permanently. Computes final LOC delta. Prints full summary.

### Check status (from any terminal)
```bash
hacktimer status
```

### Reports
```bash
hacktimer report                    # all projects, day view
hacktimer report my-hack            # specific project
hacktimer report --period week      # day | week | month | year
hacktimer report --all --period month
```

### List all projects
```bash
hacktimer list
```

### Raw session log
```bash
hacktimer log                       # all projects
hacktimer log my-hack               # specific project
```

## How it works

- Watches the folder with `chokidar` for file `add`, `change`, `unlink` events
- Resets a 10-minute inactivity timer on every file change
- Timer fires → pauses. Next file change → resumes
- Active time saved to store every 2 minutes — survives crashes
- LOC snapshot at `start`, final delta computed at `end`
- Sessions saved to `~/.hacktimer/sessions.json`
- File is `chmod 444` after every write + HMAC-SHA256 integrity check on every read
- Only one project tracked at a time — `stop` before switching projects

## Data location

```
~/.hacktimer/sessions.json   # all session data
~/.hacktimer/.salt           # HMAC salt (never share this)
~/.hacktimer/daemon.pid      # daemon PID (auto-cleaned on stop/end)
```

## Agent usage tips

- `hacktimer start .` always resumes if an open session exists for that folder
- Use `--daemon` to detach from terminal: `hacktimer start . --daemon`
- Machine crashed? Just run `hacktimer start .` again — resumes from last checkpoint
- `hacktimer stop` = pause. `hacktimer end` = done forever
- Only one project active at a time — stop current before starting another
- Timeout format examples: `30m`, `1h`, `4h`, `12h`, `24h`
