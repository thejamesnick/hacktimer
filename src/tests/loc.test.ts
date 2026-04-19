import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getLocCount } from '../loc.js';

const tmpDir = path.join(os.tmpdir(), `hacktimer-loc-test-${Date.now()}`);

function setup() {
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'node_modules', 'some-pkg'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'dist'), { recursive: true });

  fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'const a = 1;\nconst b = 2;\nconst c = 3;\n');       // 3 lines
  fs.writeFileSync(path.join(tmpDir, 'src', 'utils.ts'), 'export function foo() {}\nexport function bar() {}\n'); // 2 lines
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Title\n\nSome text.\n');                                   // 3 lines

  // These should be ignored
  fs.writeFileSync(path.join(tmpDir, 'node_modules', 'some-pkg', 'index.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(tmpDir, 'dist', 'index.js'), 'var a=1;\n');
}

setup();

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getLocCount', () => {
  it('counts lines in code files, ignoring node_modules and dist', async () => {
    const count = await getLocCount(tmpDir);
    // Each file has a trailing newline so split('\n') adds an extra empty element per file
    // index.ts: 4, utils.ts: 3, README.md: 4 = 11
    expect(count).toBe(11);
  });

  it('returns a number', async () => {
    const count = await getLocCount(tmpDir);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  it('returns 0 for empty directory', async () => {
    const emptyDir = path.join(os.tmpdir(), `hacktimer-empty-${Date.now()}`);
    fs.mkdirSync(emptyDir, { recursive: true });
    const count = await getLocCount(emptyDir);
    expect(count).toBe(0);
    fs.rmdirSync(emptyDir);
  });

  it('skips unreadable subdirectories without throwing', async () => {
    // Only run this test on non-root Unix — chmod 000 is a no-op for root
    const isRoot = process.getuid?.() === 0;
    if (process.platform === 'win32' || isRoot) return;

    const baseDir = path.join(os.tmpdir(), `hacktimer-perm-test-${Date.now()}`);
    const readableDir = path.join(baseDir, 'src');
    const lockedDir = path.join(baseDir, 'private');
    fs.mkdirSync(readableDir, { recursive: true });
    fs.mkdirSync(lockedDir, { recursive: true });

    fs.writeFileSync(path.join(readableDir, 'index.ts'), 'const x = 1;\n');  // 1 line
    // Make the subdirectory unreadable
    fs.chmodSync(lockedDir, 0o000);

    try {
      const count = await getLocCount(baseDir);
      // Should count lines in readable src/, skip locked dir silently
      expect(count).toBeGreaterThan(0);
    } finally {
      fs.chmodSync(lockedDir, 0o755);
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
