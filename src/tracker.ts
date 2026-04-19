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

// Format an inactivity duration in milliseconds to a human-readable string.
function fmtInactivity(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}min`;
}

const DEFAULT_INACTIVITY_MS = 10 * 60 * 1000;

let active: ActiveSession | null = null;

export async function startTracking(projectPath: string, timeoutHours: number, inactivityMs?: number) {
  const absPath = path.resolve(projectPath);
  const inactivityDisplay = fmtInactivity(inactivityMs ?? DEFAULT_INACTIVITY_MS);

  if (!fs.existsSync(absPath)) {
    console.log(chalk.red(`✗ Path does not exist: ${absPath}`));
    process.exit(1);
  }

  const store = loadStore();
  const projectName = path.basename(absPath);

  // Resume if there's an open session for this project (active or paused)
  const isSameProject = store.activeProject === projectName;
  const openSession = store.projects[projectName]?.sessions.find(s => !s.end) ?? null;

  if (store.activeProject && !isSameProject) {
    console.log(chalk.yellow(`⚠️  Already tracking "${store.activeProject}". Run hacktimer stop first.`));
    process.exit(1);
  }

  const displayPath = projectPath;
  const now = new Date().toISOString();

  let sessionId: string;
  let locStart: number;
  let alreadyActiveMs: number = 0;

  if (openSession) {
    // Resume existing session (was paused or daemon died)
    sessionId = openSession.id;
    locStart = openSession.locStart;
    alreadyActiveMs = openSession.activeMinutes * 60000;
    const resumedMins = openSession.activeMinutes;
    const h = Math.floor(resumedMins / 60);
    const m = resumedMins % 60;
    console.log(chalk.green(`\n▶️  Resumed session for ${chalk.bold.white(displayPath)}`));
    console.log(chalk.gray(`   ⏱️  Already logged: ${chalk.bold.white(`${h}h ${m}m`)} | picking up where you left off`));
    console.log(chalk.gray(`   👀  Watching for file changes...\n`));

    // Re-activate in store
    store.activeProject = projectName;
    store.activeSessionId = sessionId;
    store.activeSessionStart = openSession.start;
    store.activeProjectPath = absPath;
    saveStore(store);
  } else {
    // New session
    sessionId = `sess_${Date.now()}`;
    const date = now.slice(0, 10);
    locStart = await getLocCount(absPath);

    console.log(chalk.green(`\n✅ HackTimer started for ${chalk.bold.white(displayPath)}`));
    console.log(chalk.gray(`   ${chalk.cyan('⏱️')}  Timeout: ${chalk.bold.white(timeoutHours + 'h')} | Active time: ${chalk.bold.white('0h 0m')}`));
    console.log(chalk.gray(`   ${'👀'}  Watching for file changes...`));
    console.log(chalk.gray(`   ${'⏸️'}  Pauses automatically after ${chalk.bold(inactivityDisplay)} of no edits\n`));

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
    store.activeProjectPath = absPath;
    saveStore(store);
  }

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
        console.log(chalk.yellow(`⏸️  Paused — no file changes for ${inactivityDisplay}`));
      }
    },
    inactivityMs
  );

  active = {
    projectName,
    projectPath: absPath,
    sessionId,
    startTime: Date.now(),
    activeMs: alreadyActiveMs,
    lastResumeTime: Date.now(),
    isPaused: false,
    locStart,
    timeoutHours,
    watcher,
    timeoutWarned: false,
  };

  // Live update + persist active time every 2 minutes
  const liveInterval = setInterval(() => {
    if (!active) { clearInterval(liveInterval); return; }
    const elapsed = active.activeMs + (active.isPaused ? 0 : Date.now() - active.lastResumeTime);
    const mins = Math.round(elapsed / 60000);
    const status = active.isPaused ? chalk.yellow('⏸️  paused') : chalk.green('▶️  active');
    console.log(chalk.gray(`   ⏱️  ${fmtDecimal(mins)} active — ${status}`));

    // Persist so stop can read accurate time even if daemon dies
    const s = loadStore();
    const sess = s.projects[active.projectName]?.sessions.find(x => x.id === active!.sessionId);
    if (sess) {
      sess.activeMinutes = mins;
      saveStore(s);
    }
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
    await pauseTracking();
    process.exit(0);
  }, timeoutMs);
}

export async function pauseTracking() {
  const store = loadStore();

  if (!store.activeProject || !store.activeSessionId) {
    console.log(chalk.yellow('⚠️  No active session.'));
    return;
  }

  const projectName = store.activeProject;
  const sessionId = store.activeSessionId;

  let finalActiveMs = 0;
  if (active) {
    finalActiveMs = active.activeMs;
    if (!active.isPaused) finalActiveMs += Date.now() - active.lastResumeTime;
    active.watcher.stop();
    active = null;
  } else {
    const sess = store.projects[projectName]?.sessions.find(s => s.id === sessionId);
    if (sess) finalActiveMs = sess.activeMinutes * 60000;
  }

  const activeMinutes = Math.round(finalActiveMs / 60000);
  const session = store.projects[projectName]?.sessions.find(s => s.id === sessionId);
  if (session) session.activeMinutes = activeMinutes;

  // Keep session open — just clear the active watcher state
  delete store.activeProject;
  delete store.activeSessionId;
  delete store.activeSessionStart;
  // Keep activeProjectPath so resume knows where to watch
  saveStore(store);

  const divider = chalk.gray('─'.repeat(40));
  console.log(chalk.yellow(`\n⏸️  Paused — ${chalk.bold.white(projectName)}`));
  console.log(divider);
  console.log(`⏱️  Active coding time: ${chalk.bold.green(fmtDecimal(activeMinutes))}`);
  console.log(`📝 LOC so far:         ${chalk.bold.white(session?.locStart ?? 0)} lines at start`);
  console.log(divider);
  console.log(chalk.gray(`   Run ${chalk.cyan('hacktimer start .')} to resume anytime.\n`));
}

export async function endTracking() {
  const store = loadStore();

  // Support ending a paused session (activeProject is cleared on pause, but
  // activeProjectPath is kept and the session still has end: null)
  if (!store.activeProject || !store.activeSessionId) {
    const pausedPath = store.activeProjectPath;
    if (!pausedPath) {
      console.log(chalk.yellow('⚠️  No active or paused session to end.'));
      return;
    }
    const projectName = path.basename(pausedPath);
    const projectData = store.projects[projectName];
    const openSession = projectData?.sessions.find(s => !s.end);
    if (!openSession) {
      console.log(chalk.yellow('⚠️  No open session to end.'));
      return;
    }

    const locEnd = await getLocCount(pausedPath);
    const locDelta = locEnd - openSession.locStart;
    const activeMinutes = openSession.activeMinutes;
    const timeoutUsedPct = Math.round((activeMinutes / (projectData.timeoutHours * 60)) * 100);

    openSession.end = new Date().toISOString();
    openSession.locEnd = locEnd;

    delete store.activeProjectPath;
    saveStore(store);

    const divider = chalk.gray('─'.repeat(40));
    console.log(chalk.cyan(`\n🏁 Session ended for ${chalk.bold.white(projectName)}`));
    console.log(divider);
    console.log(`⏱️  Active coding time: ${chalk.bold.green(fmtDecimal(activeMinutes))}`);
    console.log(`📝 LOC delta:          ${locDelta >= 0 ? chalk.bold.green('+' + locDelta + ' lines') : chalk.bold.red(locDelta + ' lines')}`);
    console.log(`💾 Timeout used:       ${chalk.bold.white(timeoutUsedPct + '%')} ${chalk.gray(`(${fmtDecimal(activeMinutes)} / ${projectData.timeoutHours}h)`)}`);
    console.log(divider);
    console.log(chalk.green('✅ Saved. Great work! 🔥\n'));
    return;
  }

  const projectName = store.activeProject;
  const sessionId = store.activeSessionId;

  let finalActiveMs = 0;
  let resolvedPath = store.activeProjectPath || process.cwd();
  if (active) {
    finalActiveMs = active.activeMs;
    if (!active.isPaused) finalActiveMs += Date.now() - active.lastResumeTime;
    resolvedPath = active.projectPath;
    active.watcher.stop();
    active = null;
  } else {
    const sess = store.projects[projectName]?.sessions.find(s => s.id === sessionId);
    if (sess) finalActiveMs = sess.activeMinutes * 60000;
  }

  const projectData = store.projects[projectName];
  const session = projectData?.sessions.find(s => s.id === sessionId);

  if (!session) {
    console.log(chalk.red('✗ Session data not found.'));
    return;
  }

  const locEnd = await getLocCount(resolvedPath);
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
  delete store.activeProjectPath;
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
