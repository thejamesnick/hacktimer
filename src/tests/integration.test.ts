/**
 * Integration tests — exercise real multi-step session flows.
 * Store and watcher are mocked so tests run fast and without side effects,
 * but tracker functions are called in sequence to verify the full pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../store.js', () => ({ loadStore: vi.fn(), saveStore: vi.fn() }));
vi.mock('../loc.js', () => ({ getLocCount: vi.fn().mockResolvedValue(250) }));
vi.mock('../watcher.js', () => ({ startWatcher: vi.fn().mockReturnValue({ stop: vi.fn() }) }));

import { loadStore, saveStore } from '../store.js';
import { startTracking, pauseTracking, endTracking } from '../tracker.js';

const mockLoadStore = vi.mocked(loadStore);
const mockSaveStore = vi.mocked(saveStore);

// Use a real temp dir so path.resolve / fs.existsSync works
const tmpProject = path.join(os.tmpdir(), `ht-integration-${Date.now()}`);
fs.mkdirSync(tmpProject, { recursive: true });
const projectName = path.basename(tmpProject);

afterEach(() => {
  vi.restoreAllMocks();
  mockSaveStore.mockReset();
  mockLoadStore.mockReset();
});

// Helper: capture all console.log output as a single string
function capturedLog(fn: ReturnType<typeof vi.fn>): string {
  return fn.mock.calls.flat().join(' ');
}

describe('Integration: start → pause → resume → end', () => {
  it('starts a new session, pauses it, resumes it, then ends it with a final summary', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // ── Step 1: fresh store, start a new session ──────────────────────────
    let store: any = { projects: {} };
    mockLoadStore.mockImplementation(() => structuredClone(store));
    mockSaveStore.mockImplementation((s: any) => { store = structuredClone(s); });

    await startTracking(tmpProject, 4);

    expect(mockSaveStore).toHaveBeenCalled();
    expect(store.projects[projectName]).toBeDefined();
    expect(store.activeProject).toBe(projectName);
    const sessionId = store.activeSessionId;
    expect(sessionId).toBeTruthy();

    let logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('HackTimer started');

    // ── Step 2: pause the session ─────────────────────────────────────────
    (console.log as ReturnType<typeof vi.fn>).mockClear();
    mockLoadStore.mockImplementation(() => structuredClone(store));

    await pauseTracking();

    logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('Paused');
    // activeProject must be cleared after pause
    expect(store.activeProject).toBeUndefined();
    expect(store.activeSessionId).toBeUndefined();
    // Session should still be open (no end date)
    expect(store.projects[projectName].sessions[0].end).toBeNull();

    // ── Step 3: resume the same session ───────────────────────────────────
    (console.log as ReturnType<typeof vi.fn>).mockClear();
    mockLoadStore.mockImplementation(() => structuredClone(store));

    await startTracking(tmpProject, 4);

    logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('Resumed');
    expect(store.activeProject).toBe(projectName);
    expect(store.activeSessionId).toBe(sessionId);

    // ── Step 4: end the active session ───────────────────────────────────
    (console.log as ReturnType<typeof vi.fn>).mockClear();
    mockLoadStore.mockImplementation(() => structuredClone(store));

    await endTracking();

    logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('Session ended');
    expect(logOut).toContain('LOC delta');
    expect(logOut).toContain('Saved');
    // Session must now be closed
    expect(store.projects[projectName].sessions[0].end).toBeTruthy();
    expect(store.activeProject).toBeUndefined();
  });
});

describe('Integration: end a paused session (no active watcher)', () => {
  it('ends a session that was previously paused — activeProject is cleared but session is open', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate the exact state after `hacktimer stop` runs:
    // activeProject is gone, but activeProjectPath is kept and session.end is null
    const pausedStore: any = {
      projects: {
        [projectName]: {
          timeoutHours: 12,
          sessions: [{
            id: 'sess_paused_99',
            start: '2026-04-15T10:00:00Z',
            end: null,
            activeMinutes: 75,
            locStart: 200,
            locEnd: null,
            date: '2026-04-15',
          }],
        },
      },
      // no activeProject / activeSessionId
      activeProjectPath: tmpProject,
    };

    let store = structuredClone(pausedStore);
    mockLoadStore.mockImplementation(() => structuredClone(store));
    mockSaveStore.mockImplementation((s: any) => { store = structuredClone(s); });

    await endTracking();

    const logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('Session ended');
    expect(logOut).toContain('1.3h');   // 75 mins = 1.3h
    expect(logOut).toContain('LOC delta');
    // Session must be closed
    expect(store.projects[projectName].sessions[0].end).toBeTruthy();
    // activeProjectPath must be cleared after end
    expect(store.activeProjectPath).toBeUndefined();
  });

  it('reports no open session if paused store has no open sessions', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockLoadStore.mockReturnValue({
      projects: {
        [projectName]: {
          timeoutHours: 12,
          sessions: [{
            id: 'sess_old',
            start: '2026-04-13T09:00:00Z',
            end: '2026-04-13T17:00:00Z', // already ended
            activeMinutes: 60,
            locStart: 100,
            locEnd: 150,
            date: '2026-04-13',
          }],
        },
      },
      activeProjectPath: tmpProject,
    } as any);

    await endTracking();

    const logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('No open session');
  });

  it('reports no session when neither activeProject nor activeProjectPath exists', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockLoadStore.mockReturnValue({ projects: {} } as any);

    await endTracking();

    const logOut = capturedLog(console.log as ReturnType<typeof vi.fn>);
    expect(logOut).toContain('No active or paused session');
  });
});

describe('Integration: watcher inactivity is configurable', () => {
  it('passes custom inactivityMs through to startWatcher', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const { startWatcher } = await import('../watcher.js');

    let store: any = { projects: {} };
    mockLoadStore.mockImplementation(() => structuredClone(store));
    mockSaveStore.mockImplementation((s: any) => { store = structuredClone(s); });

    const customInactivityMs = 5 * 60 * 1000; // 5 minutes
    await startTracking(tmpProject, 4, customInactivityMs);

    expect(vi.mocked(startWatcher)).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      expect.any(Function),
      customInactivityMs
    );
  });
});
