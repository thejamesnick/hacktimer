import chalk from 'chalk';
import { loadStore } from './store.js';

export function showLog(projectName?: string) {
  const store = loadStore();

  const names = projectName
    ? [projectName]
    : Object.keys(store.projects);

  if (names.length === 0) {
    console.log(chalk.gray('No sessions recorded yet.'));
    return;
  }

  for (const name of names) {
    const data = store.projects[name];
    if (!data) {
      console.log(chalk.red(`✗ Project "${name}" not found.`));
      continue;
    }

    const done = data.sessions.filter(s => s.end);

    console.log(chalk.cyan(`\n📋 Sessions for ${chalk.bold(name)}`));
    console.log(chalk.gray('─'.repeat(45)));

    if (done.length === 0) {
      console.log(chalk.gray('  No completed sessions yet.'));
    } else {
      for (const s of done) {
        const h = Math.floor(s.activeMinutes / 60);
        const m = s.activeMinutes % 60;
        const loc = (s.locEnd ?? s.locStart) - s.locStart;
        const locStr = loc >= 0 ? chalk.green(`+${loc} LOC`) : chalk.red(`${loc} LOC`);
        console.log(chalk.white(`${s.id}  ${s.date}  ${h}h ${m}m  ${locStr}`));
      }
    }

    console.log();
  }
}
