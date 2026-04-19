# HACKLEARN — HACK #0 — HackTimer

> honest lessons from actually building this

---

## The Problem Solved

Developers lie to themselves about productivity. We measure success by hours spent at the desk, not actual focused coding time. Context switching, distractions, and "pretend work" inflate our perceived productivity, leading to poor planning and burnout.

**Before:** Manual time tracking, guesswork, or IDE plugins that count idle time as productive time.  
**After:** HackTimer automatically tracks only when you're actively changing files in a project, giving honest productivity metrics.

---

## Key Algorithms + Dirty Tricks Used

### Filesystem Watching with Configurable Inactivity

- **What it does:** Uses chokidar to watch project folders for file changes, resetting an inactivity timer on each change. The inactivity threshold is configurable via `--inactivity` (default: 10 min).
- **Why it's dirty:** Instead of complex IDE integrations or polling loops, we leverage efficient filesystem events. No CPU burn.
- **Why it's secure:** Read-only file watching, no file modifications, runs in user space only.

```typescript
// watcher.ts — the real implementation
export function startWatcher(
  projectPath: string,
  onActive: () => void,
  onIdle: () => void,
  inactivityMs: number = 10 * 60 * 1000  // configurable, default 10min
): WatcherHandle {
  const watcher = chokidar.watch(projectPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  let timeoutId: NodeJS.Timeout | null = null;
  let isIdle = false;

  function resetTimer() {
    if (timeoutId) clearTimeout(timeoutId);
    if (isIdle) { isIdle = false; onActive(); }
    timeoutId = setTimeout(() => { isIdle = true; onIdle(); }, inactivityMs);
  }

  watcher.on('all', (event) => {
    if (['add', 'change', 'unlink'].includes(event)) resetTimer();
  });

  return { stop: () => { watcher.close(); if (timeoutId) clearTimeout(timeoutId); } };
}
```

### Lines of Code Delta Tracking

- **What it does:** Takes LOC snapshots at `start` and `end`/`stop` to measure actual code output.
- **Why it's dirty:** Falls back to file walking when git isn't available — zero extra config, works on any folder.
- **Why it's secure:** Read-only git operations, no repository modifications.

```typescript
// loc.ts — the real implementation
export async function getLocCount(projectPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'git ls-files | xargs wc -l 2>/dev/null | tail -1',
      { cwd: projectPath }
    );
    const total = parseInt(stdout.trim().split(/\s+/)[0] ?? '0', 10);
    if (!isNaN(total) && total > 0) return total;
  } catch { /* fall through */ }

  // Fallback: walk files manually
  let totalLines = 0;
  const walk = async (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
        totalLines += fs.readFileSync(full, 'utf-8').split('\n').length;
      }
    }
  };
  await walk(projectPath);
  return totalLines;
}
```

### Tamper-Evident Session Storage

- **What it does:** HMAC-SHA256 signs the entire session JSON blob on every write. On every read, the hash is recomputed and compared — mismatch triggers a warning + reset.
- **Why it's dirty:** Simple integrity check instead of a server, blockchain, or GPG signatures.
- **Why it's secure:** Makes casual falsification obvious. Combined with `chmod 444`, editing requires deliberate effort that leaves a trace.

```typescript
// store.ts — the real implementation
export function saveStore(store: Store): void {
  const dataToHash = { ...store };
  delete dataToHash._integrity;
  dataToHash.schemaVersion = 1;  // versioned for future migrations

  const salt = loadOrCreateSalt();
  const integrity = computeHmac(dataToHash, salt);

  fs.chmodSync(STORE_PATH, 0o644);  // unlock
  fs.writeFileSync(STORE_PATH, JSON.stringify({ ...dataToHash, _integrity: integrity }, null, 2));
  fs.chmodSync(STORE_PATH, 0o444);  // lock read-only
}
```

---

## What This Taught Me

### 1. moduleResolution matters more than you think

Started with `"moduleResolution": "bundler"` in tsconfig because it looked modern. It broke everything — the IDE couldn't resolve `.js` imports, TS errors everywhere. The fix was `"module": "Node16"` + `"moduleResolution": "node16"`. Rule: bundler resolution is for Vite/esbuild. Node ESM projects need node16.

### 2. In-memory state dies between terminals

First instinct was to keep the active session in a module-level variable (`let active = ...`). Works fine if you start and stop from the same terminal. But `hacktimer status` and `hacktimer stop` run as separate processes — they have no idea what's in memory.

The fix: persist everything to `~/.hacktimer/sessions.json` on every write, read from it on every command. The in-memory `active` object is only an optimisation for the running `start` process — it's never the source of truth.

### 3. chmod 444 is a dirty trick that actually works

After every write to `sessions.json`, do `fs.chmodSync(path, 0o444)` — read-only. Before every write, `0o644` to unlock. If someone manually edits the file, they have to deliberately `chmod` it first. Combined with HMAC, this makes casual faking obvious without needing a server or blockchain.

### 4. Wall-clock time lies — persist the real number

First implementation of `status` subtracted `Date.now() - session.start` and showed that as "active time". But `start` is the wall-clock timestamp when the session opened — it includes all the paused time, AFK time, even time the daemon was dead. The fix: `startTracking` checkpoints `activeMinutes` to the store every 2 minutes. `status` reads that number. So even if you run `hacktimer status` from a completely different terminal, it shows true active coding time — not vibes.

### 5. `process.cwd()` is the wrong anchor for cross-terminal commands

`status` was calling `getLocCount(process.cwd())` to show a live LOC delta. That's the directory of whoever ran `status`, not the project being tracked. If you open a new terminal in `~` and type `hacktimer status`, it counts lines in your home directory. The fix: save `activeProjectPath` to the store when `start` runs. Every subsequent command (`status`, `end`, `stop` from daemon) reads from there.

### 6. commander's help is plain by default — you have to own it

`commander` auto-generates help from your command definitions. It works but it's boring — no colour, no personality, no examples. `addHelpText('beforeAll', ...)` and `addHelpText('afterAll', ...)` let you wrap it. Worth doing — it's the first thing users see.

### 7. Shared formatters prevent drift

Had `fmtTime` duplicated in `report.ts` with slightly wrong rounding logic. `tracker.ts` showed `6h 48m` and `report.ts` showed `6.8h`. The fix: one `export function fmtDecimal()` in `tracker.ts`, imported everywhere. One source of truth.

### 8. Version should never be hardcoded in CLI tools

Had `.version('1.0.0')` hardcoded in `index.ts`. The fix: use `createRequire` to pull it from `package.json` at runtime — then bumping the version in one place is all you ever need.

### 9. Fail fast, not silently

`parseTimeout('garbage')` used to silently return `12` (the default). Users had no idea their `--timeout` was ignored. The fix: validate the format with a regex, exit with a clear error if it doesn't match. Fail fast > silent default. Every CLI option that accepts input should do this.

### 10. End should work on paused sessions too

`hacktimer end` originally checked `store.activeProject` and bailed if it was empty. But `stop` clears `activeProject` — so after pausing, you literally couldn't `end` the session without starting it again first. That's a broken flow. The fix: fall through to check `activeProjectPath` and find the open session. Two lines of extra logic, saves a lot of frustration.

---

## The Dirty Tricks (real ones)

**Filesystem events > polling.** chokidar fires on actual OS-level file events. No CPU burn, no polling interval, no missed saves. Handles atomic saves (where editors write to a temp file then rename) out of the box.

**git ls-files for LOC.** Instead of walking every file, `git ls-files` gives you exactly the files that matter — tracked source files only. No `node_modules`, no `dist`, no generated files. Falls back to a manual walk if git isn't available.

**Store path in the session, not just in memory.** When `stop` runs from a different terminal, `active` is null. But the store has `activeProject`, `activeSessionId`, and `activeProjectPath` — enough to find the session, compute final LOC in the right folder, and write the result.

**schemaVersion in the HMAC.** By including `schemaVersion: 1` inside the hashed payload, any future migration can bump the version and invalidate old hashes intentionally rather than accidentally.

---

## Trade-offs

- **LOC delta isn't perfect.** Monorepos or folders with generated files can produce noisy deltas. Good enough for the use case.
- **Inactivity is configurable but defaults to 10 min.** The `-i / --inactivity` flag lets you change it. The default fits most focused coding sessions.
- **Active time checkpoint is every 2 min.** If the daemon dies between checkpoints you lose up to 2 min of tracked time. Acceptable for a local tool.
- **Doesn't capture thinking time.** By design. We measure output, not presence.
- **Can be tricked by file generators.** Mitigated by LOC delta — if you generate 10k lines automatically the delta shows it, which is honest anyway.

---

## Shareable Snippets

### Configurable Project Activity Watcher

```typescript
// Drop-in utility for any project that needs active-vs-idle detection
import chokidar from 'chokidar';

interface ActivityOptions {
  inactivityMs?: number;  // default: 10 minutes
  onActive: () => void;
  onIdle: () => void;
}

function createActivityWatcher(path: string, { inactivityMs = 600_000, onActive, onIdle }: ActivityOptions) {
  const watcher = chokidar.watch(path, { ignored: /(^|[\/\\])\./, ignoreInitial: true });
  let timeoutId: NodeJS.Timeout;
  let isIdle = false;

  const reset = () => {
    clearTimeout(timeoutId);
    if (isIdle) { isIdle = false; onActive(); }
    timeoutId = setTimeout(() => { isIdle = true; onIdle(); }, inactivityMs);
  };

  watcher.on('all', (event) => {
    if (['add', 'change', 'unlink'].includes(event)) reset();
  });

  return {
    stop: () => { watcher.close(); clearTimeout(timeoutId); }
  };
}
```

### HMAC Integrity for Local JSON Files

```typescript
// Lightweight tamper detection for any local config or log
import crypto from 'crypto';
import fs from 'fs';

function saveWithIntegrity(path: string, data: object, secret: string) {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  fs.chmodSync(path, 0o644);
  fs.writeFileSync(path, JSON.stringify({ ...data, _integrity: hmac }, null, 2));
  fs.chmodSync(path, 0o444);  // read-only after write
}

function loadWithIntegrity(path: string, secret: string): object | null {
  const raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const { _integrity, ...data } = raw;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
  if (_integrity !== expected) { console.warn('⚠️  Tampered!'); return null; }
  return data;
}
```

---

## What Changed — Version History

### v1.0.0 — Initial ship
- `start`, `stop`, `status`, `report`, `list`, `log`
- HMAC + chmod integrity
- chokidar watcher, LOC git-first + fallback

### v1.0.3 — Multi-terminal reliability
- `stop` now **pauses** (no end date) — `end` closes permanently
- `start` resumes existing open sessions automatically
- `activeMinutes` checkpointed every 2 min — daemon deaths lose ≤2 min

### v1.0.5 — Cross-terminal accuracy
- `status` reads `session.activeMinutes` instead of wall-clock time
- `status` LOC uses `store.activeProjectPath` instead of `process.cwd()`
- `end` works on paused sessions (no active watcher needed)

### v1.0.6 — Config + hardening
- `--inactivity <duration>` flag — configurable pause threshold (e.g. `-i 5m`)
- Timeout validation fails fast with a clear error (no more silent defaults)
- `schemaVersion: 1` added to store and HMAC payload — ready for future migrations
- Integration tests: start → pause → resume → end, paused-end, inactivity passthrough

---

## Next Steps

- [ ] VS Code plugin — hook into save events directly instead of filesystem
- [ ] GitHub Action — verify claimed hours against commit timestamps
- [ ] Team mode — encrypted session sharing for pair programming
- [ ] Web dashboard — visualise sessions.json with a simple local server

---
*Built in [X]h active time — tracked with HackTimer, naturally 😂*