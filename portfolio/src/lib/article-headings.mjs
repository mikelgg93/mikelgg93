import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import { SKIP, visit } from "unist-util-visit";

const heading = (node) =>
	node.type === "element" && /^h[1-6]$/.test(node.tagName);
const element = (tagName, properties, children = []) => ({
	type: "element",
	tagName,
	properties,
	children,
});

// Plain article text only: omit code, hidden maths copies and interactive MDX
// components. The same build pass supplies heading IDs and the search index.
export function articleText(node) {
	if (node.type === "text") return node.value;
	if (
		["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"].includes(node.type)
	)
		return "";
	if (node.name && /^[A-Z]/.test(node.name)) return "";
	if (["pre", "script", "style", "svg"].includes(node.tagName)) return "";
	if (node.properties?.className?.includes("katex-mathml")) return "";
	return (node.children ?? []).map(articleText).join("");
}

export default function articleHeadings() {
	return (tree, file) => {
		if (!file.history.some((path) => /[/\\]content[/\\]blog[/\\]/.test(path)))
			return;
		const reserved = new Set();
		const generated = new Set();
		const authored = new Set();
		visit(tree, (node) => {
			if (node.name && /^[A-Z]/.test(node.name)) return SKIP;
			// Native HTML headings in MDX can also supply an explicit ID.
			if (
				node.type === "mdxJsxFlowElement" &&
				/^h[1-6]$/.test(node.name) &&
				node.attributes.every(
					(attr) =>
						attr.type === "mdxJsxAttribute" && typeof attr.value === "string",
				)
			) {
				node.type = "element";
				node.tagName = node.name;
				node.properties = Object.fromEntries(
					node.attributes.map((attr) => [attr.name, attr.value]),
				);
			}
			if (heading(node)) authored.add(node);
			if (typeof node.properties?.id === "string")
				reserved.add(node.properties.id);
			if (heading(node) && typeof node.properties?.id !== "string")
				generated.add(node);
		});
		rehypeHeadingIds()(tree, file);
		const used = new Set(reserved);
		const sections = [];
		let section = { title: "", id: "", text: "" };
		sections.push(section);
		visit(tree, (node) => {
			if (!authored.has(node)) return;
			if (generated.has(node)) {
				const base = node.properties.id || "section";
				let id = base,
					suffix = 1;
				while (used.has(id)) id = `${base}-${suffix++}`;
				node.properties.id = id;
				used.add(id);
			}
			node.properties["data-article-heading"] = "";
			node.properties.tabIndex = -1;
		});
		// Top-level prose covers the authored article without indexing simulation
		// source files, their controls, or unpublished content embedded in islands.
		for (const node of tree.children) {
			if (heading(node)) {
				section = {
					title: articleText(node).trim(),
					id: node.properties.id,
					text: "",
				};
				sections.push(section);
			} else section.text += ` ${articleText(node)}`;
		}
		file.data.astro.frontmatter ??= {};
		file.data.astro.frontmatter.searchSections = sections.map((item) => ({
			...item,
			text: item.text.replace(/\s+/g, " ").trim(),
		}));
		const es = file.data.astro.frontmatter.lang === "es";
		visit(
			tree,
			(node) => authored.has(node),
			(node) => {
				const title = articleText(node).trim();
				node.children.push(
					element(
						"a",
						{
							href: `#${encodeURIComponent(node.properties.id)}`,
							className: ["heading-link"],
							ariaLabel: `${es ? "Copiar enlace a" : "Copy link to"} ${title}`,
							"data-heading-link": "",
						},
						[
							element(
								"svg",
								{
									width: 16,
									height: 16,
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: 1.5,
									ariaHidden: "true",
								},
								[
									element("path", {
										d: "M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2",
									}),
								],
							),
							element("span", {
								className: ["heading-link-status"],
								role: "status",
							}),
						],
					),
				);
			},
		);
	};
}
