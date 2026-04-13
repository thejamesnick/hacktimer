import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../store.js', () => ({
  loadStore: vi.fn(),
}));

vi.mock('../tracker.js', () => ({
  fmtDecimal: (mins: number) => (mins / 60).toFixed(1) + 'h',
}));

import { loadStore } from '../store.js';
import { listProjects } from '../list.js';

const mockLoadStore = vi.mocked(loadStore);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listProjects', () => {
  it('prints no projects message when store is empty', () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    listProjects();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No projects tracked'));
  });

  it('lists all tracked projects', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'proj-a': { timeoutHours: 8, sessions: [] },
        'proj-b': { timeoutHours: 4, sessions: [] },
      },
    });
    listProjects();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('proj-a');
    expect(calls).toContain('proj-b');
  });

  it('sums only completed sessions for total time', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            { id: 's1', start: '', end: '2026-04-13T10:00:00Z', activeMinutes: 120, locStart: 0, locEnd: 0, date: '2026-04-13' },
            { id: 's2', start: '', end: null, activeMinutes: 999, locStart: 0, locEnd: null, date: '2026-04-13' }, // active — should be excluded
          ],
        },
      },
    });
    listProjects();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    // 120 mins = 2.0h, not 999
    expect(calls).toContain('2.0h');
  });

  it('marks the active project', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': { timeoutHours: 12, sessions: [] },
      },
      activeProject: 'my-hack',
    });
    listProjects();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('active');
  });
});
