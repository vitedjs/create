import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

export interface Options {
  template?: string;
  install?: true | string;
}

export function create(
  project: string | null,
  { template = '@vited/template-react', install }: Options
) {
  const projectFullPath = project ? join(cwd(), project) : cwd();
  const templatePath = join(cwd(), 'node_modules', template);

  if (install) {
    let installCommand;
    switch (install) {
      case true:
      case 'npm':
        installCommand = 'npm install';
        break;
      case 'yarn':
        installCommand = 'yarn';
        break;
      default:
        installCommand = install + ' install';
    }
    spawnSync(installCommand);
  }
}
