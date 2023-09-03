import { join } from 'node:path';

export interface Options {
  template?: number;
  install?: true | string;
}

export function create(project: string | null, { template, install }: Options) {
  const projectFullPath = project ? join(process.cwd(), project) : process.cwd();
}
