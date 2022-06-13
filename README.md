![GitHub package.json version](https://img.shields.io/github/package-json/v/steve-py96/play-urls?style=flat-square&color=000000)

# Play-URLs

a simple and quick way to verify proper status/content of many urls

<br />
<br />

## how to use

note: `playwright-core` is a peer dependency, if integrated into a project you might want to add a `postinstall: 'npx playwright install'` into your package.json or use [the playwright docker image](https://playwright.dev/docs/docker) for your pipeline!

1. `npm i -D play-urls playwright-core` / `yarn -D play-urls playwright-core`
2. create a `.play-urls.config.ts` (or `.js`) in your project root
3. define the config (see [plain configuration](#plain-configuration))
4. run `npx playwright install` / `yarn run playwright install` (to install the required browsers)

<br />
<br />

## plain configuration

import `defineConfig` from play-urls and configure everything required (it's typed, just check via intellisense ;), otherwise check [the types](src/types.ts)).

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

you can pass `--config` or `CONFIG=` to overwrite the filepath (note: don't provide an extension, just the path / the filename)

```sh
# via env
CONFIG=my.config npx play-urls

# via arg
npx play-urls --config my.config
```

<br />
<br />

## example config

```ts
// .play-urls.config.ts
import { defineConfig } from 'play-urls/define';

export default defineConfig({
  browsers: ['chromium'],
  browserConfig: {
    headless: !!process.env.CI,
  },
  urls: [
    {
      url: 'https://example.com',
      name: 'example-com',
    },
  ],
});
```
