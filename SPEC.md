# HackTimer Spec

> HACK #0 — thejamesnick HACK Series  
> Phase 1: Pure CLI. No UI. Ship fast. 🔥

---

## 🎯 What We're Building

A smart CLI tool that tracks **only real active coding time** per project. Not clock time — actual file-editing time. Auto-pauses when you go AFK. Logs sessions with LOC delta. Tamper-evident so "shipped in 7.2 hours" actually means something.

Meta angle: *"I built the timer I use to ship every hack"* 😂

---

## 🛠️ Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js (ESM) | Zero install friction, `npx` just works |
| Language | TypeScript | Type safety, better DX |
| CLI parsing | `commander` | Clean command definitions, auto `--help` |
| File watching | `chokidar` | Cross-platform, handles atomic saves + edge cases |
| Integrity | Node `crypto` (built-in) | HMAC-SHA256, no extra deps |
| Output styling | `chalk` | Coloured terminal output, emojis 😂 |
| Storage | Local JSON `~/.hacktimer/sessions.json` | Zero config, fully local, no DB |
| Build | `tsc` | Straight TypeScript compile to `dist/` |
| Distribution | `npm publish` / `npx hacktimer` | One command install |

**No database. No cloud. No telemetry. Everything stays on your machine.**

---

## 📁 File Structure

```
hacktimer/
├── src/
│   ├── index.ts        # CLI entry point — wires all commands
│   ├── tracker.ts      # start/stop logic, watcher orchestration
│   ├── watcher.ts      # chokidar wrapper, inactivity detection
│   ├── store.ts        # read/write sessions.json + HMAC integrity
│   ├── loc.ts          # LOC snapshot + delta (git first, fallback walk)
│   ├── report.ts       # aggregate sessions by day/week/month/year
│   ├── status.ts       # show live active session state
│   ├── list.ts         # list all tracked projects
│   └── log.ts          # raw session history
├── dist/               # compiled output (gitignored)
├── SPEC.md             # this file
├── HACKLEARN.md        # lessons learned doc
├── README.md           # user-facing docs
├── package.json
└── tsconfig.json
```

---

## ⚙️ Commands

### `hacktimer start <path> [--timeout <Xh>]`
Starts tracking a project folder.

- `<path>` — relative or absolute path to the project folder
- `--timeout` — accepts `30m`, `2h`, `12h`, `24h` etc. Defaults to `12h`
- Validates folder exists before starting
- Snapshots current LOC at start
- Starts chokidar watcher on the folder
- Auto-pauses after **10 minutes** of no file changes
- Prints live updates every few minutes while running
- Warns at 80% of timeout, hard stops at 100%

```
✅ HackTimer started for ./my-hack
⏱️  Timeout: 12h | Active time: 0h 0m
👀 Watching for file changes...
⏸️  Pauses automatically after 10min of no edits
```

### `hacktimer stop`
Ends the current session.

- Calculates final LOC, computes delta vs start snapshot
- Saves session to store with integrity hash
- Prints session summary

```
🏁 Session ended for ./my-hack
⏱️  Active coding time: 6.8h
📝 LOC delta: +980 lines
💾 Timeout used: 57% (6.8h / 12h)
✅ Saved. Great work!
```

### `hacktimer status`
Shows what's currently running (from another terminal).

```
▶️  Tracking: ./my-hack
⏱️  Active time: 2h 14m
📝 LOC so far: ~+340 lines
⏳ Remaining: 9h 46m
```

### `hacktimer report [projectName] --period <day|week|month|year>`
Aggregates sessions for a project by time period.

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

Also supports `hacktimer report --all` to see all projects.

### `hacktimer list`
Lists all tracked projects with total hours.

```
📁 Tracked Projects
─────────────────────────────
my-hack          67.3h total | 12h timeout
helius-pnl        4.1h total | 12h timeout
```

### `hacktimer log [projectName]`
Raw session list — useful for copy-pasting into X threads.

```
📋 Sessions for my-hack
─────────────────────────────
sess_001  2026-04-13  6.8h  +980 LOC
sess_002  2026-04-12  4.2h  +650 LOC
```

---

## 🗄️ Data Structure

Stored at `~/.hacktimer/sessions.json`:

```json
{
  "projects": {
    "my-hack": {
      "timeoutHours": 12,
      "sessions": [
        {
          "id": "sess_1744480000000",
          "start": "2026-04-13T10:00:00Z",
          "end": "2026-04-13T16:48:00Z",
          "activeMinutes": 408,
          "locStart": 1200,
          "locEnd": 2180,
          "date": "2026-04-13"
        }
      ]
    }
  },
  "activeProject": "my-hack",
  "activeSessionId": "sess_1744480000000",
  "_integrity": "hmac-sha256-hash-here"
}
```

Active session state (project + sessionId) is stored in the same file so `status` and `stop` can be run from any terminal.

---

## 🔒 Integrity Protection (The Dirty Trick)

Two layers:

1. **HMAC-SHA256** — entire JSON blob is hashed with a secret salt stored separately at `~/.hacktimer/.salt`. On every load, hash is recomputed and compared. Mismatch = big warning + reset.

2. **Read-only file** — after every write, `fs.chmod(path, 0o444)` makes the file read-only. Editing it manually requires a deliberate `chmod` — which feels intentional and leaves a trace.

```
⚠️  WARNING: Log file appears tampered with!
Integrity check failed. Session data has been reset.
```

This isn't unbreakable — it's a local tool. But it makes casual faking obvious and keeps the "shipped in X hours" claim honest. That's the spirit. 😂

---

## 📏 LOC Delta Tracking

At `start`: snapshot total LOC in the project folder.  
At `stop`: snapshot again, compute delta.

**Strategy (in order):**
1. `git ls-files` → count lines in tracked files only (most accurate)
2. Fallback: recursive file walk, skip `node_modules`, `.git`, `dist`, `build`, `__pycache__`, etc.
3. Only count recognised code file extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.rb`, `.sh`, `.json`, `.yaml`, `.md` etc.

Delta is stored per session. Reports sum deltas across sessions.

---

## ⏱️ Watcher Behaviour

- Uses `chokidar` watching for `add`, `change`, `unlink` events
- Ignores: dotfiles, `node_modules`, `dist`, `build`, `target`, `__pycache__`
- On every file event → reset 10-minute inactivity timer
- If timer fires → print `⏸️  Paused — no file changes for 10min` and stop counting
- Next file change → print `▶️  Resumed` and start counting again
- Active minutes only accumulate during non-paused periods

---

## 🚀 Distribution

```bash
npm install -g hacktimer   # global install
npx hacktimer start .      # or just run directly
```

Entry point: `dist/index.js` with `#!/usr/bin/env node` shebang.

---

## 🔨 Build & Dev

```bash
npm install          # install deps
npm run build        # tsc → dist/
npm run dev          # tsc --watch (run manually in terminal)
npm start            # node dist/index.js
```

---

## ✅ Phase 1 Scope (What We're Shipping)

- [x] `start` — folder watcher + inactivity pause + LOC snapshot
- [x] `stop` — end session + LOC delta + save + summary
- [x] `status` — live session state
- [x] `report` — day/week/month/year aggregation + LOC
- [x] `list` — all projects
- [x] `log` — raw session history
- [x] HMAC integrity + read-only file protection
- [x] Timeout warning at 80%, hard stop at 100%
- [x] `chalk` coloured output with emojis throughout

## ❌ Out of Scope (Phase 1)

- No UI / Electron / Tauri
- No team/sync mode
- No cloud upload
- No IDE plugin
- No pomodoro mode

These are Phase 2+ ideas. Ship Phase 1 first. 🔥
