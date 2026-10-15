import { getCollection } from "astro:content";
import { visibleInBuild } from "./draft-scope";

// Drafts are available in development and explicit review builds only.
export const includeUnpublished =
	import.meta.env.DEV || import.meta.env.INCLUDE_UNPUBLISHED === "true";

export function getVisiblePosts() {
	return getCollection("blog", ({ id, data }) =>
		visibleInBuild(
			id,
			data.published,
			includeUnpublished,
			process.env.CF_PAGES_BRANCH,
		),
	);
}
