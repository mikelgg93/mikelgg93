// @ts-check

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import articleHeadings from "./src/lib/article-headings.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://mgg.contact",
	image: {
		domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
	},
	vite: {
		plugins: [tailwindcss()],
	},

	integrations: [
		{
			name: "preview-only-slides",
			hooks: {
				"astro:config:setup": ({ command, injectRoute }) => {
					// Omit the route and its client bundle from production builds.
					if (command === "dev" || process.env.INCLUDE_UNPUBLISHED === "true") {
						injectRoute({
							pattern: "/presentations/webgl-eye",
							entrypoint:
								"./src/components/eye/presentation/PresentationPage.astro",
						});
					}
				},
			},
		},
		react(),
		mdx({
			remarkPlugins: [remarkMath, remarkDirective, remarkGithubBlockquoteAlert],
			rehypePlugins: [rehypeKatex, articleHeadings],
		}),
	],
	prefetch: {
		prefetchAll: true,
		defaultStrategy: "hover",
	},
	markdown: {
		remarkPlugins: [remarkMath, remarkDirective, remarkGithubBlockquoteAlert],
		rehypePlugins: [rehypeKatex, articleHeadings],
	},
});
