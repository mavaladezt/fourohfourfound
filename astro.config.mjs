// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Used for absolute URLs in the RSS feed and social meta tags.
  site: 'https://fourohfourfound.com',

  markdown: {
    shikiConfig: {
      // Inherits the site's own CSS variables so code blocks match the palette.
      theme: 'css-variables',
      wrap: true,
    },
  },

  integrations: [sitemap()],
});