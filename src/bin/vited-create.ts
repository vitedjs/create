#!/usr/bin/env node

import { Command } from 'commander';

import packageJson from '../../package.json' with { type: 'json' };
import { create } from '../index.js';

const program = new Command('vited-create');

program
  .argument(
    '[project]',
    'Folder name for the created project. If not provided, use current folder name.',
  )
  .option('--template <template-package>', 'Template package name. Default: @vited/template-react')
  .option(
    '--package-manager <package-manager>',
    'Package manager for template download and node module installation. Default: npm',
  )
  .option('--no-install', 'Skip node module installation after initialization.')
  .action(create);

program.helpOption('-h, --help', 'Show full help');

program.version(packageJson.version, '-v, --version', 'Show version number');

program.parse();
