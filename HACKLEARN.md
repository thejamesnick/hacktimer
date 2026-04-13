# HACKLEARN — HACK #0 — HackTimer

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
### Technical Lesson
Filesystem events are vastly more efficient than polling for activity detection - chokidar handles edge cases (atomic saves, temp files) that naive implementations miss.

### Process Lesson
The 12-hour constraint forces ruthless prioritization. I built the core tracker in 6 hours, spent 4 hours on reporting/features, and 2 hours on polish/docs - exactly how the constraint should work.

### Mindset Lesson
"Dirty but secure" isn't about cutting corners - it's about finding the simplest solution that meets security requirements. The HMAC logging took 20 lines instead of introducing a database.

## Next Steps / Future Ideas
If I had more time or wanted to extend this:
- [ ] IDE plugins (VS Code/JetBrains) for tighter integration
- [ ] GitHub action to verify claimed hours in public repos
- [ ] Team mode with encrypted sharing (opt-in only)
- [ ] Visualization dashboard showing productivity patterns
- [ ] Integration with project management tools (Jira, Linear, etc.)

---
*Built in 11.5 hours active time (tracked with HackTimer)*