// Native Plugins/Modules
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

// Third-party Plugins
import htmlMinifier from 'vite-plugin-html-minifier'
import injectHTML from 'vite-plugin-html-inject'

// Custom Plugins
import { sitemapGenerator } from "./custom-vite-plugins/sitemap-generator.js";
import { siteConfigInjector } from "./custom-vite-plugins/site-config-injector.js";
import { getHtmlEntries } from './custom-vite-plugins/html-entry-finder.js';
import { staticDataBuilder } from "./custom-vite-plugins/static-data-builder.js";
import { injections } from "./custom-vite-plugins/static-data-injections.config.js";
import { json5ClientLoader } from "./custom-vite-plugins/json5-client-loader.js";

let siteConfig = {};
try {
  siteConfig = (await import('./site.config.js')).default;
} catch (error) {
  console.warn('\n⚠️ [Warning] site.config.js not found! Run ./init-project.sh to generate it. Falling back to default values.\n');
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
      siteConfigInjector(env, siteConfig),
      sitemapGenerator(siteConfig, srcRoot, htmlPages),
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
