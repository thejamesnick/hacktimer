import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface Session {
  id: string;
  start: string;
  end: string | null;
  activeMinutes: number;
  locStart: number;
  locEnd: number | null;
  date: string;
}

export interface ProjectData {
  timeoutHours: number;
  sessions: Session[];
}

export interface Store {
  projects: Record<string, ProjectData>;
  activeProject?: string;
  activeSessionId?: string;
  activeSessionStart?: string;
  _integrity?: string;
}

const STORE_DIR = path.join(os.homedir(), '.hacktimer');
const STORE_PATH = path.join(STORE_DIR, 'sessions.json');
const SALT_PATH = path.join(STORE_DIR, '.salt');

function getSalt(): string {
  if (fs.existsSync(SALT_PATH)) {
    return fs.readFileSync(SALT_PATH, 'utf8').trim();
  }
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const salt = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SALT_PATH, salt, { mode: 0o600 });
  return salt;
}

function computeHmac(data: object, salt: string): string {
  const hmac = crypto.createHmac('sha256', salt);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
}

export function loadStore(): Store {
  if (!fs.existsSync(STORE_PATH)) {
    return { projects: {} };
  }

  try {
    // Make writable temporarily to read (chmod 444 means we can still read)
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const data: Store = JSON.parse(raw);
    const storedHash = data._integrity;
    delete data._integrity;

    const salt = getSalt();
    const expected = computeHmac(data, salt);

    if (storedHash !== expected) {
      console.error('⚠️  WARNING: Log file appears tampered with! Resetting affected data.');
      return { projects: {} };
    }

    return data;
  } catch {
    console.error('⚠️  Log file corrupted — starting fresh.');
    return { projects: {} };
  }
}

export function saveStore(store: Store): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });

  // Make writable if it exists
  if (fs.existsSync(STORE_PATH)) {
    fs.chmodSync(STORE_PATH, 0o644);
  }

  const salt = getSalt();
  const dataToHash = { ...store };
  delete dataToHash._integrity;

  const integrity = computeHmac(dataToHash, salt);
  const toWrite: Store = { ...dataToHash, _integrity: integrity };

  fs.writeFileSync(STORE_PATH, JSON.stringify(toWrite, null, 2));
  fs.chmodSync(STORE_PATH, 0o444); // read-only after write
}
