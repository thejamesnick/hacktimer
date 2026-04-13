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
});
