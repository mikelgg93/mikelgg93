// @ts-check

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import remarkDirective from "remark-directive";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// https://astro.build/config
export default defineConfig({
	site: "https://mgg.contact",
	image: {
		domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
	},
	vite: {
		plugins: [tailwindcss()],
	},

	integrations: [react(), mdx({
		remarkPlugins: [remarkMath, remarkDirective, remarkGithubBlockquoteAlert],
		rehypePlugins: [rehypeKatex],
	})],
	prefetch: {
		prefetchAll: true,
		defaultStrategy: "hover",
	},
	markdown: {
		remarkPlugins: [remarkMath, remarkDirective, remarkGithubBlockquoteAlert],
		rehypePlugins: [rehypeKatex],
	},
});
