# FAQ

Common questions about HackTimer.

---

## General

### What's the difference between `stop` and `end`?

- **`stop`** — pauses the session. Saves your active time so far. Keeps the session open so you can resume with `start` later. Think of it like putting down a physical timer and picking it back up.
- **`end`** — closes the session permanently. Writes the final LOC delta and summary. No more resuming after this.

Use `stop` at the end of a working day. Use `end` when the project (or that chunk of work) is genuinely done.

---

### Does HackTimer track me while I'm just reading code, not editing?

No. HackTimer only counts time when files are changing. If you're reading, thinking, browsing, or in a meeting — the inactivity timer fires after the configured threshold (default: 10 minutes) and the session pauses. That's the whole point.

---

### I opened a new terminal and ran `hacktimer status` — is that accurate?

Yes. `status` reads `activeMinutes` from `~/.hacktimer/sessions.json` which is checkpointed every 2 minutes by the running `start` process. The LOC count also uses the stored `activeProjectPath` — not your current directory — so it counts the right folder regardless of where you run the command.

---

### Can I run HackTimer on multiple projects at the same time?

Not currently. Only one project can be active at a time. Running `hacktimer start <path>` on a second project while one is running will prompt you to stop the first one.

---

## Sessions

### I forgot to run `end`. Can I still get my session data?

Yes. Run `hacktimer end` at any time — even days later. It reads the open session from `~/.hacktimer/sessions.json` and closes it with the current LOC count. The `activeMinutes` figure will reflect what was last checkpointed (accurate to within 2 minutes of when the process last ran).

### My terminal crashed / I killed the process. Is my session lost?

No. Active time is checkpointed to disk every 2 minutes. If the process dies between checkpoints you lose at most 2 minutes. Run `hacktimer end` to close the session cleanly.

### I ran `hacktimer stop` and now `hacktimer end` says "No open session" — what happened?

This shouldn't happen with the current version — `end` checks `activeProjectPath` even when `activeProject` is cleared. If you see this, check whether `activeProjectPath` exists in your store:

```bash
cat ~/.hacktimer/sessions.json | python3 -m json.tool | grep activeProjectPath
```

If it's missing, the session may have already been ended.

---

## LOC Counting

### How does LOC counting work?

At `start` and `end`, HackTimer takes a snapshot of total lines of code in the project:

1. **Preferred:** `git ls-files | xargs wc -l` — counts only git-tracked files. Ignores `node_modules`, `dist`, generated files automatically.
2. **Fallback:** Recursive file walk, skipping common noise directories (`node_modules`, `.git`, `dist`, `build`, `__pycache__`). Counts recognised code file extensions only.

The delta is `locEnd - locStart`.

### My LOC delta looks wrong — huge number or negative

A few common causes:

- **Generated files:** If your build process generates files inside the tracked folder, they get counted. Try tracking a `src/` subfolder instead of the repo root.
- **Deleting code:** Negative delta is valid — you removed more than you added.
- **Git not initialised:** The fallback walk is less precise. Run `git init` in your project to use the more accurate git method.

---

## Integrity

### What does "Log file appears tampered with" mean?

The HMAC hash stored in `sessions.json` doesn't match a freshly computed hash of the file contents. This means the file was modified outside of HackTimer — either manually, by another process, or by corruption.

HackTimer resets the affected data and starts fresh. You'll lose session history that was in the tampered file.

### Can I edit `sessions.json` manually?

Technically yes — you need to `chmod 644 ~/.hacktimer/sessions.json` first, edit it, then recompute the HMAC hash with the salt. In practice this is deliberately awkward. The integrity layer exists to make casual edits obvious.

---

## Daemon Mode

### How do I check if the daemon is running?

```bash
hacktimer status
```

If a session is active, it will show even if the tracking terminal is closed.

### How do I stop the daemon?

```bash
hacktimer stop      # pause the session
# or
hacktimer end       # end it permanently
```

Both commands send a signal to the daemon process using the PID stored at `~/.hacktimer/hacktimer.pid`.

---

## Branding

### The package is called `myhacktimer` but the command is `hacktimer` — why?

`hacktimer` was taken on npm. The npm package is `myhacktimer` but the CLI binary registered in `package.json` is `hacktimer` — so after installing, you always type `hacktimer`. `npx myhacktimer` also works.

---

## Uninstalling

```bash
npm uninstall -g myhacktimer
rm -rf ~/.hacktimer       # optional — removes all session data
```
