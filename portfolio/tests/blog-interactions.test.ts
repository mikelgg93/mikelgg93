import { describe, expect, test } from "bun:test";
import type { Element } from "hast";
import articleHeadings from "../src/lib/article-headings.mjs";
import { articleDates, formatArticleDate } from "../src/lib/articleDates";
import { searchEntries, searchSnippet } from "../src/lib/search";

const h = (text: string, id?: string): Element => ({
	type: "element",
	tagName: "h2",
	properties: id ? { id } : {},
	children: [{ type: "text", value: text }],
});

describe("authored heading anchors", () => {
	test("retains explicit IDs and reserves them before generating duplicate slugs", () => {
		const tree = {
			type: "root",
			children: [
				h("Repeated heading"),
				h("A deliberate ID", "repeated-heading"),
				h("Repeated heading"),
				h("Acentuación y visión"),
			],
		};
		const file = { history: ["/src/content/blog/test.mdx"], data: {} };
		articleHeadings()(tree, file);
		const ids = tree.children.map((node) => node.properties.id);
		expect(new Set(ids).size).toBe(4);
		expect(ids[1]).toBe("repeated-heading");
		expect(ids[3]).toBe("acentuación-y-visión");
		for (const node of tree.children)
			expect((node.children.at(-1) as Element).properties.href).toBe(
				`#${encodeURIComponent(String(node.properties.id))}`,
			);
	});
	test("does not decorate non-article content or index interactive component internals", () => {
		const tree = { type: "root", children: [h("Interface title")] };
		articleHeadings()(tree, { history: ["/src/pages/test.mdx"], data: {} });
		expect(tree.children[0]?.children.length).toBe(1);
		const article = {
			type: "root",
			children: [
				h("Public section"),
				{
					type: "mdxJsxFlowElement",
					name: "PrivatePreview",
					children: [
						{ type: "text", value: "Do not index this component's children" },
					],
				},
			],
		};
		const file = { history: ["/src/content/blog/test.mdx"], data: {} };
		articleHeadings()(article, file);
		expect(JSON.stringify(file.data)).not.toContain("Do not index");
	});
});

describe("publication metadata", () => {
	test("hides draft dates and rejects invalid or pre-publication revision dates", () => {
		expect(
			articleDates({
				published: false,
				date: "2026-10-07",
				updated: "2026-10-14",
			}),
		).toEqual({ published: null, updated: null });
		expect(
			articleDates({ published: true, date: "not a date" }).published,
		).toBeNull();
		expect(
			articleDates({
				published: true,
				date: "2026-07-27",
				updated: "2026-07-26",
			}).updated,
		).toBeNull();
	});
	test("keeps the original date and a separately authored meaningful revision", () => {
		const dates = articleDates({
			published: true,
			date: "2026-07-27",
			updated: "2026-10-14",
		});
		expect(formatArticleDate(dates.published!, "en")).toBe("27 July 2026");
		expect(formatArticleDate(dates.updated!, "en")).toBe("14 October 2026");
	});
});

test("search ranks titles and matches accents and contextual section text", () => {
	const section = {
		title: "The cornea",
		type: "Section" as const,
		url: "/blog/cornea#reflections",
		description: "Reflections",
		text: `${"Intro ".repeat(30)}asphericity in an optical model`,
		lang: "en" as const,
	};
	const spanish = { ...section, title: "Visión", lang: "es" as const };
	const title = {
		...section,
		title: "Asphericity",
		type: "Article" as const,
		url: "/blog/asphericity",
	};
	const results = searchEntries([section, spanish, title], "asphericity", "en");
	expect(results[0]?.title).toBe("Asphericity");
	expect(searchEntries([spanish], "vision", "en")).toHaveLength(1);
	expect(searchSnippet(section, "asphericity")).toContain("asphericity");
	expect(searchEntries([section], "asphericity", "en", true)).toHaveLength(0);
});
