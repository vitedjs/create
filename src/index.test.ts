import { spawn } from 'node:child_process';
import console from 'node:console';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadTemplate, installPackages } from './index.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const log = vi.spyOn(console, 'log').mockImplementation(() => {});

function createChildProcess() {
  let closeListener: ((code: number | null) => void) | undefined;
  const child = {
    on: vi.fn((_event: string, listener: (code: number | null) => void) => {
      closeListener = listener;
      return child;
    }),
    emitClose(code: number) {
      closeListener?.(code);
    },
  };
  vi.mocked(spawn).mockReturnValue(child as never);
  return child;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('downloadTemplate', () => {
  it('runs npm install in the project directory', async () => {
    const child = createChildProcess();
    const result = downloadTemplate('@vited/template-react', '/tmp/project', 'npm');

    expect(spawn).toHaveBeenCalledWith('npm install @vited/template-react', {
      cwd: '/tmp/project',
      shell: true,
      stdio: 'inherit',
    });
    expect(log).toHaveBeenCalledOnce();

    child.emitClose(0);
    await expect(result).resolves.toBeUndefined();
  });

  it('rejects when the install command fails', async () => {
    const child = createChildProcess();
    const result = downloadTemplate('@vited/template-react', '/tmp/project', 'npm');

    child.emitClose(1);
    await expect(result).rejects.toBeUndefined();
  });
});

describe('installPackages', () => {
  it('runs npm install in the project directory', async () => {
    const child = createChildProcess();
    const result = installPackages('/tmp/project', 'npm');

    expect(spawn).toHaveBeenCalledWith('npm install', {
      cwd: '/tmp/project',
      shell: true,
      stdio: 'inherit',
    });

    child.emitClose(0);
    await expect(result).resolves.toBeUndefined();
  });
});
