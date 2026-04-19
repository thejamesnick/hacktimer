# Getting Started with HackTimer

> Track only real active coding time. Not clock time. Not vibes.

---

## Install

```bash
npm install -g myhacktimer
```

Or run it directly without installing (one-off):

```bash
npx myhacktimer start .
```

---

## Your First Session

### 1. Start tracking a project

Open a terminal in your project folder and run:

```bash
hacktimer start .
```

You'll see:

```
✅ HackTimer started for my-project
   ⏱️  Timeout: 12h | Active time: 0h 0m
   👀  Watching for file changes...
   ⏸️  Pauses automatically after 10min of no edits
```

HackTimer is now watching your folder. Every time you save a file, the active timer runs. Every time you go AFK for 10 minutes, it pauses automatically.

### 2. Check your progress (from any terminal)

```bash
hacktimer status
```

```
▶️  Tracking: my-project
⏱️  Active time: 1h 14m
📝 LOC so far: ~+340 lines
⏳ Remaining: 10h 46m
```

### 3. Pause the session

When you're done for the day but want to resume later:

```bash
hacktimer stop
```

```
⏸️  Paused — my-project
────────────────────────────────────────
⏱️  Active coding time:  2h 10m
────────────────────────────────────────
   Run hacktimer start . to resume anytime.
```

### 4. Resume later

Just run `start` again in the same folder — it automatically resumes the open session:

```bash
hacktimer start .
```

```
▶️  Resumed — my-project (2h 10m so far)
```

### 5. End the session for good

When the work is truly done:

```bash
hacktimer end
```

```
🏁 Session ended for my-project
────────────────────────────────────────
⏱️  Active coding time:  6h 48m
📝 LOC delta:           +980 lines
💾 Timeout used:        57%  (6h 48m / 12h)
────────────────────────────────────────
✅ Saved. Great work! 🔥
```

---

## Running in the Background (Daemon Mode)

If you want to close your terminal and keep tracking:

```bash
hacktimer start . --daemon
```

HackTimer detaches and keeps running as a background process. Run `hacktimer stop` or `hacktimer end` from any terminal to manage the session.

---

## Viewing Your History

```bash
hacktimer list              # all projects + total hours
hacktimer log               # all sessions
hacktimer log my-project    # sessions for one project
hacktimer report            # week summary (default)
hacktimer report -p month   # month summary
```

---

## What's Next

- [Commands reference →](./commands.md)
- [Configuration options →](./configuration.md)
- [How integrity works →](./integrity.md)
- [Data format →](./data-format.md)
- [FAQ →](./faq.md)
