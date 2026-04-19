import chalk from 'chalk';
import { loadStore } from './store.js';
import { getLocCount } from './loc.js';
import path from 'path';

export async function showStatus() {
  const store = loadStore();

  if (!store.activeProject || !store.activeSessionId) {
    console.log(chalk.gray('📭 No active session.'));
    console.log(chalk.gray('   Run: hacktimer start <path>'));
    return;
  }

  const projectName = store.activeProject;
  const projectData = store.projects[projectName];
  const session = projectData?.sessions.find(s => s.id === store.activeSessionId);

  if (!session) {
    console.log(chalk.red('✗ Session data missing.'));
    return;
  }

  // Use persisted activeMinutes (updated every 2 min by the running process) for accuracy
  const activeMins = session.activeMinutes;
  const h = Math.floor(activeMins / 60);
  const m = activeMins % 60;

  const timeoutHours = projectData.timeoutHours;
  // Remaining is wall-clock based — the timeout timer fires in real time
  const startTime = new Date(session.start).getTime();
  const elapsedMs = Date.now() - startTime;
  const remainingMs = timeoutHours * 3600000 - elapsedMs;
  const remainingMins = Math.max(0, Math.floor(remainingMs / 60000));
  const rh = Math.floor(remainingMins / 60);
  const rm = remainingMins % 60;

  // Best-effort LOC delta — use saved project path so this works from any terminal
  const projectPath = store.activeProjectPath || process.cwd();
  let locLine = '';
  try {
    const locNow = await getLocCount(projectPath);
    const delta = locNow - session.locStart;
    locLine = `📝 LOC so far: ~${delta >= 0 ? chalk.green('+' + delta) : chalk.red(delta)} lines`;
  } catch {
    locLine = `📝 LOC at start: ${session.locStart}`;
  }

  const divider = chalk.gray('─'.repeat(40));
  console.log(chalk.cyan(`\n▶️  Tracking: ${chalk.bold.white(projectName)}`));
  console.log(divider);
  console.log(`⏱️  Active time: ${chalk.bold.green(`${h}h ${m}m`)}`);
  console.log(chalk.white(locLine));
  console.log(`⏳ Remaining:   ${chalk.bold.yellow(`${rh}h ${rm}m`)}`);
  console.log(divider + '\n');
}
