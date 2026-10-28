#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';

import { Command, Option } from 'commander';

import packageJson from '../package.json' with { type: 'json' };
import { isLanguage, LANGUAGES, setLanguage, t } from './i18n.js';
import { create, resolvePackageManager, THEMES, type PackageManager, type Theme } from './index.js';
import { runInteractive } from './interactive.js';

interface CommandOptions {
  interactive?: boolean;
  theme?: Theme;
  packageManager?: PackageManager;
  install: boolean;
  lang?: string;
}

function getLanguageArgument(args: string[]): string | undefined {
  const index = args.indexOf('--lang');
  if (index !== -1) {
    return args[index + 1];
  }
  return args.find((argument) => argument.startsWith('--lang='))?.slice('--lang='.length);
}

const requestedLanguage = getLanguageArgument(process.argv.slice(2));
if (isLanguage(requestedLanguage)) {
  await setLanguage(requestedLanguage);
}

const program = new Command('vited-create');
program
  .description(t('cli.description'))
  .argument('[directory]', t('cli.directory'))
  .option('-i, --interactive', t('cli.interactive'))
  .addOption(new Option('--theme <package>', t('cli.theme')).choices([...THEMES]))
  .addOption(
    new Option('--package-manager <manager>', t('cli.packageManager')).choices([
      'pnpm',
      'npm',
      'yarn',
      'bun',
    ]),
  )
  .option('--no-install', t('cli.noInstall'))
  .addOption(new Option('--lang <language>', t('cli.language')).choices([...LANGUAGES]))
  .action(async (directory: string | undefined, options: CommandOptions) => {
    const hasOptions =
      directory !== undefined ||
      options.theme !== undefined ||
      options.packageManager !== undefined ||
      options.install === false;

    if (options.interactive || !hasOptions) {
      await runInteractive();
      return;
    }

    const theme = options.theme ?? THEMES[0];
    const packageManager =
      options.packageManager ?? (await resolvePackageManager(directory ?? '.'));
    const result = await create({
      directory: directory ?? '.',
      theme,
      packageManager,
      install: options.install,
    });

    console.log(t('cli.configured', { path: result.projectPath }));
  });

program.helpOption('-h, --help', t('cli.showHelp'));
program.version(packageJson.version, '-v, --version', t('cli.showVersion'));

try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
