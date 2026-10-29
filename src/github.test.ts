import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { create } from './index.js';

const createOptions = {
  theme: '@vited/theme-mantine' as const,
  packageManager: 'pnpm' as const,
  install: false,
};

let temporaryDirectory: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'vited-github-test-'));
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('GitHub Pages setup', () => {
  it('configures the project base and workflow from package repository metadata', async () => {
    const projectPath = path.join(temporaryDirectory, 'github-docs');
    await mkdir(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'github-docs',
        repository: {
          type: 'git',
          url: 'git+https://github.com/acme/docs-site.git',
        },
      }),
    );

    await create({ ...createOptions, directory: projectPath });

    const config = await readFile(path.join(projectPath, 'vited.config.ts'), 'utf8');
    expect(config).toContain('base: "/docs-site/"');
    expect(config).not.toContain('baseURL');

    const workflow = await readFile(path.join(projectPath, '.github/workflows/pages.yaml'), 'utf8');
    expect(workflow).toContain('pnpm/action-setup@v4');
    expect(workflow).toContain('version: 12');
    expect(parse(workflow)).toMatchObject({
      on: {
        push: { branches: ['main', 'master'] },
      },
      jobs: {
        build: {
          steps: expect.arrayContaining([{ uses: 'pnpm/action-setup@v4', with: { version: 12 } }]),
        },
      },
    });
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('pnpm approve-builds @swc/core esbuild');
    expect(workflow).toContain('pnpm run docs:build');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('path: ./docs_dist');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });

  it('reads the pnpm version from the project package.json', async () => {
    const projectPath = path.join(temporaryDirectory, 'github-pnpm-version');
    await mkdir(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'github-pnpm-version',
        packageManager: 'pnpm@12.15.0',
        repository: 'acme/github-pnpm-version',
      }),
    );

    await create({ ...createOptions, directory: projectPath });

    const workflow = await readFile(path.join(projectPath, '.github/workflows/pages.yaml'), 'utf8');
    expect(parse(workflow)).toMatchObject({
      jobs: {
        build: {
          steps: expect.arrayContaining([
            { uses: 'pnpm/action-setup@v4', with: { version: '12.15.0' } },
          ]),
        },
      },
    });
  });

  it('falls back to the declared devEngines pnpm version', async () => {
    const projectPath = path.join(temporaryDirectory, 'github-dev-engines');
    await mkdir(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'github-dev-engines',
        devEngines: { packageManager: { name: 'pnpm', version: '>=12.15.0' } },
        repository: 'acme/github-dev-engines',
      }),
    );

    await create({ ...createOptions, directory: projectPath });

    const workflow = await readFile(path.join(projectPath, '.github/workflows/pages.yaml'), 'utf8');
    expect(parse(workflow)).toMatchObject({
      jobs: {
        build: {
          steps: expect.arrayContaining([
            { uses: 'pnpm/action-setup@v4', with: { version: '12.15.0' } },
          ]),
        },
      },
    });
  });

  it('detects the origin remote and uses a root base for user sites', async () => {
    const projectPath = path.join(temporaryDirectory, 'github-user-site');
    await mkdir(projectPath);
    execFileSync('git', ['init', '--quiet'], { cwd: projectPath });
    execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/acme.github.io.git'], {
      cwd: projectPath,
    });

    await create({ ...createOptions, directory: projectPath });

    const config = await readFile(path.join(projectPath, 'vited.config.ts'), 'utf8');
    expect(config).toContain('base: "/"');
    expect(config).not.toContain('baseURL');
    await readFile(path.join(projectPath, '.github/workflows/pages.yaml'), 'utf8');
  });
});
