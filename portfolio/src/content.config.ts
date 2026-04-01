import { defineCollection } from "astro:content";
import { z } from "astro:schema";
import { glob } from "astro/loaders";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		date: z.date().or(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		author: z.string().optional(),
		lang: z.string().optional(),
		image: z.string().optional(),
	}),
});

export const collections = {
	blog,
};
