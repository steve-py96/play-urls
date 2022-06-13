import type { LoadConfigResult } from 'unconfig';
import type { Config, Log } from './types';
import { chromium, firefox, webkit } from 'playwright-core';
import { loadConfig } from 'unconfig';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from './define';

export { run, defineConfig };

// browser mapping
const BROWSERS = {
  chromium,
  firefox,
  webkit,
};

const run = async (paramConfig?: Config | (() => Config | Promise<Config>)) => {
  const args = await yargs(hideBin(process.argv)).argv;

  const { config, sources } = await (async () => {
    // without provided paramConfig we expect a config file
    if (!paramConfig)
      return loadConfig<Config>({
        sources: [
          {
            files: [
              '.play-url.config',
              process.env.CONFIG || '',
              (args.config || '') as string,
            ].filter(Boolean),
          },
        ],
      });

    const re: LoadConfigResult<Config> = {
      config: await defineConfig(paramConfig),
      sources: ['__paramConfig__'],
    };

    return re;
  })();

  // no config file/paramConfig => error
  if (sources.length === 0) {
    console.error('no play-url config file found!');
    process.exit(1);
  }

  // no browsers => error
  if (!config?.browsers?.length) {
    console.error('play-url config does not contain browsers!');
    process.exit(1);
  }

  // no urls => error
  if (!config?.urls?.length) {
    console.error('play-url config does not contain urls!');
    process.exit(1);
  }

  const logs: Array<Log> = [];

  for (const browserName of config.browsers) {
    const browser = BROWSERS[browserName];

    // unknown browser => error
    if (!browser) {
      console.error(`browser ${browserName} not available!`);
      continue;
    }

    const browserInstance = await browser.launch(config.browserConfig);

    for (const index in config.urls) {
      const { url, valid, name, pageConfig, visitConfig } = config.urls[index];

      if (!url) {
        console.error(`${name || index} has no defined url!`);
        continue;
      }

      // some things can't be awaited for, such as the response status
      const store = {
        status: -1,
      };
      const page = await browserInstance.newPage(pageConfig);

      // listen to the document request response
      page.on('response', (res) => {
        store.status = res.status();
      });

      await page.goto(url, visitConfig);

      // validate the page, either with user validation or a fallback status 200 check
      let isPageValid = false;
      if (valid !== undefined)
        isPageValid = await valid({
          ...store,
          browser: browserName,
          page,
        });
      else isPageValid = store.status === 200;

      if (!isPageValid) {
        let screenshot: string | undefined = undefined;

        // screenshot if defined, inject the templated values
        if (config.screenshotOnError) {
          screenshot = `${config.screenshotOnError
            .replace(/\[browser\]/g, browserName)
            .replace(/\[timestamp\]/g, Date.now().toString())
            .replace(/\[status\]/g, store.status.toString())
            .replace(/\[index\]/g, index.toString())
            .replace(/\[name\]/g, (name || '').replace(/[^a-z\d\-_]/gi, ''))}.png`;

          await page.screenshot({
            path: screenshot,
          });
        }

        // errors => logs
        logs.push({
          browser: browserName,
          name,
          screenshot,
          status: store.status,
          url,
        });
      }

      await page.close();
    }

    await browserInstance.close();
  }

  // errors => error + output log file
  if (logs.length > 0) {
    console.warn(`${logs.length} / ${config.urls.length} tests failed!`);

    await writeFile(
      config.errorLogs || join(process.cwd(), 'play-url-errors.json'),
      JSON.stringify({ logs, config }),
      { encoding: 'utf-8' }
    );

    process.exit(1);
  }

  console.log(`all ${config.urls.length} test${config.urls.length === 1 ? '' : 's'} passed!`);
  process.exit(0);
};
