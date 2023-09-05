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
    '--package-manager <package-manager>',
    'Package manager for template download and node module installation. Default: npm'
  )
  .option('--no-install', 'Skip node module installation after initialization.')
  .action(create);

program.helpOption('-h, --help', 'Show full help');

program.version(PACKAGE_VERSION, '-v, --version', 'Show version number');

program.parse();
