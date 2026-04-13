---
name: hacktimer
description: Use this skill when the user wants to track coding time, start or stop a hacktimer session, check session status, view reports, list projects, or view session logs using the hacktimer CLI.
---

# HackTimer

HackTimer tracks **real active coding time** — not clock time. Auto-pauses after 10 minutes of inactivity, logs LOC delta, tamper-evident storage via HMAC-SHA256.

## Install

```bash
npm install -g hacktimer
# or without installing
npx hacktimer start .
```

## Commands

### Start a session
```bash
hacktimer start <path>              # default 12h timeout
hacktimer start . --timeout 4h     # custom timeout (30m, 2h, 4h, 12h, 24h)
```

### Stop a session
```bash
hacktimer stop
```
Ends the session, computes LOC delta, saves with integrity hash, prints summary.

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
- LOC snapshot at `start` and `stop`, delta stored per session
- Sessions saved to `~/.hacktimer/sessions.json`
- File is `chmod 444` after every write + HMAC-SHA256 integrity check on every read

## Data location

```
~/.hacktimer/sessions.json   # all session data
~/.hacktimer/.salt           # HMAC salt (never share this)
```

## Agent usage tips

- Always run `hacktimer start <path>` from the project root or pass the full path
- `hacktimer stop` works from any terminal — it reads state from the store, not memory
- Use `hacktimer status` to check if a session is already running before starting a new one
- If the store reports a tamper warning, the data has been reset — previous sessions are gone
- Timeout format examples: `30m`, `1h`, `4h`, `12h`, `24h`
