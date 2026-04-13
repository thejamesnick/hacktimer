import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { startWatcher, type WatcherHandle } from './watcher.js';
import { loadStore, saveStore, type Session } from './store.js';
import { getLocCount } from './loc.js';

interface ActiveSession {
  projectName: string;
  projectPath: string;
  sessionId: string;
  startTime: number;
  activeMs: number;
  lastResumeTime: number;
  isPaused: boolean;
  locStart: number;
  timeoutHours: number;
  watcher: WatcherHandle;
  timeoutWarned: boolean;
}

// shared time formatter — decimal like spec: 6.8h
export function fmtDecimal(mins: number): string {
  return (mins / 60).toFixed(1) + 'h';
}

let active: ActiveSession | null = null;

export async function startTracking(projectPath: string, timeoutHours: number) {
  const absPath = path.resolve(projectPath);

  if (!fs.existsSync(absPath)) {
    console.log(chalk.red(`✗ Path does not exist: ${absPath}`));
    process.exit(1);
  }

  const store = loadStore();

  if (store.activeProject) {
    console.log(chalk.yellow(`⚠️  Already tracking "${store.activeProject}". Run hacktimer stop first.`));
    process.exit(1);
  }

  const projectName = path.basename(absPath);
  const displayPath = projectPath; // keep original arg for display (e.g. "./my-hack")
  const sessionId = `sess_${Date.now()}`;
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  const locStart = await getLocCount(absPath);

  console.log(chalk.green(`\n✅ HackTimer started for ${chalk.bold.white(displayPath)}`));
  console.log(chalk.gray(`   ${chalk.cyan('⏱️')}  Timeout: ${chalk.bold.white(timeoutHours + 'h')} | Active time: ${chalk.bold.white('0h 0m')}`));
  console.log(chalk.gray(`   ${'👀'}  Watching for file changes...`));
  console.log(chalk.gray(`   ${'⏸️'}  Pauses automatically after ${chalk.bold('10min')} of no edits\n`));

  // Persist active session to store so status/stop work from any terminal
  if (!store.projects[projectName]) {
    store.projects[projectName] = { timeoutHours, sessions: [] };
  }
  store.projects[projectName].timeoutHours = timeoutHours;

  const session: Session = {
    id: sessionId,
    start: now,
    end: null,
    activeMinutes: 0,
    locStart,
    locEnd: null,
    date,
  };
  store.projects[projectName].sessions.push(session);
  store.activeProject = projectName;
  store.activeSessionId = sessionId;
  store.activeSessionStart = now;
  saveStore(store);

  const watcher = startWatcher(
    absPath,
    () => {
      // resumed
      if (active) {
        active.isPaused = false;
        active.lastResumeTime = Date.now();
        console.log(chalk.green('▶️  Resumed'));
      }
    },
    () => {
      // idle
      if (active && !active.isPaused) {
        active.activeMs += Date.now() - active.lastResumeTime;
        active.isPaused = true;
        console.log(chalk.yellow('⏸️  Paused — no file changes for 10min'));
      }
    }
  );

  active = {
    projectName,
    projectPath: absPath,
    sessionId,
    startTime: Date.now(),
    activeMs: 0,
    lastResumeTime: Date.now(),
    isPaused: false,
    locStart,
    timeoutHours,
    watcher,
    timeoutWarned: false,
  };

  // Live update every 2 minutes while running
  const liveInterval = setInterval(() => {
    if (!active) { clearInterval(liveInterval); return; }
    const elapsed = active.activeMs + (active.isPaused ? 0 : Date.now() - active.lastResumeTime);
    const mins = Math.round(elapsed / 60000);
    const status = active.isPaused ? chalk.yellow('⏸️  paused') : chalk.green('▶️  active');
    console.log(chalk.gray(`   ⏱️  ${fmtDecimal(mins)} active — ${status}`));
  }, 2 * 60 * 1000);

  // Timeout enforcement
  const timeoutMs = timeoutHours * 60 * 60 * 1000;
  const warnAt = timeoutMs * 0.8;

  setTimeout(() => {
    if (active && !active.timeoutWarned) {
      active.timeoutWarned = true;
      console.log(chalk.yellow(`\n⚠️  80% of timeout reached (${timeoutHours}h). Wrapping up soon?`));
    }
  }, warnAt);

  setTimeout(async () => {
    console.log(chalk.red(`\n🛑 Timeout reached (${timeoutHours}h). Auto-stopping...`));
    await stopTracking();
    process.exit(0);
  }, timeoutMs);
}

export async function stopTracking() {
  const store = loadStore();

  if (!store.activeProject || !store.activeSessionId) {
    console.log(chalk.yellow('⚠️  No active session to stop.'));
    return;
  }

  const projectName = store.activeProject;
  const sessionId = store.activeSessionId;

  // Accumulate final active time
  let finalActiveMs = 0;
  let resolvedPath = process.cwd();
  if (active) {
    finalActiveMs = active.activeMs;
    if (!active.isPaused) {
      finalActiveMs += Date.now() - active.lastResumeTime;
    }
    resolvedPath = active.projectPath;
    active.watcher.stop();
    active = null;
  }

  const projectData = store.projects[projectName];
  const session = projectData?.sessions.find(s => s.id === sessionId);

  if (!session) {
    console.log(chalk.red('✗ Session data not found.'));
    return;
  }

  const projectPath = resolvedPath;
  const locEnd = await getLocCount(projectPath);
  const locDelta = locEnd - session.locStart;
  const activeMinutes = Math.round(finalActiveMs / 60000);
  const timeoutHours = projectData.timeoutHours;
  const timeoutUsedPct = Math.round((finalActiveMs / (timeoutHours * 3600000)) * 100);

  session.end = new Date().toISOString();
  session.activeMinutes = activeMinutes;
  session.locEnd = locEnd;

  delete store.activeProject;
  delete store.activeSessionId;
  delete store.activeSessionStart;
  saveStore(store);

  const divider = chalk.gray('─'.repeat(40));

  console.log(chalk.cyan(`\n🏁 Session ended for ${chalk.bold.white(projectName)}`));
  console.log(divider);
  console.log(`⏱️  Active coding time: ${chalk.bold.green(fmtDecimal(activeMinutes))}`);
  console.log(`📝 LOC delta:          ${locDelta >= 0 ? chalk.bold.green('+' + locDelta + ' lines') : chalk.bold.red(locDelta + ' lines')}`);
  console.log(`💾 Timeout used:       ${chalk.bold.white(timeoutUsedPct + '%')} ${chalk.gray(`(${fmtDecimal(activeMinutes)} / ${timeoutHours}h)`)}`);
  console.log(divider);
  console.log(chalk.green('✅ Saved. Great work! 🔥\n'));
}

export function getActiveFromStore() {
  return loadStore();
}
