# HACKLEARN — HACK #0 — HackTimer

> honest lessons from actually building this

## The Problem Solved
Developers lie to themselves about productivity. We measure success by hours spent at desk, not actual focused coding time. Context switching, distractions, and "pretend work" inflate our perceived productivity, leading to poor planning and burnout.

**Before:** Manual time tracking, guesswork, or IDE plugins that count idle time as productive time.
**After:** HackTimer automatically tracks only when you're actively changing files in a project, giving honest productivity metrics.

## Key Algorithms + Dirty Tricks Used
### Filesystem Watching with Smart Debouncing
- **What it does:** Uses chokidar to watch project folders for file changes, resetting an inactivity timer on each change
- **Why it's dirty:** Instead of complex IDE integrations or polling loops, we leverage efficient filesystem events
- **Why it's secure:** Read-only file watching, no file modifications, runs in user space only
- **Code snippet:**
```typescript
const watcher = chokidar.watch(projectPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

let timeoutId: NodeJS.Timeout;
const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

function resetTimer() {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (isTracking) pauseTracking();
  }, INACTIVITY_MS);
}

watcher.on('all', (event, path) => {
  if (['add', 'change', 'unlink'].includes(event)) {
    resetTimer();
    lastActivity = Date.now();
  }
});
```

### Lines of Code Delta Tracking
- **What it does:** Takes git snapshots at start/stop to measure actual code output
- **Why it's dirty:** Falls back to file walking when git isn't available, giving approximate LOC without heavy dependencies
- **Why it's secure:** Read-only git operations, no repository modifications
- **Code snippet:**
```typescript
async function getLocSnapshot(projectPath: string): Promise<number> {
  try {
    // Try git first (accurate for tracked files)
    const { stdout } = await execAsync(
      'git ls-files | xargs wc -l',
      { cwd: projectPath }
    );
    return parseInt(stdout.trim().split('\n').pop() || '0', 10);
  } catch {
    // Fallback: walk files and count lines (approximate)
    let totalLines = 0;
    for await (const file of walkFiles(projectPath)) {
      if (isCodeFile(file)) {
        const content = await readFile(file, 'utf-8');
        totalLines += content.split('\n').length;
      }
    }
    return totalLines;
  }
}
```

### Tamper-Evident Logging
- **What it does:** HMAC-SHA256 signed log entries prevent casual falsification of hours
- **Why it's dirty:** Simple integrity check instead of full blockchain or server validation
- **Why it's secure:** Detection of tampering without preventing legitimate use
- **Code snippet:**
```typescript
function createLogEntry(data: any): string {
  const entry = {
    timestamp: Date.now(),
    data,
    version: '1.0'
  };
  
  const entryString = JSON.stringify(entry);
  const signature = crypto.createHmac('sha256', SECRET_KEY)
    .update(entryString)
    .digest('hex');
    
  return `${entryString}.${signature}`;
}

function verifyLogEntry(signedEntry: string): boolean {
  const [entryString, signature] = signedEntry.split('.');
  if (!entryString || !signature) return false;
  
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
    .update(entryString)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

## Trade-offs and Engineering Reality
### What We Sacrificed
- **Precision:** Falls back to approximate LOC when git unavailable (acceptable trade-off for zero-config)
- **Editor agnosticism:** Works with any editor/IDE via filesystem events, but misses non-file-change thinking time
- **Cross-platform nuances:** chokidar handles most edge cases, but network drives and WSL can have quirks

### What We Kept
- **Honest measurement:** Core principle of tracking only active coding time preserved
- **Zero setup:** Works immediately with any project folder
- **Privacy:** All data stored locally, no telemetry or external calls
- **Simplicity:** Under 500 lines of core logic

### Reality Check
- **[Limitation 1]:** Doesn't capture thinking time away from keyboard (by design - measures tangible output)
- **[Limitation 2]:** Can be tricked by automated file generators (mitigated by LOC delta sanity checks)
- **[Assumption]:** File changes correlate with productive coding time (valid for most development work)

## Shareable Snippets
### Project Activity Detector
```typescript
// Reusable utility for detecting project activity
import chokidar from 'chokidar';

interface ActivityOptions {
  timeoutMs?: number;
  onActive: () => void;
  onIdle: () => void;
}

function createActivityWatcher(
  path: string,
  { timeoutMs = 600_000, onActive, onIdle }: ActivityOptions
) {
  const watcher = chokidar.watch(path, { ignored: /(^|[\/\\])\../ });
  let timeoutId: NodeJS.Timeout;
  
  const reset = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(onIdle, timeoutMs);
  };
  
  watcher.on('all', (event, path) => {
    if (['add', 'change', 'unlink'].includes(event)) {
      onActive();
      reset();
    }
  });
  
  return {
    start: () => reset(),
    stop: () => {
      watcher.close();
      clearTimeout(timeoutId);
    }
  };
}
```

### Simple HMAC Integrity Check
```typescript
// Lightweight tamper detection for logs or configs
import crypto from 'crypto';

class IntegrityProtector {
  constructor(private secret: string) {}
  
  sign(data: string): string {
    const hmac = crypto.createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    return `${data}.${hmac}`;
  }
  
  verify(signed: string): boolean {
    const [data, signature] = signed.split('.');
    if (!data || !signature) return false;
    
    const expected = crypto.createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
      
    return signature === expected;
  }
}
```

## What This Taught Me

### 1. moduleResolution matters more than you think
Started with `"moduleResolution": "bundler"` in tsconfig because it looked modern. It broke everything — the IDE couldn't resolve `.js` imports, TS errors everywhere. The fix was `"module": "Node16"` + `"moduleResolution": "node16"`. Rule: bundler resolution is for Vite/esbuild. Node ESM projects need node16.

### 2. In-memory state dies between terminals
First instinct was to keep the active session in a module-level variable (`let active = ...`). Works fine if you start and stop from the same terminal. But `hacktimer status` and `hacktimer stop` run as separate processes — they have no idea what's in memory. The fix: persist everything to `~/.hacktimer/sessions.json` on every write, read from it on every command. The in-memory `active` object is only for the running `start` process.

### 3. chmod 444 is a dirty trick that actually works
After every write to `sessions.json`, we do `fs.chmodSync(path, 0o444)` — makes the file read-only. Before every write, `0o644` to unlock it. This means if someone manually edits the file, they have to deliberately `chmod` it first. Combined with HMAC, it makes casual faking obvious without needing a server or blockchain. Simple. Effective.

### 4. commander's help is plain by default — you have to own it
`commander` auto-generates help from your command definitions. It works but it's boring — no colour, no personality, no examples. `addHelpText('beforeAll', ...)` and `addHelpText('afterAll', ...)` let you wrap it with whatever you want. Worth doing — it's the first thing people see.

### 5. Shared formatters prevent drift
Had `fmtTime` duplicated in `report.ts` with slightly wrong rounding logic (`Math.round(m / 6)` — don't ask). Meanwhile `tracker.ts` was showing `6h 48m` and `report.ts` was showing `6.8h`. Inconsistent. The fix: one `export function fmtDecimal()` in `tracker.ts`, imported everywhere. One source of truth.

### 6. Version should never be hardcoded in CLI tools
Had `.version('1.0.0')` hardcoded in `index.ts`. Every time you bump `package.json` you'd have to remember to update it in two places. Use `createRequire` to pull it from `package.json` at runtime — then bumping the version in one place is all you ever need.

---

## The Dirty Tricks (real ones)

**Filesystem events > polling.** chokidar fires on actual OS-level file events. No CPU burn, no polling interval, no missed saves. Handles atomic saves (where editors write to a temp file then rename) out of the box.

**git ls-files for LOC.** Instead of walking every file, `git ls-files` gives you exactly the files that matter — tracked source files only. No `node_modules`, no `dist`, no generated files. Falls back to a manual walk if git isn't available.

**Store path in the session, not just in memory.** When `stop` runs from a different terminal, `active` is null. But the store has `activeProject` and `activeSessionId` — enough to find the session, compute the final LOC, and write the result. The in-memory object is a performance optimisation, not the source of truth.

---

## Trade-offs

- **LOC delta isn't perfect.** If you're in a monorepo or tracking a folder with generated files, the delta can be noisy. Good enough for the use case.
- **10-minute inactivity is arbitrary.** Could be configurable. Kept it fixed for simplicity — most people won't need to change it.
- **stop from a different terminal loses active time precision.** Fixed in v1.0.3+ — active time is persisted to the store every 2 minutes, so `stop`/`end` from any terminal reads the last checkpoint. You lose at most 2 mins.

---

## What Changed After v1.0.0

- `stop` now **pauses** the session — keeps it open, saves time, no end date written
- `end` is the new command that closes a session forever and writes the final LOC delta
- `start` always resumes if an open session exists for that folder — works after crashes, restarts, or manual pauses
- Active time saved to store every 2 minutes — daemon can die and you lose nothing
- `activeProjectPath` saved to store — `end` always counts LOC in the right folder even from a different terminal

---

## Next Steps

- [ ] IDE plugin (VS Code) — hook into save events directly instead of filesystem
- [ ] GitHub Action — verify claimed hours against commit timestamps
- [ ] Team mode — encrypted session sharing for pair programming
- [ ] `hacktimer resume` — restart a stopped session

---
*Built in [X]h active time — tracked with HackTimer, naturally 😂*