#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';

import { Command, Option } from 'commander';

import packageJson from '../package.json' with { type: 'json' };
import { create, resolvePackageManager, THEMES, type PackageManager, type Theme } from './index.js';
import { runInteractive } from './interactive.js';

interface CommandOptions {
  interactive?: boolean;
  theme?: Theme;
  packageManager?: PackageManager;
  install: boolean;
}

const program = new Command('vited-create');
program
  .description('Set up Vited documentation in a project directory')
  .argument('[directory]', 'Project directory')
  .option('-i, --interactive', 'Start interactive setup')
  .addOption(new Option('--theme <package>', 'Theme package').choices([...THEMES]))
  .addOption(
    new Option('--package-manager <manager>', 'Override detected package manager').choices([
      'pnpm',
      'npm',
      'yarn',
      'bun',
    ]),
  )
  .option('--no-install', 'Skip dependency installation')
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

    console.log(`Vited documentation configured at ${result.projectPath}`);
  });

program.helpOption('-h, --help', 'Show full help');
program.version(packageJson.version, '-v, --version', 'Show version number');

try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
