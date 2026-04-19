# HackTimer Docs

Everything you need to use HackTimer.

---

| Guide | Description |
|---|---|
| [Getting Started](./getting-started.md) | Install, first session, basic workflow |
| [Commands](./commands.md) | Full reference for every CLI command |
| [Configuration](./configuration.md) | Timeout, inactivity, daemon mode, storage |
| [Integrity](./integrity.md) | How HMAC + chmod keeps session data honest |
| [Data Format](./data-format.md) | What `sessions.json` looks like and what each field means |
| [FAQ](./faq.md) | Common questions and edge cases |

---

**Quick reference:**

```bash
hacktimer start .              # start/resume tracking current folder
hacktimer start . -t 4h        # custom timeout
hacktimer start . -i 5m        # custom inactivity threshold
hacktimer start . --daemon     # run in background
hacktimer stop                 # pause (resume with start)
hacktimer end                  # end forever + final summary
hacktimer status               # live session check from any terminal
hacktimer report -p week       # weekly summary
hacktimer list                 # all projects
hacktimer log                  # raw session history
```
