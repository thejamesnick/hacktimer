import chokidar, { FSWatcher } from 'chokidar';

const DEFAULT_INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

export interface WatcherHandle {
  stop: () => void;
}

export function startWatcher(
  projectPath: string,
  onActive: () => void,
  onIdle: () => void,
  inactivityMs: number = DEFAULT_INACTIVITY_MS
): WatcherHandle {
  const watcher: FSWatcher = chokidar.watch(projectPath, {
    ignored: /(^|[/\\])(\.|node_modules|dist|build|target|__pycache__)/,
    persistent: true,
    ignoreInitial: true,
  });

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isIdle = false;

  function resetTimer() {
    if (timeoutId) clearTimeout(timeoutId);
    if (isIdle) {
      isIdle = false;
      onActive();
    }
    timeoutId = setTimeout(() => {
      isIdle = true;
      onIdle();
    }, inactivityMs);
  }

  watcher.on('all', (event) => {
    if (['add', 'change', 'unlink'].includes(event)) {
      resetTimer();
    }
  });

  // Start the idle timer immediately
  resetTimer();

  return {
    stop: () => {
      if (timeoutId) clearTimeout(timeoutId);
      watcher.close();
    },
  };
}
