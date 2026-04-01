// @ts-check

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import remarkDirective from "remark-directive";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";

// https://astro.build/config
export default defineConfig({
	site: "https://mgg.contact",
	image: {
		domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
	},
	vite: {
		plugins: [tailwindcss()],
	},

	integrations: [react(), mdx()],
	prefetch: {
		prefetchAll: true,
		defaultStrategy: "hover",
	},
	markdown: {
		remarkPlugins: [remarkDirective, remarkGithubBlockquoteAlert],
	},
});
