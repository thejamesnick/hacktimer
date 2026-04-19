#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
import { startTracking, pauseTracking, endTracking } from './tracker.js';
import { showStatus } from './status.js';
import { showReport } from './report.js';
import { listProjects } from './list.js';
import { showLog } from './log.js';

const PID_PATH = path.join(os.homedir(), '.hacktimer', 'daemon.pid');

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
  ${chalk.cyan('hacktimer start .')}               start or resume tracking current folder
  ${chalk.cyan('hacktimer start . --daemon')}       run in background, close terminal freely
  ${chalk.cyan('hacktimer start ./my-hack -t 4h')}  track with 4h timeout
  ${chalk.cyan('hacktimer stop')}                   pause session — resume anytime with start
  ${chalk.cyan('hacktimer end')}                    end session forever + final summary
  ${chalk.cyan('hacktimer status')}                 check live session from any terminal
  ${chalk.cyan('hacktimer report --period week')}   see this week's hours
  ${chalk.cyan('hacktimer log my-hack')}            raw session list

${chalk.gray('Sessions persist across restarts. stop = pause. end = done forever.')}
`)
  .configureHelp({ helpWidth: 80 });

program
  .command('start <path>')
  .description('Start tracking a project folder')
  .option('-t, --timeout <duration>', 'Timeout e.g. 30m, 2h, 12h (default: 12h)', '12h')
  .option('-i, --inactivity <duration>', 'Inactivity pause threshold e.g. 5m, 10m (default: 10m)', '10m')
  .option('-d, --daemon', 'Run in background — detaches from terminal')
  .action(async (projectPath: string, options: { timeout: string; inactivity: string; daemon: boolean }) => {
    const hours = parseTimeout(options.timeout);
    const inactivityMs = parseInactivity(options.inactivity);

    if (options.daemon) {
      // Spawn a detached child of ourselves without --daemon flag
      const child = spawn(process.execPath, [process.argv[1], 'start', projectPath, '-t', options.timeout, '-i', options.inactivity], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      // Save PID so stop can kill it
      fs.mkdirSync(path.dirname(PID_PATH), { recursive: true });
      fs.writeFileSync(PID_PATH, String(child.pid));

      console.log(chalk.green(`\n✅ HackTimer running as daemon (PID ${child.pid})`));
      console.log(chalk.gray(`   Run ${chalk.cyan('hacktimer stop')} from any terminal to end the session.\n`));
      process.exit(0);
    }

    await startTracking(projectPath, hours, inactivityMs);
  });

program
  .command('stop')
  .description('Pause session — resume anytime with hacktimer start')
  .action(async () => {
    if (fs.existsSync(PID_PATH)) {
      const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim());
      try { process.kill(pid, 'SIGTERM'); } catch {}
      fs.unlinkSync(PID_PATH);
    }
    await pauseTracking();
  });

program
  .command('end')
  .description('End session forever — writes final summary')
  .action(async () => {
    if (fs.existsSync(PID_PATH)) {
      const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim());
      try { process.kill(pid, 'SIGTERM'); } catch {}
      fs.unlinkSync(PID_PATH);
    }
    await endTracking();
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
  if (!match) {
    console.error(chalk.red(`✗ Invalid timeout format: "${raw}". Use e.g. 30m, 2h, 12h`));
    process.exit(1);
  }
  const val = parseInt(match[1]);
  if (val <= 0) {
    console.error(chalk.red(`✗ Timeout must be greater than 0. Got: "${raw}"`));
    process.exit(1);
  }
  const unit = (match[2] ?? 'h').toLowerCase();
  return unit === 'm' ? val / 60 : val;
}

function parseInactivity(raw: string): number {
  const match = raw.match(/^(\d+)(h|m)?$/i);
  if (!match) {
    console.error(chalk.red(`✗ Invalid inactivity format: "${raw}". Use e.g. 5m, 10m, 1h`));
    process.exit(1);
  }
  const val = parseInt(match[1]);
  if (val <= 0) {
    console.error(chalk.red(`✗ Inactivity must be greater than 0. Got: "${raw}"`));
    process.exit(1);
  }
  const unit = (match[2] ?? 'm').toLowerCase();
  const minutes = unit === 'h' ? val * 60 : val;
  return minutes * 60 * 1000;
}
