import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../store.js', () => ({
  loadStore: vi.fn(),
}));

vi.mock('../loc.js', () => ({
  getLocCount: vi.fn().mockResolvedValue(200),
}));

import { loadStore } from '../store.js';
import { showStatus } from '../status.js';

const mockLoadStore = vi.mocked(loadStore);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('showStatus', () => {
  it('prints no active session when store has none', async () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    await showStatus();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No active session'));
  });

  it('prints no active session when activeProject is missing', async () => {
    mockLoadStore.mockReturnValue({
      projects: { 'my-hack': { timeoutHours: 12, sessions: [] } },
    });
    await showStatus();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No active session'));
  });

  it('prints session data missing when session id not found', async () => {
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': { timeoutHours: 12, sessions: [] },
      },
      activeProject: 'my-hack',
      activeSessionId: 'sess_ghost',
    });
    await showStatus();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('Session data missing');
  });

  it('shows active session info with project name and time', async () => {
    const start = new Date(Date.now() - 90 * 60 * 1000).toISOString(); // 90 mins ago
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            { id: 'sess_1', start, end: null, activeMinutes: 0, locStart: 150, locEnd: null, date: '2026-04-13' },
          ],
        },
      },
      activeProject: 'my-hack',
      activeSessionId: 'sess_1',
    });
    await showStatus();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('my-hack');
    expect(calls).toContain('Remaining');
  });

  it('shows LOC delta from getLocCount', async () => {
    const { getLocCount } = await import('../loc.js');
    vi.mocked(getLocCount).mockResolvedValue(300); // locStart=150, so delta=+150

    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    mockLoadStore.mockReturnValue({
      projects: {
        'my-hack': {
          timeoutHours: 12,
          sessions: [
            { id: 'sess_1', start, end: null, activeMinutes: 0, locStart: 150, locEnd: null, date: '2026-04-13' },
          ],
        },
      },
      activeProject: 'my-hack',
      activeSessionId: 'sess_1',
    });
    await showStatus();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('+150');
  });
});
