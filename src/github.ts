import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { promisify } from 'node:util';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface GitHubPagesSetup {
  base: string;
  workflow: string;
}

interface GitHubRepository {
  owner: string;
  name: string;
}

const execFileAsync = promisify(execFile);

export async function getGitHubPagesSetup(
  projectPath: string,
  repository: unknown,
  packageManager: PackageManager,
): Promise<GitHubPagesSetup | undefined> {
  const githubRepository = await findGitHubRepository(projectPath, repository);
  if (!githubRepository) {
    return;
  }

  return {
    base: getGitHubBaseURL(githubRepository),
    workflow: makeGitHubPagesWorkflow(packageManager),
  };
}

export async function writeGitHubPagesWorkflow(
  projectPath: string,
  content: string,
): Promise<void> {
  const workflowPath = path.join(projectPath, '.github', 'workflows', 'pages.yaml');
  await mkdir(path.dirname(workflowPath), { recursive: true });

  try {
    await writeFile(workflowPath, content, { flag: 'wx' });
  } catch (error) {
    if (!isNodeError(error, 'EEXIST')) {
      throw error;
    }
  }
}

async function findGitHubRepository(
  projectPath: string,
  repository: unknown,
): Promise<GitHubRepository | undefined> {
  let originURL: string | undefined;
  try {
    const result = await execFileAsync('git', ['remote', 'get-url', 'origin'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    originURL = result.stdout.trim();
  } catch (error) {
    if (!isExpectedGitLookupFailure(error)) {
      throw error;
    }
  }

  return parseGitHubRepository(originURL) ?? parseGitHubRepository(getRepositoryURL(repository));
}

function isExpectedGitLookupFailure(error: unknown): boolean {
  if (isNodeError(error, 'ENOENT')) {
    return true;
  }
  if (!isRecord(error)) {
    return false;
  }
  const code = error['code'];
  return typeof code === 'number' && [2, 128].includes(code);
}

function getRepositoryURL(repository: unknown): string | undefined {
  if (typeof repository === 'string') {
    return repository;
  }
  if (isRecord(repository) && typeof repository['url'] === 'string') {
    return repository['url'];
  }
  return undefined;
}

function parseGitHubRepository(repositoryURL?: string): GitHubRepository | undefined {
  if (!repositoryURL) {
    return;
  }

  const value = repositoryURL.trim().replace(/^git\+/, '');
  const scpMatch = /^(?:[^@/]+@)?github\.com:([^/]+)\/([^/?#]+)$/i.exec(value);
  const shorthandMatch = /^(?:github:)?([^/]+)\/([^/?#]+)$/i.exec(value);
  const shorthand = scpMatch ?? shorthandMatch;
  if (shorthand?.[1] && shorthand[2]) {
    return makeGitHubRepository(shorthand[1], shorthand[2]);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    if (error instanceof TypeError) {
      return;
    }
    throw error;
  }
  if (
    url.hostname.toLowerCase() !== 'github.com' ||
    !['git:', 'http:', 'https:', 'ssh:'].includes(url.protocol)
  ) {
    return;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length !== 2) {
    return;
  }
  const [owner, name] = pathSegments;
  if (!owner || !name) {
    return;
  }
  return makeGitHubRepository(owner, name);
}

function makeGitHubRepository(owner: string, name: string): GitHubRepository {
  return {
    owner,
    name: name.replace(/\.git$/i, ''),
  };
}

function getGitHubBaseURL(repository: GitHubRepository): string {
  return repository.name.toLowerCase() === `${repository.owner.toLowerCase()}.github.io`
    ? '/'
    : `/${repository.name}/`;
}

function makeGitHubPagesWorkflow(packageManager: PackageManager): string {
  const setupPackageManagerSteps = {
    npm: [],
    pnpm: ['      - uses: pnpm/action-setup@v4'],
    yarn: ['      - run: corepack enable'],
    bun: ['      - uses: oven-sh/setup-bun@v2'],
  }[packageManager];
  const installSteps = {
    npm: ['      - run: npm install'],
    pnpm: ['      - run: pnpm approve-builds @swc/core esbuild', '      - run: pnpm install'],
    yarn: ['      - run: yarn install'],
    bun: ['      - run: bun install'],
  }[packageManager];
  const buildCommand = {
    npm: 'npm run docs:build',
    pnpm: 'pnpm run docs:build',
    yarn: 'yarn docs:build',
    bun: 'bun run docs:build',
  }[packageManager];

  return [
    'name: Deploy docs to GitHub Pages',
    '',
    'on:',
    '  push:',
    '    branches:',
    '      - main',
    '      - master',
    '  workflow_dispatch:',
    '',
    'permissions:',
    '  contents: read',
    '  pages: write',
    '',
    'concurrency:',
    '  group: github-pages',
    '  cancel-in-progress: false',
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v6',
    '      - uses: actions/setup-node@v6',
    '        with:',
    '          node-version: 22',
    ...setupPackageManagerSteps,
    '      - uses: actions/configure-pages@v5',
    ...installSteps,
    `      - run: ${buildCommand}`,
    '      - uses: actions/upload-pages-artifact@v4',
    '        with:',
    '          path: ./docs_dist',
    '',
    '  deploy:',
    '    environment:',
    '      name: github-pages',
    '      url: ${{ steps.deployment.outputs.page_url }}',
    '    runs-on: ubuntu-latest',
    '    needs: build',
    '    permissions:',
    '      pages: write',
    '      id-token: write',
    '    steps:',
    '      - id: deployment',
    '        uses: actions/deploy-pages@v4',
    '',
  ].join('\n');
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value === Object(value) && !Array.isArray(value);
}
