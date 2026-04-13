import chalk from 'chalk';
import { loadStore } from './store.js';

type Period = 'day' | 'week' | 'month' | 'year';

function getDateRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'day') {
    const today = fmt(now);
    return { start: today, end: today, label: 'Today' };
  }
  if (period === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return { start: fmt(monday), end: fmt(now), label: 'This week' };
  }
  if (period === 'month') {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    return { start, end: fmt(now), label: 'This month' };
  }
  // year
  return { start: `${now.getFullYear()}-01-01`, end: fmt(now), label: 'This year' };
}

export function showReport(projectName: string | undefined, period: Period, all: boolean) {
  const store = loadStore();
  const projects = all
    ? Object.keys(store.projects)
    : projectName
    ? [projectName]
    : Object.keys(store.projects);

  if (projects.length === 0) {
    console.log(chalk.gray('No sessions recorded yet.'));
    return;
  }

  const { start, end, label } = getDateRange(period);

  for (const name of projects) {
    const data = store.projects[name];
    if (!data) continue;

    const periodSessions = data.sessions.filter(
      s => s.end && s.date >= start && s.date <= end
    );
    const allSessions = data.sessions.filter(s => s.end);

    const periodMins = periodSessions.reduce((a, s) => a + s.activeMinutes, 0);
    const periodLoc = periodSessions.reduce((a, s) => a + ((s.locEnd ?? s.locStart) - s.locStart), 0);
    const totalMins = allSessions.reduce((a, s) => a + s.activeMinutes, 0);
    const totalLoc = allSessions.reduce((a, s) => a + ((s.locEnd ?? s.locStart) - s.locStart), 0);

    const fmtTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}.${String(Math.round(m / 6)).padStart(1, '0')}h`;
    };

    console.log(chalk.cyan(`\n📊 Report for ${chalk.bold(name)} (timeout: ${data.timeoutHours}h)`));
    console.log(chalk.white(`📅 ${label}: ${fmtTime(periodMins)} | ${periodLoc >= 0 ? '+' : ''}${periodLoc} LOC`));
    console.log(chalk.gray('─'.repeat(45)));

    // Group by date
    const byDate: Record<string, { mins: number; loc: number }> = {};
    for (const s of periodSessions) {
      if (!byDate[s.date]) byDate[s.date] = { mins: 0, loc: 0 };
      byDate[s.date].mins += s.activeMinutes;
      byDate[s.date].loc += (s.locEnd ?? s.locStart) - s.locStart;
    }

    for (const [date, { mins, loc }] of Object.entries(byDate).sort().reverse()) {
      console.log(chalk.white(`${date} : ${fmtTime(mins)} | ${loc >= 0 ? '+' : ''}${loc} LOC`));
    }

    console.log(chalk.gray('─'.repeat(45)));
    console.log(chalk.yellow(`🏆 Total ever: ${fmtTime(totalMins)} | ${totalLoc >= 0 ? '+' : ''}${totalLoc} LOC\n`));
  }
}
