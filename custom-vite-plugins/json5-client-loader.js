import JSON5 from 'json5';

export function json5ClientLoader() {
  return {
    name: 'vite-plugin-json5-loader',
    transform(code, id) {
      if (id.endsWith('.json5')) {
        try {
          const parsedData = JSON5.parse(code);
          
          return {
            code: `export default ${JSON.stringify(parsedData)};`,
            map: null
          };
        } catch (error) {
          console.error(`[json5-client-loader] Error parsing ${id}:`, error.message);
          this.error(error);
        }
      }
    }
  };
}
