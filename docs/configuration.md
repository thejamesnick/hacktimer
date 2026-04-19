# Configuration

HackTimer is zero-config out of the box. Everything optional.

---

## Session Timeout (`--timeout`)

Controls how long a session can run before it hard-stops. The timer is wall-clock (always counting), not active time.

```bash
hacktimer start . -t 30m    # 30-minute sprint
hacktimer start . -t 4h     # 4-hour block
hacktimer start . -t 12h    # default
hacktimer start . -t 24h    # full day
```

**Format:** `<number><unit>` where unit is `m` (minutes) or `h` (hours).

| Example | Meaning |
|---|---|
| `30m` | 30 minutes |
| `2h` | 2 hours |
| `12h` | 12 hours (default) |
| `24h` | 24 hours |

**What happens at timeout:**
- At 80% — prints a warning: `⚠️  80% timeout reached`
- At 100% — hard stops tracking and prints final summary

**Invalid values** exit with a clear error:
```
✗ Invalid timeout format: "garbage". Use e.g. 30m, 2h, 12h
```

---

## Inactivity Threshold (`--inactivity`)

Controls how long HackTimer waits with no file changes before auto-pausing. Default is 10 minutes.

```bash
hacktimer start . -i 5m     # pause after 5 min of no edits
hacktimer start . -i 10m    # default
hacktimer start . -i 30m    # more lenient (good for reading/thinking)
hacktimer start . -i 1h     # pause after 1 hour
```

**Format:** same as timeout — `<number><unit>` with `m` or `h`.

**When you resume** (make a file change after idle), HackTimer prints:
```
▶️  Resumed
```

And starts counting again.

---

## Daemon Mode (`--daemon`)

Run HackTimer as a background process — terminal can be closed without stopping tracking.

```bash
hacktimer start . --daemon
```

HackTimer spawns a detached child process and saves its PID to `~/.hacktimer/hacktimer.pid`. You can then close the terminal freely.

**To manage the session from any terminal:**
```bash
hacktimer status    # check what's running
hacktimer stop      # pause it
hacktimer end       # end it permanently
```

---

## Storage Location

Sessions are stored at:

```
~/.hacktimer/sessions.json
```

The HMAC salt is stored at:

```
~/.hacktimer/.salt
```

These locations are fixed and not currently configurable. To reset everything:

```bash
rm -rf ~/.hacktimer
```

> ⚠️ This deletes all session history. Export with `hacktimer log` first if you want to keep it.

---

## No Environment Variables

HackTimer has no environment variable configuration. All options are CLI flags. This is intentional — it keeps the tool simple and makes session state explicit.
