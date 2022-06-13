![GitHub package.json version](https://img.shields.io/github/package-json/v/steve-py96/play-urls?style=flat-square&color=000000)

# Play-URLs

a simple and quick way to verify proper status/content of many urls

<br />
<br />

## how to use

1. `npm i -D play-urls` / `yarn -D play-urls`
2. create a `.play-urls.config.ts` (or `.js`) in your project root
3. define the config (see [plain configuration](#plain-configuration))

note: if integrated into a pipeline it's recommended to use [the playwright docker image](https://playwright.dev/docs/docker) and install this package with `--ignore-scripts` flag

<br />
<br />

## plain configuration

import `defineConfig` from play-urls and configure everything required (it's typed, just check via intellisense ;), otherwise check [the types](src/types.ts)). <br />
also this library allows a file-based url configuration via `defineUrl` (recognized via `urlGlob`-option within the config)

```ts
// .play-urls.config.ts
import { defineConfig } from 'play-urls/define';

export default defineConfig({
  browsers: ['chromium'],
  browserConfig: {
    headless: !!process.env.CI,
  },
  urlGlob: 'src/**/*.play-urls.spec.{js,ts}',
  urls: [
    {
      url: 'https://example.com',
      name: 'example-com',
    },
  ],
});
```

```ts
// some.play-urls.spec.ts
import { defineUrl } from 'play-urls/define';

export default defineUrl({
  url: 'https://google.com',
  name: 'example-com-from-file',
});
```

note: it's highly recommended to use `.(test|spec).{js,ts}` or any other test-file naming convention to easily exclude these files from linters (such as ESLint) and show that they're testing files and no actual source files

<br />
<br />

## run via JS/TS

you can run it also via js/ts, just import run from play-urls

```ts
import { run } from 'play-urls';

// somewhere
run();

// or with inline config

run({
  browsers: ['chromium'],
  // ...
});
```

<br />
<br />

## CLI args / envs

| arg         | env       | default             | definition                                                                         |
| ----------- | --------- | ------------------- | ---------------------------------------------------------------------------------- |
| `--config`  | `CONFIG`  | `.play-urls.config` | overwrite the filepath                                                             |
| `--urlglob` | `URLGLOB` | - (none)            | overwrite the urlglob (this one is preferred over the config one if both provided) |

```sh
## examples ##

## config
# via env
CONFIG=my.config npx play-urls

# via arg
npx play-urls --config my.config

## urlglob
# via env
URLGLOB="src/**/*.my-url.spec.{ts,js}" npx play-urls

# via arg
npx play-urls --urlglob "src/**/*.my-url.spec.{ts,js}"
```

note: if env and arg are passed at once (let's say `CONFIG=...` and `--config ...`) env will be preferred!
