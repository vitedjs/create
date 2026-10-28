import process from 'node:process';

import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts';

import { create, resolvePackageManager, THEMES, type Theme } from './index.js';

export async function runInteractive(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive mode requires a terminal. Use --help for command-line options.');
  }

  intro('Set up Vited documentation');

  const defaultDirectory = process.cwd();
  const directory = await text({
    message: 'Project directory',
    placeholder: defaultDirectory,
    initialValue: defaultDirectory,
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

  const packageManager = await resolvePackageManager(directory);

  const theme = await select({
    message: 'Choose a theme',
    options: THEMES.map((value) => ({ value, label: value })),
  });
  if (isCancel(theme)) {
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

  const result = await create({
    directory,
    theme: theme as Theme,
    packageManager,
    install,
  });
  outro(`Vited documentation configured at ${result.projectPath}`);
}
