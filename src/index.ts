import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

export interface Options {
  template?: string;
  install?: true | string;
}

export async function create(
  project: string | null,
  { template = '@vited/template-react', install }: Options
) {
  const projectPath = project ? join(cwd(), project) : cwd();
  console.log(projectPath);
  const templatePath = join(cwd(), 'node_modules', template);

  if (install) {
    installPackages(projectPath, install as string).catch(() => {
      exit(1);
    });
  }
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
