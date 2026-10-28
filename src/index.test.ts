import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { create } from './index.js';

const createOptions = {
  mode: 'create' as const,
  theme: '@vited/theme-mantine' as const,
  packageManager: 'pnpm' as const,
  install: false,
};

let temporaryDirectory: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'vited-create-test-'));
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('create', () => {
  it('creates a project with Vited dependencies, scripts, config, and docs', async () => {
    const projectPath = path.join(temporaryDirectory, 'new-site');

    await create({ ...createOptions, directory: projectPath });

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8'));
    expect(packageJson.scripts).toMatchObject({
      'docs:dev': 'vited dev',
      'docs:build': 'vited build',
    });
    expect(packageJson.devDependencies).toMatchObject({
      '@vited/cli': '^0.1.0',
      '@vited/core': '^0.1.0',
      '@vited/theme-mantine': '^0.1.0',
    });
    expect(await readFile(path.join(projectPath, 'vited.config.ts'), 'utf8')).toContain(
      'theme: "@vited/theme-mantine"',
    );
    expect(await readFile(path.join(projectPath, 'docs/README.md'), 'utf8')).toContain(
      '# new-site',
    );
    expect(existsSync(path.join(projectPath, 'index.html'))).toBe(false);
  });

  it('adds Vited setup to an existing project without replacing its files or scripts', async () => {
    const projectPath = path.join(temporaryDirectory, 'existing-site');
    await mkdir(path.join(projectPath, 'docs'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'existing-site',
        scripts: { test: 'vitest run', 'docs:dev': 'custom dev' },
        dependencies: { react: '^19.0.0' },
      }),
    );
    await writeFile(path.join(projectPath, 'docs/README.md'), '# Existing docs\n');

    await create({
      ...createOptions,
      mode: 'init',
      directory: projectPath,
    });

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8'));
    expect(packageJson.scripts).toMatchObject({
      test: 'vitest run',
      'docs:dev': 'custom dev',
      'docs:build': 'vited build',
    });
    expect(packageJson.dependencies.react).toBe('^19.0.0');
    expect(packageJson.devDependencies['@vited/core']).toBe('^0.1.0');
    expect(await readFile(path.join(projectPath, 'docs/README.md'), 'utf8')).toBe(
      '# Existing docs\n',
    );
    expect(existsSync(path.join(projectPath, 'index.html'))).toBe(false);
  });

  it('rejects a non-empty directory when creating a new project', async () => {
    const projectPath = path.join(temporaryDirectory, 'occupied');
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, 'notes.txt'), 'keep');

    await expect(create({ ...createOptions, directory: projectPath })).rejects.toThrow(
      'Use --init to initialize an existing project.',
    );
  });

  it('does not overwrite an existing Vited config', async () => {
    const projectPath = path.join(temporaryDirectory, 'already-vited');
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, 'vited.config.ts'), '// keep');

    await expect(
      create({ ...createOptions, mode: 'init', directory: projectPath }),
    ).rejects.toThrow('Remove or rename vited.config.ts');
    await expect(readFile(path.join(projectPath, 'vited.config.ts'), 'utf8')).resolves.toBe(
      '// keep',
    );
  });
});
