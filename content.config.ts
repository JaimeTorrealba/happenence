import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { asSitemapCollection } from '@nuxtjs/sitemap/content'

// Every Markdown file in /content becomes a page (content/index.md -> "/").
// `links` is read by Nuxt Content's built-in /raw/<page>.md route and appended as a list.
export default defineContentConfig({
  collections: {
    pages: defineCollection(
      asSitemapCollection({
        type: 'page',
        source: '**/*.md',
        schema: z.object({
          buttonText: z.string().optional(),
          buttonLink: z.string().optional(),
          links: z
            .array(
              z.object({
                label: z.string(),
                to: z.string(),
                image: z.string().optional(),
                imageAlt: z.string().optional(),
              }),
            )
            .optional(),
        }),
      }),
    ),
  },
})
