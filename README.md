# HackTimer

Smart CLI that tracks only real active coding time per project — no more guessing.

## The Problem
Developers lie to themselves about productivity. We count clock time, not actual focused work. Distractions, breaks, and context switching inflate our perceived productivity.

## The Solution
HackTimer tracks **real active coding time** by:
- Watching your project folder for file changes
- Auto-pausing after 10 minutes of inactivity
- Reporting time by day/week/month/year
- Tracking lines of code delta to verify actual progress
- Ships as `npx hacktimer` or `npm install -g hacktimer`

## Features
✅ **Smart tracking** - Only counts time when you're actively coding  
✅ **Auto-pause** - Stops after 10min of no file changes  
✅ **Custom timeouts** - Per-project limits (default 12h for HACK Series)  
✅ **Multiple reports** - View stats by day/week/month/year  
✅ **LOC delta** - Measures actual code output, not just time  
✅ **Integrity protection** - Tamper-evident logging with HMAC  
✅ **Zero config** - Works out of the box for any project  

## Usage
```bash
# Start tracking a project
hacktimer start ./my-project --timeout 12h

# Check current status
hacktimer status

# Stop and see final report
hacktimer stop

# View time reports
hacktimer report --period day
hacktimer report --period week
hacktimer report --period month
hacktimer report --period year
hacktimer report --all

# List all tracked projects
hacktimer list

# Export logs
hacktimer log
```

## Dirty Trick
Filesystem watching + in-memory state + LOC snapshots = accurate productivity measurement without over-engineering.

Built in under 12 active hours (tracked with itself, naturally).