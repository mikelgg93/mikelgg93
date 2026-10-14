export interface SearchEntry {
	title: string;
	type: "Article" | "Section" | "Project" | "Publication";
	url: string;
	description: string;
	text: string;
	lang: "en" | "es";
}

const normalise = (value: string) =>
	value.toLocaleLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export function searchEntries(
	entries: SearchEntry[],
	query: string,
	lang: string,
	projectsOnly = false,
) {
	const words = normalise(query).trim().split(/\s+/).filter(Boolean);
	return entries
		.filter((entry) => !projectsOnly || entry.type === "Project")
		.map((entry) => {
			const title = normalise(entry.title),
				description = normalise(entry.description),
				text = normalise(entry.text);
			if (
				!words.every((word) => `${title} ${description} ${text}`.includes(word))
			)
				return { entry, score: -1 };
			const score = words.reduce(
				(sum, word) =>
					sum + (title.includes(word) ? 8 : description.includes(word) ? 3 : 1),
				entry.lang === lang ? 2 : 0,
			);
			return { entry, score };
		})
		.filter(({ score }) => score >= 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 12)
		.map(({ entry }) => entry);
}

export function searchSnippet(entry: SearchEntry, query: string) {
	const words = normalise(query).trim().split(/\s+/).filter(Boolean);
	const body = entry.text || entry.description;
	const index =
		words
			.map((word) => normalise(body).indexOf(word))
			.filter((i) => i >= 0)
			.sort((a, b) => a - b)[0] ?? 0;
	const start = Math.max(0, index - 45);
	return `${start ? "…" : ""}${body.slice(start, start + 170).trim()}${body.length > start + 170 ? "…" : ""}`;
}
