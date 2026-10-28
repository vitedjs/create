import process from 'node:process';

import i18next from 'i18next';

export const LANGUAGES = ['en', 'zh'] as const;
export type Language = (typeof LANGUAGES)[number];

const resources = {
  en: {
    translation: {
      cli: {
        description: 'Set up Vited documentation in a project directory',
        directory: 'Project directory',
        interactive: 'Start interactive setup',
        theme: 'Theme package',
        packageManager: 'Override detected package manager',
        noInstall: 'Skip dependency installation',
        language: 'Language for prompts and messages',
        showHelp: 'Show full help',
        showVersion: 'Show version number',
        configured: 'Vited documentation configured at {{path}}',
      },
      interactive: {
        terminalRequired:
          'Interactive mode requires a terminal. Use --help for command-line options.',
        intro: 'Set up Vited documentation',
        projectDirectory: 'Project directory',
        directoryRequired: 'Please enter a directory.',
        chooseTheme: 'Choose a theme',
        installDependencies: 'Install dependencies now?',
        cancelled: 'Setup cancelled.',
      },
      errors: {
        invalidPackageManagerType:
          'Invalid package.json: packageManager must be a string in {{path}}',
        unsupportedPackageManager: 'Unsupported package manager in {{path}}: {{packageManager}}',
        multipleLockfiles:
          'Multiple package manager lockfiles found in {{path}}. Set packageManager in package.json.',
        installFailed: '{{packageManager}} install exited with code {{code}}',
        projectNotDirectory: 'Project path is not a directory: {{path}}',
        alreadyConfigured:
          'Vited is already configured in {{path}}. Remove or rename vited.config.ts before running create again.',
        docsNotDirectory: 'Cannot create documentation: {{path}} is not a directory.',
        invalidPackageJson: 'Invalid package.json: expected a JSON object in {{path}}',
        invalidPackageJsonSyntax: 'Invalid JSON in package.json: {{path}}',
        invalidPackageJsonField: 'Invalid package.json: {{field}} must be an object.',
      },
      template: {
        docsWelcome: 'Welcome to your Vited documentation site.',
      },
    },
  },
  zh: {
    translation: {
      cli: {
        description: '在项目目录中配置 Vited 文档',
        directory: '项目目录',
        interactive: '启动交互式配置',
        theme: '主题包',
        packageManager: '覆盖自动检测到的包管理器',
        noInstall: '跳过依赖安装',
        language: '提示和消息使用的语言',
        showHelp: '显示帮助信息',
        showVersion: '显示版本号',
        configured: '已在 {{path}} 配置 Vited 文档',
      },
      interactive: {
        terminalRequired: '交互模式需要终端。请使用 --help 查看命令行选项。',
        intro: '配置 Vited 文档',
        projectDirectory: '项目目录',
        directoryRequired: '请输入项目目录。',
        chooseTheme: '选择主题',
        installDependencies: '现在安装依赖吗？',
        cancelled: '已取消配置。',
      },
      errors: {
        invalidPackageManagerType:
          'package.json 配置无效：{{path}} 中的 packageManager 必须是字符串',
        unsupportedPackageManager: '{{path}} 中配置了不支持的包管理器：{{packageManager}}',
        multipleLockfiles:
          '{{path}} 中存在多个包管理器锁文件，请在 package.json 中设置 packageManager。',
        installFailed: '{{packageManager}} install 退出，代码为 {{code}}',
        projectNotDirectory: '项目路径不是目录：{{path}}',
        alreadyConfigured:
          '{{path}} 已配置 Vited。请删除或重命名 vited.config.ts 后再运行 create。',
        docsNotDirectory: '无法创建文档：{{path}} 不是目录。',
        invalidPackageJson: 'package.json 无效：{{path}} 应为 JSON 对象',
        invalidPackageJsonSyntax: 'package.json 中的 JSON 无效：{{path}}',
        invalidPackageJsonField: 'package.json 无效：{{field}} 必须是对象。',
      },
      template: {
        docsWelcome: '欢迎使用 Vited 文档站点。',
      },
    },
  },
};

const i18n = i18next.createInstance();
const systemLocale =
  process.env['LC_ALL'] ||
  process.env['LC_MESSAGES'] ||
  process.env['LANG'] ||
  process.env['LANGUAGE'] ||
  'en';

await i18n.init({
  lng: languageFromLocale(systemLocale),
  fallbackLng: 'en',
  resources,
  interpolation: { escapeValue: false },
});

export function languageFromLocale(locale: string): Language {
  return /^zh(?:[-_.:]|$)/i.test(locale) ? 'zh' : 'en';
}

export function isLanguage(value: string | undefined): value is Language {
  return LANGUAGES.some((language) => language === value);
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
}

export function t(key: string, options?: Record<string, string | number>): string {
  return options === undefined ? i18n.t(key) : i18n.t(key, options);
}
