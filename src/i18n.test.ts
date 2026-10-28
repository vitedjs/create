import { afterEach, describe, expect, it } from 'vitest';

import { languageFromLocale, setLanguage, t } from './i18n.js';

afterEach(async () => {
  await setLanguage('en');
});

describe('i18n', () => {
  it('detects Chinese and English system locales', () => {
    expect(languageFromLocale('zh_CN.UTF-8')).toBe('zh');
    expect(languageFromLocale('zh-Hant')).toBe('zh');
    expect(languageFromLocale('en_US.UTF-8')).toBe('en');
    expect(languageFromLocale('C.UTF-8')).toBe('en');
  });

  it('translates CLI messages and interpolates values', async () => {
    await setLanguage('zh');

    expect(t('cli.description')).toBe('在项目目录中配置 Vited 文档');
    expect(
      t('cli.configured', {
        path: '/workspace/docs',
        configPath: '/workspace/docs/vited-new.config.ts',
      }),
    ).toBe('已在 /workspace/docs 配置 Vited 文档。配置文件：/workspace/docs/vited-new.config.ts');
  });
});
