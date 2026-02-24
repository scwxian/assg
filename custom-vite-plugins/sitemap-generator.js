import { relative } from 'path';

export function sitemapGenerator(config, srcRoot, htmlPages) {
  return {
    name: 'vite-plugin-sitemap-generator',
    generateBundle() {
      const siteUrl = config.SITE_URL;
      const siteName = config.SITE_NAME || 'My Site';

      if (!siteUrl) {
        console.warn('[Sitemap Generator] No SITE_URL provided. Skipping sitemap generation.');
        return;
      }

      const baseUrl = siteUrl.replace(/\/$/, '');
      const today = new Date().toISOString().split('T')[0];
      
      let sitemapLinks = '';
      
      for (const filePath of Object.values(htmlPages)) {
        let relativePath = relative(srcRoot, filePath).replace(/\\/g, '/');
        if (relativePath === 'error.html' || relativePath === '404.html') continue;
        let route = relativePath === 'index.html' ? '' : relativePath.replace(/\/index\.html$/, '').replace(/\.html$/, '');
        let priority = '0.80';
        if (route === '') {
          priority = '1.00';
        } else if (route.includes('privacy-policy') || route.includes('terms-of-use') || route.includes('legal')) {
          priority = '0.20';
        }
        
        sitemapLinks += `
  <url>
    <loc>${baseUrl}${route ? '/' + route : ''}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
      }

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapLinks}
</urlset>`;

      const robotsTxt = `# Allow all good search engines by default
User-agent: *
Allow: /

# Specifically disallow AI data harvesting bots
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: CommonCrawl
Disallow: /

User-agent: anthropic-ai
Disallow: /

# Point all crawlers to the auto-generated sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

      const webManifest = `{
  "name": "${siteName}",
  "short_name": "${siteName}",
  "start_url": "/",
  "icons": [
    {
      "src": "/meta-assets/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/meta-assets/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}`;

      // Emit all three files directly into the dist folder
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt });
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: webManifest });
    }
  };
}
