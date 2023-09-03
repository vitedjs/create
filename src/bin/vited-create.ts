#!/usr/bin/env node

import { Command } from 'commander';
import { action } from '..';

const program = new Command('create');

program
  .argument(
    '[project]',
    'Folder name for the created project. If not provided, use current folder name.'
  )
  .option('--template <version>', 'Template package name. Default: @vited/template-react')
  .option(
    '--install [package-manager]',
    'Install node moduels after initialization. You can specify a package manager (npm/yarn/pnpm/cnpm/tnpm). Default: npm'
  )
  .action(action);

program.helpOption('-h, --help', 'Show full help');

program.version(PACKAGE_VERSION, '-v, --version', 'Show version number');

program.parse();
