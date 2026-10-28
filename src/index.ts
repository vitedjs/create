import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { t } from './i18n.js';

export const THEMES = ['@vited/theme-mantine'] as const;
export type Theme = (typeof THEMES)[number];
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type ProjectMode = 'create' | 'init';

export interface CreateOptions {
  directory: string;
  theme: Theme;
  packageManager: PackageManager;
  install: boolean;
}

export interface CreateResult {
  projectPath: string;
  mode: ProjectMode;
}

interface ProjectPackageJson {
  [key: string]: unknown;
}

const vitedPackages: Record<string, string> = {
  '@vited/cli': '^0.1.0',
  '@vited/core': '^0.1.0',
  '@vited/theme-mantine': '^0.1.0',
  react: '^19.3.1',
  'react-dom': '^19.3.1',
  vite: '^8.3.5',
};

const packageManagerLockfiles: Record<string, PackageManager> = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'npm-shrinkwrap.json': 'npm',
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
};

export async function resolvePackageManager(
  projectPath: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<PackageManager> {
  const resolvedProjectPath = path.resolve(projectPath);
  const packageJsonPath = path.join(resolvedProjectPath, 'package.json');
  let packageJson: unknown;

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      packageJson = undefined;
    } else if (error instanceof SyntaxError) {
      throw new SyntaxError(t('errors.invalidPackageJsonSyntax', { path: packageJsonPath }), {
        cause: error,
      });
    } else {
      throw error;
    }
  }

  if (isRecord(packageJson) && packageJson['packageManager'] !== undefined) {
    const configuredPackageManager = packageJson['packageManager'];
    if (typeof configuredPackageManager !== 'string') {
      throw new TypeError(t('errors.invalidPackageManagerType', { path: packageJsonPath }));
    }
    const packageManager = getPackageManager(configuredPackageManager);
    if (!packageManager) {
      throw new TypeError(
        t('errors.unsupportedPackageManager', {
          path: packageJsonPath,
          packageManager: configuredPackageManager,
        }),
      );
    }
    return packageManager;
  }

  const lockfileManagers = new Set<PackageManager>();
  for (const [lockfile, packageManager] of Object.entries(packageManagerLockfiles)) {
    if (await fileExists(path.join(resolvedProjectPath, lockfile))) {
      lockfileManagers.add(packageManager);
    }
  }

  const invokedPackageManager =
    getPackageManager(environment['npm_config_user_agent'] ?? '') ??
    getPackageManager(
      path
        .basename(environment['npm_execpath'] ?? '')
        .replace(/\.[^.]+$/, '')
        .replace(/-cli$/, ''),
    );

  if (lockfileManagers.size === 1) {
    return [...lockfileManagers][0]!;
  }
  if (lockfileManagers.size > 1) {
    if (invokedPackageManager && lockfileManagers.has(invokedPackageManager)) {
      return invokedPackageManager;
    }
    throw new Error(t('errors.multipleLockfiles', { path: projectPath }));
  }

  return invokedPackageManager ?? 'pnpm';
}

export async function create({
  directory,
  theme,
  packageManager,
  install,
}: CreateOptions): Promise<CreateResult> {
  const projectPath = path.resolve(directory);
  const mode = await validateTarget(projectPath);

  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await readProjectPackageJson(packageJsonPath, projectPath);
  addVitedConfiguration(packageJson, projectPath, theme);

  await mkdir(projectPath, { recursive: true });
  const docsPath = path.join(projectPath, 'docs');
  await mkdir(docsPath, { recursive: true });
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, undefined, 2)}\n`);
  await writeFile(path.join(projectPath, 'vited.config.ts'), makeVitedConfig(packageJson, theme), {
    flag: 'wx',
  });
  await writeIfMissing(path.join(docsPath, 'README.md'), makeReadme(packageJson));

  if (install) {
    await installPackages(projectPath, packageManager);
  }

  return { projectPath, mode };
}

export async function installPackages(
  projectPath: string,
  packageManager: PackageManager,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(packageManager, ['install'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            t('errors.installFailed', { packageManager, code: code === null ? 'unknown' : code }),
          ),
        );
      }
    });
  });
}

async function validateTarget(projectPath: string): Promise<ProjectMode> {
  let projectStat;

  try {
    projectStat = await stat(projectPath);
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return 'create';
    }
    throw error;
  }

  if (!projectStat.isDirectory()) {
    throw new Error(t('errors.projectNotDirectory', { path: projectPath }));
  }

  const configPath = path.join(projectPath, 'vited.config.ts');
  let configExists = false;
  try {
    await stat(configPath);
    configExists = true;
  } catch (error) {
    if (!isNodeError(error, 'ENOENT')) {
      throw error;
    }
  }
  if (configExists) {
    throw new Error(t('errors.alreadyConfigured', { path: projectPath }));
  }

  const docsPath = path.join(projectPath, 'docs');
  try {
    const docsStat = await stat(docsPath);
    if (!docsStat.isDirectory()) {
      throw new Error(t('errors.docsNotDirectory', { path: docsPath }));
    }
  } catch (error) {
    if (!isNodeError(error, 'ENOENT')) {
      throw error;
    }
  }

  return 'init';
}

async function readProjectPackageJson(
  packageJsonPath: string,
  projectPath: string,
): Promise<ProjectPackageJson> {
  try {
    const contents = await readFile(packageJsonPath, 'utf8');
    let value: unknown;
    try {
      value = JSON.parse(contents);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SyntaxError(t('errors.invalidPackageJsonSyntax', { path: packageJsonPath }), {
          cause: error,
        });
      }
      throw error;
    }
    if (!isRecord(value)) {
      throw new TypeError(t('errors.invalidPackageJson', { path: packageJsonPath }));
    }
    return value;
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return {
        name: toPackageName(path.basename(projectPath)),
        version: '0.0.0',
        private: true,
        type: 'module',
      };
    }
    throw error;
  }
}

function addVitedConfiguration(packageJson: ProjectPackageJson, projectPath: string, theme: Theme) {
  if (typeof packageJson['name'] !== 'string' || packageJson['name'].length === 0) {
    packageJson['name'] = toPackageName(path.basename(projectPath));
  }
  if (packageJson['type'] === undefined) {
    packageJson['type'] = 'module';
  }

  const scripts = getRecord(packageJson['scripts'], 'scripts');
  scripts['docs:dev'] ??= 'vited dev';
  scripts['docs:build'] ??= 'vited build';
  packageJson['scripts'] = scripts;

  const dependencies = getRecord(packageJson['dependencies'], 'dependencies');
  const devDependencies = getRecord(packageJson['devDependencies'], 'devDependencies');
  for (const [name, version] of Object.entries(vitedPackages)) {
    if (name === '@vited/theme-mantine' && theme !== name) {
      continue;
    }
    if (dependencies[name] === undefined && devDependencies[name] === undefined) {
      devDependencies[name] = version;
    }
  }
  packageJson['devDependencies'] = devDependencies;
}

function getRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(t('errors.invalidPackageJsonField', { field: name }));
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value === Object(value) && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
}

function getPackageManager(value: string): PackageManager | undefined {
  const match = /^(npm|pnpm|yarn|bun)(?:[@/]|$)/.exec(value);
  switch (match?.[1]) {
    case 'npm': {
      return 'npm';
    }
    case 'pnpm': {
      return 'pnpm';
    }
    case 'yarn': {
      return 'yarn';
    }
    case 'bun': {
      return 'bun';
    }
    default: {
      return;
    }
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

function toPackageName(value: string): string {
  const name = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return name || 'vited-docs';
}

function makeVitedConfig(packageJson: ProjectPackageJson, theme: Theme): string {
  const title =
    typeof packageJson['name'] === 'string' && packageJson['name'].length > 0
      ? packageJson['name']
      : 'Vited documentation';

  return [
    "import { defineConfig } from '@vited/core';",
    '',
    'export default defineConfig({',
    '  docs: {',
    `    title: ${JSON.stringify(title)},`,
    `    theme: ${JSON.stringify(theme)},`,
    '  },',
    '});',
    '',
  ].join('\n');
}

function makeReadme(packageJson: ProjectPackageJson): string {
  const title =
    typeof packageJson['name'] === 'string' && packageJson['name'].length > 0
      ? packageJson['name']
      : 'Vited documentation';
  return `# ${title}\n\n${t('template.docsWelcome')}\n`;
}

async function writeIfMissing(filePath: string, content: string): Promise<void> {
  try {
    await writeFile(filePath, content, { flag: 'wx' });
  } catch (error) {
    if (!isNodeError(error, 'EEXIST')) {
      throw error;
    }
  }
}
