# create

## Install

### Run directly

```bash
npx create
```

### Install on system

```bash
npm i -g create
%binName%
```

### Install in project

```bash
npm i -D create
```

Add script entry:

```json
{
  "scripts": {
    "%binName%": "%binName%"
  }
}
```

Run:

```bash
npm run %binName%
```

## Options

### `--help`

Show help

### `--version`

Show version
