# @vited/create

Create a new Vited documentation project or add Vited to an existing project.

## Interactive setup

Run without arguments to choose the project mode, directory, theme, package
manager, and whether to install dependencies:

```bash
pnpm dlx @vited/create
```

## Command-line setup

Create a new project:

```bash
pnpm dlx @vited/create my-docs
```

Initialize the current directory or another existing project:

```bash
pnpm dlx @vited/create . --init
pnpm dlx @vited/create ../existing-project --init
```

The default theme is `@vited/theme-mantine`. Select a package manager and skip
automatic dependency installation with:

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
