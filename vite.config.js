// Native Plugins/Modules
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import siteConfig from './site.config.js';

// Third-party Plugins
import htmlMinifier from 'vite-plugin-html-minifier'
import injectHTML from 'vite-plugin-html-inject'

// Custom Plugins
import { getHtmlEntries } from './custom-vite-plugins/html-entry-finder.js';
import { staticDataBuilder } from "./custom-vite-plugins/static-data-builder.js";
import { injections } from "./custom-vite-plugins/static-data-injections.config.js";
import { json5ClientLoader } from "./custom-vite-plugins/json5-client-loader.js";

function htmlBaseUrlReplacer(env, config) {
  return {
    name: 'html-base-url-replacer',
    transformIndexHtml(html) {

      const replacements = {
        BASE_URL: env.VITE_BASE_URL || '',
        SITE_URL: (config.SITE_URL || '').replace(/\/$/, ''),
        SITE_NAME: config.SITE_NAME || 'My Site',
        SITE_DESC: config.SITE_DESC || 'My Site Description',
        DOMAIN_NAME: config.DOMAIN_NAME || 'mysite.com',
        BUSINESS_NAME: config.BUSINESS_NAME || 'My Full Business Name',
        BUSINESS_LOCATION: config.BUSINESS_LOCATION || 'State, Country',
        BUSINESS_JURISDICTION: config.BUSINESS_JURISDICTION || 'Country',
      }

      return html.replace(/%%(\w+)%%/g, (match, key) => {
        return replacements.hasOwnProperty(key) ? replacements[key] : match;
      });
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const srcRoot = resolve(__dirname, 'src');
  const htmlPages = getHtmlEntries(srcRoot);

  return {
    base: env.VITE_BASE_URL || '/',
    root: 'src',
    envDir: '../',
    publicDir: '../public',
    plugins: [
      json5ClientLoader(),
      staticDataBuilder(injections),
      injectHTML(),
      htmlBaseUrlReplacer(env,siteConfig),
      htmlMinifier({
        minify: true,
      }),
    ],
    server: {
      watch: {
        usePolling: true
      }
    },
    esbuild: {
      drop: ['console', 'debugger']
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: htmlPages
      }
    }
  }
})
