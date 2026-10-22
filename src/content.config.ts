import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_SLUGS } from './consts';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			category: z.enum(CATEGORY_SLUGS),
			heroImage: z.optional(image()),
			heroAlt: z.string().min(1).optional(),
		}).refine(({ heroImage, heroAlt }) => !heroImage || heroAlt, {
			message: 'heroAlt est obligatoire dès qu’il y a un heroImage',
			path: ['heroAlt'],
		}),
});

export const collections = { blog };
