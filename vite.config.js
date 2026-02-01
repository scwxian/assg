// Native Plugins/Modules
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

// Third-party Plugins
import htmlMinifier from 'vite-plugin-html-minifier'
import injectHTML from 'vite-plugin-html-inject'

// Custom Plugins
import { getHtmlEntries } from './custom-vite-plugins/html-entry-finder.js';
import { faqBuilderPlugin } from './custom-vite-plugins/faq-builder-plugin.js'
import { yamlToJson } from "./custom-vite-plugins/yaml-to-json.js";

function htmlBaseUrlReplacer(env) {
  return {
    name: 'html-base-url-replacer',
    transformIndexHtml(html) {

      const replacements = {
        BASE_URL: env.VITE_BASE_URL || '',
        SITE_URL: (env.VITE_SITE_URL || '').replace(/\/$/, ''),
        SITE_NAME: env.VITE_SITE_NAME || 'My Site',
        SITE_DESC: env.VITE_SITE_DESC || 'My Site Description',
        DOMAIN_NAME: env.VITE_DOMAIN_NAME || 'mysite.com',
        BUSINESS_NAME: env.VITE_BUSINESS_NAME || 'My Full Business Name',
        BUSINESS_LOCATION: env.VITE_BUSINESS_LOCATION || 'State, Country',
        BUSINESS_JURISDICTION: env.VITE_BUSINESS_JURISDICTION || 'Country',
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
      yamlToJson(),
      faqBuilderPlugin(),
      injectHTML(),
      htmlBaseUrlReplacer(env),
      htmlMinifier({
        minify: true,
      }),
    ],
    server: {
      watch: {
        usePolling: true,
        ignored: ['**/src/.temp/**']
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
