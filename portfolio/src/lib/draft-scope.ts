// Cloudflare provides the original Git branch name at build time.
const articleBranches: Record<string, string> = {
	"webgl-eye-03-lens": "webgl-eye-03-lens",
	"webgl-eye-04-retina": "webgl-eye-04-retina",
	"webgl-eye-05-motility": "webgl-eye-05-motility",
	"webgl-eye-06-models": "webgl-eye-06-models",
};
export function visibleInBuild(
	id: string,
	published: boolean,
	includeDrafts: boolean,
	branch = "",
) {
	if (published) return true;
	if (!includeDrafts) return false;
	const article = articleBranches[branch];
	return !article || id.replace(/-es$/, "") === article;
}
