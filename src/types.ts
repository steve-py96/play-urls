import type { Page, Browser as PlaywrightBrowser, LaunchOptions } from 'playwright-core';

export type { Config, UrlConfig, Log };

type Browser = 'chromium' | 'firefox' | 'webkit';

interface ValidParams {
  /**
   * @description
   *  the status after opening the url
   *
   * @example
   *  200
   */
  status: number;

  /**
   * @description
   *  the browser which the test is running in at the moment
   *
   * @example
   *  'firefox'
   */
  browser: Browser;

  /**
   * @description
   *  the current page
   */
  page: Page;
}

interface Config {
  /**
   * @description
   *  the browsers to test the urls in
   *
   * @example
   *  ['chromium', 'firefox']
   */
  browsers: Array<Browser>;

  /**
   * @description
   *  browser options for launching
   *
   * @default
   *  undefined
   * @example
   *  { headless: !!process.env.CI }
   */
  browserConfig?: LaunchOptions;

  /**
   * @description
   *  path to save the error log to
   *
   * @default
   *  join(process.cwd(), 'play-url-errors.json')
   * @example
   *  join(process.cwd(), 'my-logs.json')
   */
  errorLogs?: string;

  /**
   * @description
   *  if set it'll store screenshots of failed tests to a specified directory
   * * `[browser]`: injects the current browser
   * * `[timestamp]`: injects the timestamp
   * * `[status]`: injects the status code
   * * `[index]`: injects the url position inside the urls-array
   * * `[name]`: injects the url name (if set, otherwise defaulted with `''`)
   *
   * @default
   *  undefined
   * @example
   *  - '[browser]--[timestamp]_[name]' (relative path)
   *  - '/Users/test/Desktop/[browser]--[index]' (absolute path)
   */
  screenshotOnError?: string;

  /**
   * @description
   *  a glob (proceeded via tiny-glob) to find play-url spec files (to define tests on fs base)
   *
   * @default
   *  undefined
   * @example
   *  '**\/*.(spec|test).{js,ts}'
   */
  urlGlob?: string;

  /**
   * @description
   *  the urls to test (merged with urlGlobb-urls)
   *
   * @default
   *  undefined
   * @example
   *  [{ url: 'https://example.com' }]
   */
  urls?: Array<UrlConfig>;
}

interface UrlConfig {
  /**
   * @description
   *  a name for the url (everything which doesn't fit into the regex `[a-z\d\-_]` will be removed if set as filepath)
   *
   * @default
   *  undefined
   * @example
   *  'my-special-test'
   */
  name?: string;

  /**
   * @description
   *  the config to use for a freshly opened page
   *
   * @default
   *  undefined
   * @example
   *  { colorScheme: 'light' }
   */
  pageConfig?: Parameters<PlaywrightBrowser['newPage']>[0];

  /**
   * @description
   *  the visit config to use on the visit of the url
   *
   * @default
   *  undefined
   * @example
   *  { timeout: 5000 }
   */
  visitConfig?: Parameters<Page['goto']>[1];

  /**
   * @description
   *  the url to visit
   *
   * @example
   *  https://example.com
   */
  url: string;

  /**
   * @description
   *  a validation function (can be async), returns something truthy if the page delivers the proper information
   *
   * @default
   *  ({ status }) => status === 200
   * @example
   *  - ({ status }) => status < 400
   *  - ({ browser, status }) => status === 200 && browser !== 'webkit'
   *  - async ({ page }) => page.locator('body').evaluate(body => body.classList.contains('my-class'))
   */
  valid?: (params: ValidParams) => boolean | Promise<boolean>;
}

interface Log {
  browser: Browser;
  name?: string;
  status: number;
  error: string;
  screenshot?: string;
  url: string;
}
