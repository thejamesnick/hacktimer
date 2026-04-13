import chalk from 'chalk';
import { loadStore } from './store.js';

export function listProjects() {
  const store = loadStore();
  const names = Object.keys(store.projects);

  if (names.length === 0) {
    console.log(chalk.gray('No projects tracked yet.'));
    return;
  }

  console.log(chalk.cyan('\n📁 Tracked Projects'));
  console.log(chalk.gray('─'.repeat(45)));

  for (const name of names) {
    const data = store.projects[name];
    const totalMins = data.sessions.filter(s => s.end).reduce((a, s) => a + s.activeMinutes, 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const active = store.activeProject === name ? chalk.green(' ▶ active') : '';
    console.log(chalk.white(`${name.padEnd(20)} ${h}h ${m}m total | ${data.timeoutHours}h timeout${active}`));
  }

  console.log();
}
