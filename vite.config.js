// Native Plugins/Modules
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

// Third-party Plugins
import htmlMinifier from 'vite-plugin-html-minifier'
import injectHTML from 'vite-plugin-html-inject'

// Custom Plugins
import { mediaAssets } from "./custom-vite-plugins/media-assets.js";
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

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const srcRoot = resolve(__dirname, 'src');
  const htmlPages = getHtmlEntries(srcRoot);

  // MEDIA_CDN_URL wins for build output and dev proxy.
  // MEDIA_ORIGIN_URL only affects the dev/preview proxy.
  const mediaOriginUrl = (process.env.MEDIA_ORIGIN_URL ?? env.MEDIA_ORIGIN_URL ?? '').trim().replace(/\/+$/, '');
  const mediaCdnUrl = (process.env.MEDIA_CDN_URL ?? env.MEDIA_CDN_URL ?? '').trim().replace(/\/+$/, '');
  const mediaProxyTarget = mediaCdnUrl || mediaOriginUrl || (siteConfig.SITE_URL || '').replace(/\/+$/, '');

  const basePath = (env.VITE_BASE_URL || '/').replace(/\/+$/, '');
  const mediaRule = mediaProxyTarget
    ? { target: mediaProxyTarget, changeOrigin: true }
    : null;
  const mediaProxy = mediaRule
    ? {
        ...(basePath && basePath !== '/'
          ? {
              [`${basePath}/media`]: {
                ...mediaRule,
                rewrite: (requestPath) =>
                  requestPath.startsWith(basePath)
                    ? requestPath.slice(basePath.length)
                    : requestPath,
              },
            }
          : {}),
        '/media': mediaRule,
      }
    : undefined;

  if (command === 'serve') {
    if (mediaProxyTarget) {
      console.log(`[media] /media proxy -> ${mediaProxyTarget}`);
    } else {
      console.warn(
        '\n⚠️ [media] MEDIA_CDN_URL/MEDIA_ORIGIN_URL/SITE_URL is empty. /media will 404 in dev.\n'
      );
    }
  }

  return {
    base: env.VITE_BASE_URL || '/',
    root: 'src',
    envDir: '../',
    publicDir: '../public',
    plugins: [
      mediaAssets(env, mode),
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
      },
      proxy: mediaProxy,
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rolldownOptions: {
        input: htmlPages,
        output: {
          minify: {
            compress: {
              drop_console: true,
              drop_debugger: true
            }
          }
        }
      }
    }
  }
})
