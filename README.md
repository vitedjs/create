# @vited/create

Set up Vited documentation in the current project or another project directory.

## Interactive setup

Run without arguments to choose the project directory and theme, and whether to
install dependencies. The project directory defaults to the current working
directory, and the package manager is detected automatically:

```bash
pnpm dlx @vited/create
```

The language follows the system locale (`zh` for Chinese locales, otherwise
`en`). Override it with `--lang en` or `--lang zh`.

## Command-line setup

```bash
pnpm dlx @vited/create .
pnpm dlx @vited/create ../my-docs
```

The default theme is `@vited/theme-mantine`. The package manager is detected
from the project configuration or the package manager used to run the command.
Override it and skip automatic dependency installation with:

```bash
pnpm dlx @vited/create my-docs \
  --theme @vited/theme-mantine \
  --package-manager pnpm \
  --no-install
```

The generated project includes `vited.config.ts`, a `docs` directory, and
`docs:dev` / `docs:build` scripts. `@vited/core` provides the HTML shell, so no
`index.html` is added to the project. Existing package scripts and documentation
files are preserved. An existing `vited.config.ts` is not overwritten.
If it already exists, `vited-new.config.ts` is created or overwritten for comparison.
When installing with pnpm, the required `@swc/core` and `esbuild` build scripts
are approved automatically to comply with pnpm's build-script policy.
