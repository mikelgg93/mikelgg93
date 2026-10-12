import { getCollection } from "astro:content";

// Drafts are available in development and explicit review builds only.
export const includeUnpublished =
	import.meta.env.DEV || import.meta.env.INCLUDE_UNPUBLISHED === "true";

export function getVisiblePosts() {
	return getCollection(
		"blog",
		({ data }) => data.published || includeUnpublished,
	);
}
