import type { LoadConfigResult } from 'unconfig';
import type { Config, Log, UrlConfig } from './types';
import { chromium, firefox, webkit } from 'playwright-core';
import { loadConfig } from 'unconfig';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import glob from 'tiny-glob';
import jiti from 'jiti';

export { run };

// browser mapping
const BROWSERS = {
  chromium,
  firefox,
  webkit,
};

const { CONFIG, URLGLOB } = process.env;

const run = async (paramConfig?: Config | (() => Config | Promise<Config>)) => {
  const args = await yargs(hideBin(process.argv)).argv;

  const { config, sources } = await (async () => {
    // without provided paramConfig we expect a config file
    if (!paramConfig)
      return loadConfig<Config>({
        sources: [
          {
            files: CONFIG || (args.config as string | undefined) || '.play-urls.config',
          },
        ],
      });

    const re: LoadConfigResult<Config> = {
      config: typeof paramConfig === 'function' ? await paramConfig() : paramConfig,
      sources: ['__paramConfig__'],
    };

    return re;
  })();

  // no config file/paramConfig => error
  if (sources.length === 0) {
    console.error('no play-urls config file found!');
    process.exit(1);
  }

  // no config => error
  if (!config) {
    console.error('no play-urls config found!');
    process.exit(1);
  }

  // no browsers => error
  if (!config.browsers?.length) {
    console.error('play-urls config does not contain browsers!');
    process.exit(1);
  }

  const urlGlob = URLGLOB || (args as { urlglob?: string }).urlglob || config.urlGlob;

  // no urls/urlGlob => error
  if (!config.urls?.length && !urlGlob) {
    console.error(
      'play-urls config does not contain urls / an urlGlob! (one of either is required!)'
    );
    process.exit(1);
  }

  // store the urls in a new array since there could be globbed urls or config & globbed ones together even
  const urls = (config.urls || []).slice();

  if (urlGlob)
    urls.push(
      ...(await Promise.all(
        (
          await glob(urlGlob, { absolute: true })
        ).map(
          async (file) =>
            jiti(file, {
              cache: false,
              esmResolve: true,
              requireCache: false,
              v8cache: false,
              interopDefault: true,
            })(file) as Promise<UrlConfig>
        )
      ))
    );

  const logs: Array<Log> = [];

  for (const browserName of config.browsers) {
    const browser = BROWSERS[browserName];

    // unknown browser => error
    if (!browser) {
      console.error(`browser ${browserName} not available!`);
      continue;
    }

    const browserInstance = await browser.launch(config.browserConfig);

    for (const index in urls) {
      const { url, valid, name, pageConfig, visitConfig } = urls[index];

      if (!url) {
        console.error(`${name || index} has no defined url!`);
        continue;
      }

      // some things can't be awaited for, such as the response status or randomly thrown errors
      const store = {
        status: -1,
        error: '',
      };
      const page = await browserInstance.newPage(pageConfig);

      // listen to the document request response
      page.on('response', (res) => {
        store.status = res.status();
      });

      try {
        await page.goto(url, visitConfig);
      } catch (err) {
        store.error = (err as Error).toString();
      }

      // validate the page, either with user validation or a fallback status 200 check
      let isPageValid = false;
      // but only if there was no thrown error
      if (!store.error) {
        if (valid !== undefined)
          isPageValid = await valid({
            ...store,
            browser: browserName,
            page,
          });
        else isPageValid = store.status === 200;
      }

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
          ...store,
          url,
        });
      }

      await page.close();
    }

    await browserInstance.close();
  }

  // errors => error + output log file
  if (logs.length > 0) {
    console.warn(`${logs.length} / ${urls.length} tests failed!`);

    // kick out irrelevant args for the logs...
    const { $0, _, ...relevantArgs } = args;

    await writeFile(
      config.errorLogs || join(process.cwd(), 'play-urls-errors.json'),
      JSON.stringify({ logs, config, other: { envs: { URLGLOB, CONFIG }, args: relevantArgs } }),
      { encoding: 'utf-8' }
    );

    process.exit(1);
  }

  if (urls.length === 1) console.log(`the url test passed!`);
  else console.log(`all ${urls.length} tests passed!`);

  process.exit(0);
};

run();
