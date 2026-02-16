import { execSync } from 'node:child_process';

const DEV_PORT = Number.parseInt(process.env.DEV_PORT ?? '43173', 10);

const run = (command) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

const uniqueNumbers = (values) => [
  ...new Set(
    values.map((value) => Number.parseInt(value, 10)).filter(Number.isFinite),
  ),
];

const findPidsForPort = (port) => {
  if (process.platform === 'win32') {
    const output = run(`netstat -ano -p tcp | findstr :${port}`);
    if (!output) return [];
    const pids = output
      .split(/\r?\n/)
      .filter((line) => line.includes('LISTENING'))
      .map((line) => line.trim().split(/\s+/).at(-1) ?? '');
    return uniqueNumbers(pids);
  }

  const output = run(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`);
  if (!output) return [];
  return uniqueNumbers(output.split(/\r?\n/));
};

const terminatePid = (pid) => {
  if (pid === process.pid || pid === process.ppid) return;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }

  const start = Date.now();
  while (Date.now() - start < 2000) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // no-op
  }
};

const pids = findPidsForPort(DEV_PORT);

if (pids.length === 0) {
  console.info(`[dev-port] ${DEV_PORT} is free`);
  process.exit(0);
}

console.warn(
  `[dev-port] ${DEV_PORT} is occupied by PID(s): ${pids.join(', ')}`,
);

for (const pid of pids) {
  terminatePid(pid);
}

const remaining = findPidsForPort(DEV_PORT);

if (remaining.length > 0) {
  console.error(
    `[dev-port] failed to release ${DEV_PORT}, remaining PID(s): ${remaining.join(', ')}`,
  );
  process.exit(1);
}

console.info(`[dev-port] released ${DEV_PORT}`);
