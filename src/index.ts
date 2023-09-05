import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

export interface Options {
  template?: string;
  install: boolean;
  packageManager?: string;
}

export async function create(
  project: string | null,
  { template = '@vited/template-react', install, packageManager = 'npm' }: Options
) {
  const projectPath = project ? join(cwd(), project) : cwd();
  console.log(projectPath);
  const templatePath = await downloadTemplate(template, projectPath, packageManager);

  if (install) {
    installPackages(projectPath, packageManager).catch(() => {
      exit(1);
    });
  }
}

export async function downloadTemplate(
  template: string,
  projectPath: string,
  packageManager: string
) {
  return new Promise<void>((resolve, reject) => {
    let command: string;

    switch (packageManager) {
      case 'npm':
        command = `npm install ${template}`;
        break;
      case 'yarn':
        command = 'yarn';
        break;
      default:
        command = packageManager + ' install';
    }

    console.log(chalk.green(`\n📄 download template ${template}\n`));

    const child = spawn(command, {
      cwd: '',
      shell: true,
      stdio: 'inherit',
    });

    child.on('close', function (code) {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

export function installPackages(projectPath: string, packageManager: string) {
  return new Promise<void>((resolve, reject) => {
    let command: string;

    switch (packageManager) {
      case 'npm':
        command = 'npm install';
        break;
      case 'yarn':
        command = 'yarn';
        break;
      default:
        command = packageManager + ' install';
    }

    console.log(chalk.green(`\n📦 ${command}\n`));

    const child = spawn(command, {
      cwd: projectPath,
      shell: true,
      stdio: 'inherit',
    });

    child.on('close', function (code) {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}
