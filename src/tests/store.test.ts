import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// We test store logic by pointing it at a temp dir
const tmpDir = path.join(os.tmpdir(), `hacktimer-test-${Date.now()}`);

// Patch homedir before importing store
process.env.HOME = tmpDir;
process.env.USERPROFILE = tmpDir; // Windows compat

// Dynamic import after env patch
const { loadStore, saveStore } = await import('../store.js');

describe('store', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.hacktimer'), { recursive: true });
  });

  afterEach(() => {
    const storePath = path.join(tmpDir, '.hacktimer', 'sessions.json');
    const saltPath = path.join(tmpDir, '.hacktimer', '.salt');
    if (fs.existsSync(storePath)) fs.chmodSync(storePath, 0o644);
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
    if (fs.existsSync(saltPath)) fs.unlinkSync(saltPath);
  });

  it('returns empty store when no file exists', () => {
    const store = loadStore();
    expect(store.projects).toEqual({});
    expect(store.activeProject).toBeUndefined();
  });

  it('saves and loads a store with integrity intact', () => {
    const store = loadStore();
    store.projects['test-project'] = {
      timeoutHours: 12,
      sessions: [
        {
          id: 'sess_1',
          start: '2026-04-13T10:00:00Z',
          end: '2026-04-13T16:00:00Z',
          activeMinutes: 360,
          locStart: 100,
          locEnd: 500,
          date: '2026-04-13',
        },
      ],
    };
    store.activeProject = 'test-project';
    saveStore(store);

    const loaded = loadStore();
    expect(loaded.projects['test-project']).toBeDefined();
    expect(loaded.projects['test-project'].sessions).toHaveLength(1);
    expect(loaded.projects['test-project'].sessions[0].activeMinutes).toBe(360);
    expect(loaded.activeProject).toBe('test-project');
  });

  it('detects tampered file and returns empty store', () => {
    const store = loadStore();
    store.projects['hack'] = { timeoutHours: 12, sessions: [] };
    saveStore(store);

    // Tamper with the file
    const storePath = path.join(tmpDir, '.hacktimer', 'sessions.json');
    fs.chmodSync(storePath, 0o644);
    const raw = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    raw._integrity = 'tampered-hash';
    fs.writeFileSync(storePath, JSON.stringify(raw));

    const loaded = loadStore();
    expect(loaded.projects).toEqual({});
  });

  it('file is read-only after save', () => {
    const store = loadStore();
    saveStore(store);

    const storePath = path.join(tmpDir, '.hacktimer', 'sessions.json');
    const stat = fs.statSync(storePath);
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o444);
  });
});
