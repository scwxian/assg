export function siteConfigInjector(env, config = {}) {
  return {
    name: 'vite-plugin-site-config-injector',
    transformIndexHtml(html) {
      
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.SITE_URL) {
        sanitizedConfig.SITE_URL = sanitizedConfig.SITE_URL.replace(/\/$/, '');
      }

      const replacements = {
        BASE_URL: env.VITE_BASE_URL || '',
        ...sanitizedConfig
      };

      return html.replace(/%%(\w+)%%/g, (match, key) => {
        return replacements.hasOwnProperty(key) ? replacements[key] : match;
      });
    }
  };
}
