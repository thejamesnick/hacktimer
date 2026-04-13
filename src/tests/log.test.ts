import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../store.js', () => ({
  loadStore: vi.fn(),
}));

import { loadStore } from '../store.js';
import { showLog } from '../log.js';

const mockLoadStore = vi.mocked(loadStore);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('showLog', () => {
  it('prints no sessions message when store is empty', () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    showLog();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No sessions recorded'));
  });

  it('shows error for unknown project', () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    showLog('ghost-project');
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('not found');
  });

  it('shows no completed sessions message when all sessions are active', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            { id: 's1', start: '2026-04-13T09:00:00Z', end: null, activeMinutes: 0, locStart: 100, locEnd: null, date: '2026-04-13' },
          ],
        },
      },
    });
    showLog('my-hack');
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('No completed sessions');
  });

  it('displays completed sessions with id, date, time and LOC', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            {
              id: 'sess_abc',
              start: '2026-04-13T09:00:00Z',
              end: '2026-04-13T17:00:00Z',
              activeMinutes: 90,
              locStart: 100,
              locEnd: 250,
              date: '2026-04-13',
            },
          ],
        },
      },
    });
    showLog('my-hack');
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('sess_abc');
    expect(calls).toContain('2026-04-13');
    expect(calls).toContain('1h 30m');
    expect(calls).toContain('+150 LOC');
  });

  it('shows negative LOC when lines were deleted', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            {
              id: 'sess_del',
              start: '2026-04-13T09:00:00Z',
              end: '2026-04-13T10:00:00Z',
              activeMinutes: 60,
              locStart: 500,
              locEnd: 300,
              date: '2026-04-13',
            },
          ],
        },
      },
    });
    showLog('my-hack');
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('-200 LOC');
  });

  it('logs all projects when no name given', () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'proj-a': { timeoutHours: 8, sessions: [] },
        'proj-b': { timeoutHours: 4, sessions: [] },
      },
    });
    showLog();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('proj-a');
    expect(calls).toContain('proj-b');
  });
});
