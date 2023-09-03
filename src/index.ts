export interface Options {
  repeat?: number;
  install?: true | string;
}

export function action(word: string, options: Options) {
  console.log(options);
}
