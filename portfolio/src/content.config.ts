import { defineCollection } from "astro:content";
import { z } from "astro:schema";
import { glob } from "astro/loaders";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
	schema: z
		.object({
			title: z.string(),
			published: z.boolean().default(false),
			description: z.string().optional(),
			// First publication on the default branch; omit while still a draft.
			date: z.date().or(z.string()).optional(),
			// Set explicitly for meaningful content revisions, never from build/git time.
			updated: z.date().or(z.string()).optional(),
			tags: z.array(z.string()).optional(),
			author: z.string().optional(),
			lang: z.string().optional(),
			image: z.string().optional(),
		})
		.refine(
			(data) =>
				!data.published ||
				(data.date !== undefined &&
					Number.isFinite(new Date(data.date).valueOf())),
			{
				message:
					"Published posts need a valid date: set it when publishing the draft on master.",
				path: ["date"],
			},
		),
});

export const collections = {
	blog,
};
