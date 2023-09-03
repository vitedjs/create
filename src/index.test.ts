import mockConsole from 'jest-mock-console';
import { create } from '.';

describe('action()', () => {
  it('print word', () => {
    const restoreConsole = mockConsole();
    create('hello', {});
    expect(console.log).toHaveBeenCalledTimes(1);
    restoreConsole();
  });

  it('print word repeatly', () => {
    const restoreConsole = mockConsole();
    create('hello', { repeat: 10 });
    expect(console.log).toHaveBeenCalledTimes(10);
    restoreConsole();
  });
});
