import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const THEMES = ['@vited/theme-mantine'] as const;
export type Theme = (typeof THEMES)[number];
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type ProjectMode = 'create' | 'init';

export interface CreateOptions {
  mode: ProjectMode;
  directory: string;
  theme: Theme;
  packageManager: PackageManager;
  install: boolean;
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

export async function create({
  mode,
  directory,
  theme,
  packageManager,
  install,
}: CreateOptions): Promise<string> {
  const projectPath = path.resolve(directory);
  await validateTarget(projectPath, mode);

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

  return projectPath;
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
        reject(new Error(`${packageManager} install exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

async function validateTarget(projectPath: string, mode: ProjectMode): Promise<void> {
  let projectStat;

  try {
    projectStat = await stat(projectPath);
  } catch (error) {
    if (isNodeError(error, 'ENOENT') && mode === 'create') {
      return;
    }
    if (isNodeError(error, 'ENOENT')) {
      throw new Error(`Cannot initialize project: directory does not exist: ${projectPath}`, {
        cause: error,
      });
    }
    throw error;
  }

  if (!projectStat.isDirectory()) {
    throw new Error(`Project path is not a directory: ${projectPath}`);
  }

  const projectFiles = await readdir(projectPath);
  if (mode === 'create' && projectFiles.length > 0) {
    throw new Error(
      `Directory is not empty: ${projectPath}. Use --init to initialize an existing project.`,
    );
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
    throw new Error(
      `Vited is already configured in ${projectPath}. Remove or rename vited.config.ts before initializing again.`,
    );
  }

  const docsPath = path.join(projectPath, 'docs');
  try {
    const docsStat = await stat(docsPath);
    if (!docsStat.isDirectory()) {
      throw new Error(`Cannot create documentation: ${docsPath} is not a directory.`);
    }
  } catch (error) {
    if (!isNodeError(error, 'ENOENT')) {
      throw error;
    }
  }
}

async function readProjectPackageJson(
  packageJsonPath: string,
  projectPath: string,
): Promise<ProjectPackageJson> {
  try {
    const contents = await readFile(packageJsonPath, 'utf8');
    const value: unknown = JSON.parse(contents);
    if (!isRecord(value)) {
      throw new Error(`Invalid package.json: expected a JSON object in ${packageJsonPath}`);
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
    throw new Error(`Invalid package.json: ${name} must be an object.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value === Object(value) && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
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
  return `# ${title}\n\nWelcome to your Vited documentation site.\n`;
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
