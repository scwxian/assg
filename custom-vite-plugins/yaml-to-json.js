import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createFilter } from 'vite';

const TEMP_DIR = path.resolve('src', '.temp');

// --- Helpers ---
// Transforms yaml to json and returns new dest path for json
function createMirrorFile(src) {

  const relativePath = path.relative(process.cwd(), src);
  const dest = path.join(TEMP_DIR, relativePath).replace(/\.ya?ml$/, '.json');

  try {
    const yamlContent = fs.readFileSync(src, 'utf8');
    const jsonContent = JSON.stringify(yaml.load(yamlContent));

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (fs.existsSync(dest)) {
      const existingContent = fs.readFileSync(dest, 'utf8');
      if (existingContent === jsonContent) {
        return dest; 
      }
    }

    fs.writeFileSync(dest, jsonContent);
    return dest;
  } catch (e) {
    console.error(`[YAML Mirror] Failed to convert ${src}`, e);
    throw e;
  }
}

// Resolves the absolute path of an import
function resolveAbsolutePath(source, importer) {
  const cleanSource = source.split('?')[0];

  if (cleanSource.startsWith('.')) {
    return importer ? path.resolve(path.dirname(importer), cleanSource) : null;
  } 
  if (cleanSource.startsWith('/')) {
    return path.resolve(process.cwd(), cleanSource.slice(1));
  }
  
  return null;
}

// --- Plugin ---
export function yamlToJson() {
  const filter = createFilter(['**/*.yaml', '**/*.yml'], null);

  return {
    name: 'vite-plugin-yaml-to-json-mirror',
    enforce: 'pre',

    buildStart() {
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    },

    async resolveId(source, importer) {
      if (!source.match(/\.ya?ml/)) return null;

      // Resolve Path
      const absolutePath = resolveAbsolutePath(source, importer);
      if (!absolutePath || !fs.existsSync(absolutePath) || !filter(absolutePath)) {
        return null;
      }

      // Generate Mirror
      const jsonMirrorPath = createMirrorFile(absolutePath);

      // Return JIT Path (preserving query params)
      const query = source.split('?')[1];
      return query ? `${jsonMirrorPath}?${query}` : jsonMirrorPath;
    },

    handleHotUpdate({ file, server }) {
      if (filter(file)) {

        createMirrorFile(file);
        server.ws.send({ type: 'full-reload', path: '*' });

        return [];
      }
    }
  };
}
