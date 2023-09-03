#!/usr/bin/env node

import { Command } from 'commander';
import { create } from '..';

const program = new Command('vited-create');

program
  .argument(
    '[project]',
    'Folder name for the created project. If not provided, use current folder name.'
  )
  .option('--template <template-package>', 'Template package name. Default: @vited/template-react')
  .option(
    '--install [package-manager]',
    'Install node moduels after initialization. You can specify a package manager (npm/yarn/pnpm/cnpm/tnpm). Default: npm'
  )
  .action(create);

program.helpOption('-h, --help', 'Show full help');

program.version(PACKAGE_VERSION, '-v, --version', 'Show version number');

program.parse();
