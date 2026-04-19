# Integrity Protection

> "Shipped in 7 hours" should actually mean something.

HackTimer uses two layers of protection to make casual falsification of session data obvious — without requiring a server, blockchain, or external service.

---

## Layer 1: HMAC-SHA256

Every time `sessions.json` is saved, the entire JSON payload is hashed using HMAC-SHA256 with a randomly-generated salt. The hash is stored in the file itself as `_integrity`.

Every time `sessions.json` is loaded, the hash is recomputed and compared. If they don't match:

```
⚠️  WARNING: Log file appears tampered with! Resetting affected data.
```

The session data is treated as invalid and reset.

**Where is the salt?**

```
~/.hacktimer/.salt
```

A 32-byte random hex string generated on first run. It never leaves your machine. The salt is not included in the hashed payload — it's the secret key for the HMAC.

**What is hashed?**

The entire JSON object (minus `_integrity` itself), including `schemaVersion`. This means any modification to any field — project names, session times, LOC counts — breaks the hash.

---

## Layer 2: Read-Only File

After every write, HackTimer runs:

```
chmod 444 ~/.hacktimer/sessions.json
```

The file is read-only. Editing it in a text editor requires:
1. Running `chmod 644 ~/.hacktimer/sessions.json` manually
2. Making your edits
3. Saving

That's a deliberate, traceable action. It makes "I just tweaked the number a little" much more conscious.

---

## Schema Versioning

The `schemaVersion` field is included in the HMAC hash:

```json
{
  "schemaVersion": 1,
  "projects": { ... },
  "_integrity": "abc123..."
}
```

This means future schema migrations can bump the version and intentionally invalidate old hashes, rather than triggering a false tamper warning.

---

## What This Doesn't Protect Against

HackTimer is a **local, honest-effort** tool. It's not unbreakable.

- Someone with enough determination can delete the salt, recompute the hash, and write whatever they want.
- It doesn't prevent deleting the entire `~/.hacktimer` folder and starting fresh.
- It doesn't timestamp data on a trusted server.

**The goal is to make _casual_ faking obvious and _accidental_ corruption detectable.** If you're reporting hours publicly or for any professional context, the integrity layer adds meaningful weight to those numbers. That's the spirit. 😂

---

## Verifying Integrity Manually

You can manually inspect the file:

```bash
cat ~/.hacktimer/sessions.json | python3 -m json.tool
```

The `_integrity` field will be the HMAC-SHA256 hash. You can recompute it yourself if you have access to the salt at `~/.hacktimer/.salt`.
