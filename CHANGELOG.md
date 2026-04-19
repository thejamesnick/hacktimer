# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `HACKTIMER_POLL=1` environment variable enables chokidar polling mode for WSL and network drives
- `CHANGELOG.md` — this file
- GitHub Actions CI workflow — runs build + tests on every push and PR
- GitHub Actions publish workflow — auto-publishes to npm on version tags
- `docs/` folder with full user-facing guides (getting-started, commands, configuration, integrity, data-format, FAQ)

### Fixed
- `chmodSync` calls now wrapped in try/catch — no longer throws on Windows or network-mounted drives
- `walkFiles` now silently skips unreadable subdirectories (permission denied) instead of propagating the error
- Inactivity pause threshold displayed in start banner and idle messages now shows the actual configured value instead of hardcoded `10min`

---

## [1.0.6] — 2026-04-18

### Added
- `--inactivity` / `-i` flag — configurable auto-pause threshold (e.g. `-i 5m`, `-i 30m`)
- `schemaVersion: 1` added to store and included in HMAC payload — future migrations can bump the version intentionally
- Integration test: inactivity threshold is correctly forwarded to `startWatcher`

### Fixed
- Timeout and inactivity flags now fail-fast with a clear error on invalid input — no more silent defaults
- `hacktimer end` now works on paused sessions (`activeProject` is cleared after pause, but `activeProjectPath` is retained so `end` can find the open session)

---

## [1.0.5] — 2026-04-16

### Fixed
- `hacktimer status` now reads `session.activeMinutes` (checkpointed from the running process) instead of wall-clock elapsed time — accurate from any terminal
- `hacktimer status` LOC delta now uses `store.activeProjectPath` instead of `process.cwd()` — correct folder regardless of which directory the command is run from
- `hacktimer end` falls through to `activeProjectPath` when `activeProject` is cleared — works after `stop`

---

## [1.0.3] — 2026-04-14

### Added
- `activeMinutes` checkpointed to store every 2 minutes — process deaths lose at most 2 minutes of tracked time
- `activeProjectPath` saved to store on `start` — used by `end` and `status` when run from a different terminal

### Changed
- `hacktimer stop` now **pauses** the session (keeps it open, no `end` date written)
- `hacktimer end` is now the command that closes a session permanently and writes the final LOC delta + summary
- `hacktimer start` automatically resumes an open session for the same folder — handles crashes, restarts, and manual pauses transparently

---

## [1.0.0] — 2026-04-13

### Added
- `hacktimer start <path>` — start tracking with chokidar filesystem watcher; auto-pauses after 10 min of inactivity
- `hacktimer stop` — end session and print summary with active time and LOC delta
- `hacktimer status` — show live session state from any terminal
- `hacktimer report [project] --period <day|week|month|year>` — aggregate sessions by time period
- `hacktimer list` — list all tracked projects with total hours
- `hacktimer log [project]` — raw session history
- HMAC-SHA256 session integrity — entire `sessions.json` hashed on every write, verified on every read
- Read-only file protection — `chmod 444` after every write, making manual edits deliberate and traceable
- LOC delta tracking — `git ls-files` preferred, recursive file walk as fallback
- Timeout warning at 80%, hard stop at 100%
- `--timeout` / `-t` flag — configurable session timeout (e.g. `30m`, `4h`, `12h`)
- `--daemon` / `-d` flag — detach from terminal; PID saved for remote stop
- `chalk` coloured output and emojis throughout
- Version pulled from `package.json` at runtime — single source of truth

---

[Unreleased]: https://github.com/thejamesnick/hacktimer/compare/v1.0.6...HEAD
[1.0.6]: https://github.com/thejamesnick/hacktimer/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/thejamesnick/hacktimer/compare/v1.0.3...v1.0.5
[1.0.3]: https://github.com/thejamesnick/hacktimer/compare/v1.0.0...v1.0.3
[1.0.0]: https://github.com/thejamesnick/hacktimer/releases/tag/v1.0.0
