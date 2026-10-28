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

The generated project includes `vited.config.ts`, a `docs` directory with a
default `favicon.svg`, and `docs:dev` / `docs:build` scripts. `@vited/core`
provides the HTML shell, so no `index.html` is added to the project. Existing
package scripts and documentation files are preserved. The generated
`.gitignore` ignores the default `docs_dist` build output. The starter
documentation is English in `docs/README.md` with a Chinese translation in
`docs/README.zh.md`. An existing `vited.config.ts` is not overwritten.
If it already exists, `vited-new.config.ts` is created or overwritten for comparison.
When installing with pnpm, the required `@swc/core` and `esbuild` build scripts
are approved automatically to comply with pnpm's build-script policy.

When a GitHub repository is detected from the `origin` remote or the
`repository` field in `package.json`, create adds a GitHub Pages workflow and
sets the Vite and Vited base URLs to the repository path. The workflow deploys
the `docs_dist` build output. User and organization sites named
`<owner>.github.io` use the root URL. In the repository settings,
select **Settings → Pages → Source → GitHub Actions** to enable the workflow.
