import process from 'node:process';

import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts';

import { create, THEMES, type PackageManager, type ProjectMode, type Theme } from './index.js';

const packageManagers: PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

export async function runInteractive(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive mode requires a terminal. Use --help for command-line options.');
  }

  intro('Create a Vited documentation project');

  const mode = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'create', label: 'Create a new project' },
      { value: 'init', label: 'Initialize an existing project' },
    ],
  });
  if (isCancel(mode)) {
    cancel('Setup cancelled.');
    return;
  }

  const directory = await text({
    message:
      mode === 'create' ? 'Where should the project be created?' : 'Which project to initialize?',
    placeholder: mode === 'create' ? './my-vited-site' : '.',
    initialValue: mode === 'init' ? '.' : './my-vited-site',
    validate(value) {
      if (!value?.trim()) {
        return 'Please enter a directory.';
      }
      return;
    },
  });
  if (isCancel(directory)) {
    cancel('Setup cancelled.');
    return;
  }

  const theme = await select({
    message: 'Choose a theme',
    options: THEMES.map((value) => ({ value, label: value })),
  });
  if (isCancel(theme)) {
    cancel('Setup cancelled.');
    return;
  }

  const packageManager = await select({
    message: 'Choose a package manager',
    options: packageManagers.map((value) => ({ value, label: value })),
    initialValue: 'pnpm',
  });
  if (isCancel(packageManager)) {
    cancel('Setup cancelled.');
    return;
  }

  const install = await confirm({
    message: 'Install dependencies now?',
    initialValue: true,
  });
  if (isCancel(install)) {
    cancel('Setup cancelled.');
    return;
  }

  const projectPath = await create({
    mode: mode as ProjectMode,
    directory,
    theme: theme as Theme,
    packageManager: packageManager as PackageManager,
    install,
  });
  outro(`Project ${mode === 'create' ? 'created' : 'initialized'} at ${projectPath}`);
}
