# HackTimer Stack

> HACK #0 — thejamesnick HACK Series

---

## Runtime & Language

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js (ESM) | Zero install friction — `npx` just works |
| Language | TypeScript | Type safety, better DX |
| Build | `tsc` | Straight compile to `dist/` |

---

## Dependencies

| Package | Role |
|---|---|
| `commander` | CLI command definitions + auto `--help` |
| `chokidar` | File watching — cross-platform, handles atomic saves |
| `chalk` | Coloured terminal output + emojis |

### Built-ins (no extra deps)
- `crypto` — HMAC-SHA256 for session integrity
- `fs` — local JSON storage + read-only chmod trick
- `child_process` — `git ls-files` for LOC counting

---

## Storage

- **Format:** Local JSON at `~/.hacktimer/sessions.json`
- **Salt:** `~/.hacktimer/.salt` (used for HMAC)
- Zero config. Fully local. No DB. No cloud. No telemetry.

---

## Integrity

Two layers:
1. **HMAC-SHA256** — whole JSON blob hashed against `.salt` on every load
2. **Read-only file** — `chmod 0o444` after every write, making manual edits deliberate and traceable

---

## LOC Counting

1. `git ls-files` → count lines in tracked files (preferred)
2. Fallback: recursive walk, skipping `node_modules`, `.git`, `dist`, `build`, `__pycache__`
3. Recognised extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.rb`, `.sh`, `.json`, `.yaml`, `.md`

---

## Distribution

```bash
npm install -g hacktimer   # global
npx hacktimer start .      # or run directly
```

Entry: `dist/index.js` with `#!/usr/bin/env node` shebang.

---

## Dev Commands

```bash
npm install       # install deps
npm run build     # tsc → dist/
npm run dev       # tsc --watch (run manually)
npm start         # node dist/index.js
```

---

**No database. No cloud. No telemetry. Everything stays on your machine.** 🔒
