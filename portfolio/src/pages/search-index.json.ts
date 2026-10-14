import { getCollection, render } from "astro:content";
import type { APIRoute } from "astro";
import SpanishResume from "public/es-resume.json";
import Resume from "public/resume.json";
import type { SearchEntry } from "@/lib/search";

export const prerender = true;

export const GET: APIRoute = async () => {
	const entries: SearchEntry[] = [];
	// Deliberately stricter than getVisiblePosts: review builds must not index drafts.
	const posts = await getCollection(
		"blog",
		({ data }) => data.published === true,
	);
	for (const post of posts) {
		const lang = post.data.lang === "es" ? "es" : "en";
		const url = `${lang === "es" ? "/es" : ""}/blog/${post.id.replace(/-es$/, "")}`;
		const { remarkPluginFrontmatter } = await render(post);
		const sections = (remarkPluginFrontmatter.searchSections ?? []) as {
			title: string;
			id: string;
			text: string;
		}[];
		entries.push({
			title: post.data.title,
			type: "Article",
			url,
			description: post.data.description ?? "",
			text: sections[0]?.text ?? "",
			lang,
		});
		for (const section of sections.filter((section) => section.id)) {
			entries.push({
				title: `${section.title} · ${post.data.title}`,
				type: "Section",
				url: `${url}#${encodeURIComponent(section.id)}`,
				description: section.text.slice(0, 200),
				text: section.text,
				lang,
			});
		}
		if (
			post.id === "webgl-eye-01-cornea" ||
			post.id === "webgl-eye-01-cornea-es"
		) {
			entries.push({
				title: "WebGL eye",
				type: "Project",
				url,
				description: post.data.description ?? "",
				text:
					lang === "es"
						? "Una serie de modelos oculares interactivos con WebGL y Three.js."
						: "An interactive eye-modelling series built with WebGL and Three.js.",
				lang,
			});
		}
	}
	// Only fields already displayed on the portfolio, never a dump of resume.json.
	for (const [lang, resume] of [
		["en", Resume],
		["es", SpanishResume],
	] as const) {
		const home = lang === "es" ? "/es/" : "/";
		for (const [id, title, text] of [
			["about", lang === "es" ? "Sobre mí" : "About", resume.basics.about],
			[
				"experience",
				lang === "es" ? "Experiencia" : "Experience",
				resume.work
					.map((job) => `${job.position} ${job.name} ${job.summary}`)
					.join(" "),
			],
			[
				"publications",
				lang === "es" ? "Publicaciones" : "Publications",
				"Research publications",
			],
			[
				"contact",
				lang === "es" ? "Contacto" : "Contact",
				"Email and public profiles",
			],
		] as const)
			entries.push({
				title,
				type: "Section",
				url: `${home}#${id}`,
				description: text.slice(0, 200),
				text,
				lang,
			});
		for (const publication of resume.publications) {
			entries.push({
				title: publication.citation,
				type: "Publication",
				url: publication.url || `${home}#publications`,
				description: "",
				text: publication.citation,
				lang,
			});
		}
	}
	return new Response(JSON.stringify(entries), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
