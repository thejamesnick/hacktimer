#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
import { startTracking, stopTracking } from './tracker.js';
import { showStatus } from './status.js';
import { showReport } from './report.js';
import { listProjects } from './list.js';
import { showLog } from './log.js';

const program = new Command();

program
  .name('hacktimer')
  .description('Tracks only real active coding time per project')
  .version(version)
  .addHelpText('beforeAll', `
⏱️  ${chalk.bold.cyan('HackTimer')} — tracks ${chalk.italic('real')} coding time, not clock time 🔥

${chalk.gray('Auto-pauses on AFK. Logs LOC delta. Tamper-evident. Ships via npx.')}
`)
  .addHelpText('afterAll', `
${chalk.gray('Examples:')}
  ${chalk.cyan('hacktimer start .')}              start tracking current folder
  ${chalk.cyan('hacktimer start ./my-hack -t 4h')} track with 4h timeout
  ${chalk.cyan('hacktimer report --period week')}  see this week's hours
  ${chalk.cyan('hacktimer log my-hack')}           raw session list
`)
  .configureHelp({ helpWidth: 80 });

program
  .command('start <path>')
  .description('Start tracking a project folder')
  .option('-t, --timeout <duration>', 'Timeout e.g. 30m, 2h, 12h (default: 12h)', '12h')
  .action(async (projectPath: string, options: { timeout: string }) => {
    const hours = parseTimeout(options.timeout);
    await startTracking(projectPath, hours);
  });

program
  .command('stop')
  .description('Stop current session and save')
  .action(async () => {
    await stopTracking();
  });

program
  .command('status')
  .description('Show live session state')
  .action(async () => {
    await showStatus();
  });

program
  .command('report [project]')
  .description('Aggregate sessions by period')
  .option('-p, --period <period>', 'day | week | month | year (default: week)', 'week')
  .option('--all', 'Show all projects')
  .action((project: string | undefined, options: { period: string; all: boolean }) => {
    const period = options.period as 'day' | 'week' | 'month' | 'year';
    showReport(project, period, options.all ?? false);
  });

program
  .command('list')
  .description('List all tracked projects')
  .action(listProjects);

program
  .command('log [project]')
  .description('Raw session history')
  .action((project?: string) => {
    showLog(project);
  });

program.parse();

function parseTimeout(raw: string): number {
  const match = raw.match(/^(\d+)(h|m)?$/i);
  if (!match) return 12;
  const val = parseInt(match[1]);
  const unit = (match[2] ?? 'h').toLowerCase();
  return unit === 'm' ? val / 60 : val;
}
