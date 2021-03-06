import type { Config, UrlConfig } from './types';

export { defineConfig, defineUrl };

const createResolver =
  <T>() =>
  (obj: T | (() => T | Promise<T>)) =>
    typeof obj !== 'function' ? obj : (obj as () => T | Promise<T>)();

const defineConfig = createResolver<Config>();

const defineUrl = createResolver<UrlConfig>();
