import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Shown on the post page and in social previews. Optional.
    description: z.string().optional(),
    // Drafts build locally but are hidden from the index and from production.
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
