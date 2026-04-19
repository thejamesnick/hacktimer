import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fmtDecimal, pauseTracking, endTracking } from '../tracker.js';

describe('fmtDecimal', () => {
  it('formats 0 minutes as 0.0h', () => {
    expect(fmtDecimal(0)).toBe('0.0h');
  });

  it('formats 60 minutes as 1.0h', () => {
    expect(fmtDecimal(60)).toBe('1.0h');
  });

  it('formats 408 minutes as 6.8h', () => {
    expect(fmtDecimal(408)).toBe('6.8h');
  });

  it('formats 90 minutes as 1.5h', () => {
    expect(fmtDecimal(90)).toBe('1.5h');
  });

  it('formats 720 minutes as 12.0h', () => {
    expect(fmtDecimal(720)).toBe('12.0h');
  });
});

vi.mock('../store.js', () => ({ loadStore: vi.fn(), saveStore: vi.fn() }));
vi.mock('../loc.js', () => ({ getLocCount: vi.fn().mockResolvedValue(200) }));

import { loadStore, saveStore } from '../store.js';
const mockLoadStore = vi.mocked(loadStore);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const openSession = {
  id: 'sess_1',
  start: '2026-04-13T09:00:00Z',
  end: null,
  activeMinutes: 45,
  locStart: 100,
  locEnd: null,
  date: '2026-04-13',
};

const storeWithSession = {
  projects: {
    'heliushack': { timeoutHours: 12, sessions: [openSession] },
  },
  activeProject: 'heliushack',
  activeSessionId: 'sess_1',
  activeProjectPath: '/tmp/heliushack',
};

describe('pauseTracking — daemon was killed (active is null)', () => {
  it('reads activeMinutes from store and shows summary', async () => {
    mockLoadStore.mockReturnValue(structuredClone(storeWithSession));
    await pauseTracking();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('0.8h');
    expect(calls).toContain('Paused');
  });

  it('shows 0.0h if store has no persisted time', async () => {
    mockLoadStore.mockReturnValue(structuredClone({
      ...storeWithSession,
      projects: { 'heliushack': { timeoutHours: 12, sessions: [{ ...openSession, activeMinutes: 0 }] } },
    }));
    await pauseTracking();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('0.0h');
  });

  it('warns when no active session', async () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    await pauseTracking();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('No active session');
  });
});

describe('endTracking — daemon was killed (active is null)', () => {
  it('reads activeMinutes from store, computes LOC delta, shows final summary', async () => {
    mockLoadStore.mockReturnValue(structuredClone(storeWithSession));
    await endTracking();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('Session ended');
    expect(calls).toContain('0.8h');
    expect(calls).toContain('LOC delta');
  });

  it('warns when no active or paused session', async () => {
    mockLoadStore.mockReturnValue({ projects: {} });
    await endTracking();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('No active or paused session');
  });
});
