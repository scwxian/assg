import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

// HELPER FUNCTIONS

/**
 * Checks if the current Vite context path matches the target page.
 * Handles Vite's trailing slashes and index.html variations.
 */
function matchesTargetPage(ctxPath, targetPage) {
  return ctxPath === targetPage || 
         ctxPath === targetPage.replace(/\/$/, '/index.html') ||
         ctxPath === targetPage.replace('/index.html', '/');
}

/**
 * Resolves an image path relative to the 'src' directory.
 * Returns a root-relative path for Vite to hash, or a fallback if missing.
 */
function resolveImage(targetPath, fallbackPath) {
  const fullTargetPath = path.resolve(process.cwd(), 'src', targetPath);
  if (fs.existsSync(fullTargetPath)) {
    return `/${targetPath}`;
  }
  return `/${fallbackPath}`;
}

 // Safely reads and parses a JSON data file from a given relative path.
function loadData(dataPath) {
  if (!dataPath) return null;
  
  const resolvedPath = path.resolve(process.cwd(), dataPath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[StaticDataBuilder] Data file not found: ${resolvedPath}`);
    return null;
  }

  try {
    const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
    return JSON5.parse(rawContent);
  } catch (e) {
    console.error(`[StaticDataBuilder] Error parsing JSON/JSON5 at ${resolvedPath}:`, e);
    return null;
  }
}

 // Determines if a file change should trigger a full browser reload during dev.
function shouldTriggerReload(file, injections) {
  const isDataFile = injections.some(inj => inj.dataPath && path.resolve(process.cwd(), inj.dataPath) === file);
  const isManifest = file.endsWith('static-data-injections.config.js');
  return isDataFile || isManifest;
}


// CORE PLUGIN EXPORT
export function staticDataBuilder(injections = []) {
  return {
    name: 'vite-plugin-static-data-builder',
    enforce: 'pre',

    // 1. Watch data files for changes
    buildStart() {
      injections.forEach(inj => {
        if (inj.dataPath) {
          this.addWatchFile(path.resolve(process.cwd(), inj.dataPath));
        }
      });
    },

    // 2. Intercept and inject HTML
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        let transformedHtml = html;
        const renderCtx = { resolveImage }; 

        for (const injection of injections) {
          if (matchesTargetPage(ctx.path, injection.targetPage)) {
            
            const data = loadData(injection.dataPath);

            try {
              const generatedHtml = injection.renderer(data, renderCtx);
              transformedHtml = transformedHtml.replace(injection.placeholder, generatedHtml);
            } catch (e) {
              console.error(`[StaticDataBuilder] Error rendering HTML for ${injection.placeholder}:`, e);
            }
          }
        }
        return transformedHtml;
      }
    },

    // 3. Hot Module Replacement (HMR)
    handleHotUpdate({ file, server }) {
      if (shouldTriggerReload(file, injections)) {
        server.ws.send({ type: 'full-reload' });
        return []; // Prevent Vite's default routing to force the reload
      }
    }
  };
}
