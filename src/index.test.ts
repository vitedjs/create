import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setLanguage } from './i18n.js';
import { create, installPackages, resolvePackageManager } from './index.js';

const createOptions = {
  theme: '@vited/theme-mantine' as const,
  packageManager: 'pnpm' as const,
  install: false,
};

let temporaryDirectory: string;

beforeEach(async () => {
  await setLanguage('en');
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'vited-create-test-'));
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('create', () => {
  it('creates a project with Vited dependencies, scripts, config, and docs', async () => {
    const projectPath = path.join(temporaryDirectory, 'new-site');

    const result = await create({ ...createOptions, directory: projectPath });

    expect(result.mode).toBe('create');
    expect(result.configPath).toBe(path.join(projectPath, 'vited.config.ts'));
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

    const result = await create({ ...createOptions, directory: projectPath });

    expect(result.mode).toBe('init');
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

  it('initializes an existing non-empty directory automatically', async () => {
    const projectPath = path.join(temporaryDirectory, 'occupied');
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, 'notes.txt'), 'keep');

    const result = await create({ ...createOptions, directory: projectPath });

    expect(result.mode).toBe('init');
    expect(await readFile(path.join(projectPath, 'notes.txt'), 'utf8')).toBe('keep');
    await readFile(path.join(projectPath, 'vited.config.ts'), 'utf8');
  });

  it('writes a comparison config when a Vited config already exists', async () => {
    const projectPath = path.join(temporaryDirectory, 'already-vited');
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, 'vited.config.ts'), '// keep');

    const result = await create({ ...createOptions, directory: projectPath });

    expect(result.configPath).toBe(path.join(projectPath, 'vited-new.config.ts'));
    await expect(readFile(path.join(projectPath, 'vited.config.ts'), 'utf8')).resolves.toBe(
      '// keep',
    );
    await expect(readFile(result.configPath, 'utf8')).resolves.toContain(
      'import { defineConfig } from',
    );
  });

  it('overwrites an existing comparison config while preserving the original', async () => {
    const projectPath = path.join(temporaryDirectory, 'already-vited');
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, 'vited.config.ts'), '// keep');
    await writeFile(path.join(projectPath, 'vited-new.config.ts'), '// compare');

    await create({ ...createOptions, directory: projectPath });

    expect(existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    await expect(readFile(path.join(projectPath, 'vited.config.ts'), 'utf8')).resolves.toBe(
      '// keep',
    );
    await expect(
      readFile(path.join(projectPath, 'vited-new.config.ts'), 'utf8'),
    ).resolves.toContain('import { defineConfig } from');
  });
});

describe('resolvePackageManager', () => {
  it('prefers the project packageManager field over the invoking package manager', async () => {
    await writeFile(
      path.join(temporaryDirectory, 'package.json'),
      JSON.stringify({ packageManager: 'yarn@4.1.0' }),
    );

    await expect(
      resolvePackageManager(temporaryDirectory, {
        npm_config_user_agent: 'pnpm/10.0.0 node/v22.0.0',
      }),
    ).resolves.toBe('yarn');
  });

  it('detects the package manager from the invoking command', async () => {
    await expect(
      resolvePackageManager(temporaryDirectory, {
        npm_config_user_agent: 'bun/1.2.0 npm/? node/v22.0.0',
      }),
    ).resolves.toBe('bun');
  });

  it('detects the package manager from a project lockfile', async () => {
    await writeFile(path.join(temporaryDirectory, 'yarn.lock'), '');

    await expect(resolvePackageManager(temporaryDirectory, {})).resolves.toBe('yarn');
  });
});

describe('installPackages', () => {
  it('approves required pnpm build scripts before installing dependencies', async () => {
    await writeFile(
      path.join(temporaryDirectory, 'package.json'),
      JSON.stringify({ name: 'pnpm-build-policy-test' }),
    );

    await installPackages(temporaryDirectory, 'pnpm');

    const workspaceConfig = await readFile(
      path.join(temporaryDirectory, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(workspaceConfig).toContain("'@swc/core': true");
    expect(workspaceConfig).toContain('esbuild: true');
  });
});
