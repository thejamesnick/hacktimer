# Data Format

HackTimer stores all session data in a single JSON file at `~/.hacktimer/sessions.json`.

---

## Full Structure

```json
{
  "schemaVersion": 1,
  "projects": {
    "my-hack": {
      "timeoutHours": 12,
      "sessions": [
        {
          "id": "sess_1744480000000",
          "start": "2026-04-13T10:00:00.000Z",
          "end": "2026-04-13T16:48:00.000Z",
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
  "activeSessionStart": "2026-04-13T10:00:00.000Z",
  "activeProjectPath": "/Users/you/projects/my-hack",
  "_integrity": "abc123...hmac-sha256-hash"
}
```

---

## Field Reference

### Top Level

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | `number` | Store format version. Currently `1`. Included in HMAC. |
| `projects` | `object` | Map of project name → project data |
| `activeProject` | `string?` | Name of the currently-active project (cleared on pause/end) |
| `activeSessionId` | `string?` | ID of the currently-active session (cleared on pause/end) |
| `activeSessionStart` | `string?` | ISO timestamp when the current session started |
| `activeProjectPath` | `string?` | Absolute path of the tracked project (kept after pause for `end` to use) |
| `_integrity` | `string` | HMAC-SHA256 hash of the entire payload (used for tamper detection) |

### Project Object

| Field | Type | Description |
|---|---|---|
| `timeoutHours` | `number` | The `--timeout` value used when this project was started (in hours) |
| `sessions` | `Session[]` | Array of all sessions for this project |

### Session Object

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique session ID — format: `sess_<timestamp>` |
| `start` | `string` | ISO 8601 timestamp when the session started |
| `end` | `string \| null` | ISO 8601 timestamp when the session ended. `null` = session is still open |
| `activeMinutes` | `number` | Total minutes of active coding time (excludes paused periods) |
| `locStart` | `number` | LOC count at session start |
| `locEnd` | `number \| null` | LOC count at session end. `null` = session still open |
| `date` | `string` | Date string `YYYY-MM-DD` (used for daily report grouping) |

---

## Open vs Closed Sessions

A session is **open** when `end: null`. This happens after `start` or `stop` (pause). It becomes **closed** when `end` is set by `hacktimer end`.

Active project state (`activeProject`, `activeSessionId`) is cleared when the session is paused. The session itself stays open. This is how `hacktimer end` can close a paused session — it finds the open session via `activeProjectPath`.

---

## Salt File

```
~/.hacktimer/.salt
```

A 32-byte random hex string. Generated once on first run. Used as the HMAC-SHA256 secret key. Never included in the JSON file.

---

## LOC Delta

LOC delta per session = `locEnd - locStart`.

Report totals sum `locEnd - locStart` across all closed sessions in the period.

Active sessions (with `locEnd: null`) are excluded from reports until they're ended.
