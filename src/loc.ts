import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h',
  '.rb', '.php', '.swift', '.kt', '.cs', '.sh',
  '.json', '.yaml', '.yml', '.toml', '.md'
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  'target', '__pycache__', '.venv', 'vendor'
]);

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // Skip directories we can't read (permission denied, broken symlinks, etc.)
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        yield* walkFiles(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) {
        yield path.join(dir, entry.name);
      }
    }
  }
}

export async function getLocCount(projectPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync('git ls-files', { cwd: projectPath });
    const files = stdout.trim().split('\n').filter(Boolean);
    if (files.length === 0) throw new Error('no files');

    let total = 0;
    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      const ext = path.extname(file).toLowerCase();
      if (CODE_EXTENSIONS.has(ext) && fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        total += content.split('\n').length;
      }
    }
    return total;
  } catch {
    // Fallback: walk files manually
    let total = 0;
    for await (const file of walkFiles(projectPath)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        total += content.split('\n').length;
      } catch {
        // skip unreadable files
      }
    }
    return total;
  }
}
