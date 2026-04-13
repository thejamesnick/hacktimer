import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock store and tracker before importing report
vi.mock('../store.js', () => ({
  loadStore: vi.fn(),
}));

vi.mock('../tracker.js', () => ({
  fmtDecimal: (mins: number) => (mins / 60).toFixed(1) + 'h',
}));

import { loadStore } from '../store.js';
import { showReport } from '../report.js';

const mockLoadStore = vi.mocked(loadStore);

const TODAY = new Date().toISOString().slice(0, 10);

const baseSession = {
  id: 'sess_1',
  start: `${TODAY}T09:00:00Z`,
  end: `${TODAY}T17:00:00Z`,
  activeMinutes: 240,
  locStart: 100,
  locEnd: 300,
  date: TODAY,
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('showReport', () => {
  it('prints no sessions message when store is empty', () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    showReport(undefined, 'day', false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No sessions recorded'));
  });

  it('shows report for a specific project', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': { timeoutHours: 12, sessions: [baseSession] },
      },
    });
    showReport('my-hack', 'day', false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('my-hack'));
  });

  it('shows report for all projects when all=true', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'proj-a': { timeoutHours: 8, sessions: [baseSession] },
        'proj-b': { timeoutHours: 4, sessions: [baseSession] },
      },
    });
    showReport(undefined, 'day', true);
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('proj-a');
    expect(calls).toContain('proj-b');
  });

  it('skips sessions with no end date', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [{ ...baseSession, end: null }],
        },
      },
    });
    showReport('my-hack', 'day', false);
    // Should still render the project header but show 0.0h
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('0.0h');
  });

  it('handles week, month, year periods without throwing', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': { timeoutHours: 12, sessions: [baseSession] },
      },
    });
    expect(() => showReport('my-hack', 'week', false)).not.toThrow();
    expect(() => showReport('my-hack', 'month', false)).not.toThrow();
    expect(() => showReport('my-hack', 'year', false)).not.toThrow();
  });

  it('shows positive LOC delta', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': { timeoutHours: 12, sessions: [baseSession] },
      },
    });
    showReport('my-hack', 'day', false);
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('+200');
  });
});
