import fs from 'fs';
import path from 'path';

// Recursively collects .css files under src
function collectCss(root, dir = root, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectCss(root, full, found);
    else if (entry.name.endsWith('.css')) found.push(path.relative(root, full));
  }
  return found;
}

// Resolves optional css/js ids from the meta load
export function pageAssets(srcRoot) {
  let cssIndex = null;

  // Index by filename so ids are shared across pages
  function getIndex() {
    if (cssIndex) return cssIndex;
    cssIndex = collectCss(srcRoot).reduce((index, file) => {
      const id = path.basename(file, '.css');
      (index[id] ||= []).push(file.split(path.sep).join('/'));
      return index;
    }, {});
    return cssIndex;
  }

  function resolveCss(id, filename, allowRescan = true) {
    if (!id) return null;

    if (id.startsWith('/')) {
      const direct = `${id.slice(1)}.css`;
      return fs.existsSync(path.join(srcRoot, direct)) ? direct : null;
    }

    const pageDir = path.relative(srcRoot, path.dirname(filename))
      .split(path.sep).join('/');
    const local = pageDir && pageDir !== '.' ? `${pageDir}/${id}.css` : `${id}.css`;
    const candidates = getIndex()[id] || [];
    const hit = candidates.find((file) => file === local) || candidates[0];

    if (!hit) {
      // Rescan once so new files work without a restart
      if (!allowRescan) return null;
      cssIndex = null;
      return resolveCss(id, filename, false);
    }

    if (candidates.length > 1) {
      console.debug(`[page-assets] Multiple CSS for "${id}":`, candidates);
    }

    return hit;
  }

  return {
    name: 'vite-plugin-page-assets',
    transformIndexHtml: {
      // Must run before html-inject expands <load>
      order: 'pre',
      handler(html, ctx) {
        const metaTag = html.match(/<load\b[^>]*src="[^"]*partials\/meta\.html"[^>]*>/i)?.[0];
        if (!metaTag) return html;

        const readId = (name) => (metaTag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] ?? '').trim();
        const jsId = readId('js');
        const cssId = readId('css');
        const isValid = (id) => !id || /^[\w/-]+$/.test(id);

        if (!isValid(jsId) || !isValid(cssId)) {
          console.warn('[page-assets] Ignoring invalid id in meta load');
          return html;
        }

        let out = html.replace(/<main\b([^>]*\bid="swup"[^>]*)>/i, (tag, attrs) => {
          const cleaned = attrs.replace(/\s*data-page="[^"]*"/i, '');
          return `<main${cleaned}${jsId ? ` data-page="${jsId}"` : ''}>`;
        });

        const filename = ctx.filename || path.join(srcRoot, ctx.path || '');
        const cssFile = resolveCss(cssId, filename);

        if (cssFile) {
          out = out.replace(/<\/head>/i, `    <link href="/${cssFile}" rel="stylesheet">\n  </head>`);
        } else if (cssId) {
          console.warn(`[page-assets] No CSS for "${cssId}" (${filename})`);
        }

        return out;
      }
    }
  };
}
