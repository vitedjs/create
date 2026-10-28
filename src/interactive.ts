import process from 'node:process';

import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts';

import { t } from './i18n.js';
import { create, resolvePackageManager, THEMES, type Theme } from './index.js';

export async function runInteractive(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(t('interactive.terminalRequired'));
  }

  intro(t('interactive.intro'));

  const defaultDirectory = process.cwd();
  const directory = await text({
    message: t('interactive.projectDirectory'),
    placeholder: defaultDirectory,
    initialValue: defaultDirectory,
    validate(value) {
      if (!value?.trim()) {
        return t('interactive.directoryRequired');
      }
      return;
    },
  });
  if (isCancel(directory)) {
    cancel(t('interactive.cancelled'));
    return;
  }

  const packageManager = await resolvePackageManager(directory);

  const theme = await select({
    message: t('interactive.chooseTheme'),
    options: THEMES.map((value) => ({ value, label: value })),
  });
  if (isCancel(theme)) {
    cancel(t('interactive.cancelled'));
    return;
  }

  const install = await confirm({
    message: t('interactive.installDependencies'),
    initialValue: true,
  });
  if (isCancel(install)) {
    cancel(t('interactive.cancelled'));
    return;
  }

  const result = await create({
    directory,
    theme: theme as Theme,
    packageManager,
    install,
  });
  outro(t('cli.configured', { path: result.projectPath }));
}
