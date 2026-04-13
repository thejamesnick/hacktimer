import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../store.js', () => ({ loadStore: vi.fn(), saveStore: vi.fn() }));
vi.mock('../loc.js', () => ({ getLocCount: vi.fn().mockResolvedValue(100) }));
vi.mock('../watcher.js', () => ({ startWatcher: vi.fn().mockReturnValue({ stop: vi.fn() }) }));

import { loadStore, saveStore } from '../store.js';
import { startTracking } from '../tracker.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const mockLoadStore = vi.mocked(loadStore);
const mockSaveStore = vi.mocked(saveStore);

const tmpDir = path.join(os.tmpdir(), `hacktimer-resume-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startTracking — resume', () => {
  it('resumes an open session for the same project instead of blocking', async () => {
    const projectName = path.basename(tmpDir);
    mockLoadStore.mockReturnValue({
      projects: {
        [projectName]: {
          timeoutHours: 12,
          sessions: [
            {
              id: 'sess_existing',
              start: '2026-04-13T09:00:00Z',
              end: null,
              activeMinutes: 90,
              locStart: 100,
              locEnd: null,
              date: '2026-04-13',
            },
          ],
        },
      },
      activeProject: projectName,
      activeSessionId: 'sess_existing',
    });

    await startTracking(tmpDir, 12);

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('Resumed');
    expect(calls).toContain('1h 30m');
    expect(mockSaveStore).not.toHaveBeenCalled();
  });

  it('blocks if a different project is already active', async () => {
    mockLoadStore.mockReturnValue({
      projects: {},
      activeProject: 'other-project',
    });

    await startTracking(tmpDir, 12);

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('starts a fresh session when no active session exists', async () => {
    mockLoadStore.mockReturnValue({ projects: {} });

    await startTracking(tmpDir, 12);

    expect(mockSaveStore).toHaveBeenCalled();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(calls).toContain('HackTimer started');
  });
});
