// Build-time source collection: include every local dependency of Parts I–II.
// A missing dependency fails the build instead of leaving an incomplete Code tab.
const modules = import.meta.glob<string>("./**/*.{ts,tsx,css}", {
	query: "?raw",
	import: "default",
	eager: true,
});

function collect(entry: string) {
	const visited = new Set<string>();
	const files: { path: string; code: string; lang: "ts" | "tsx" | "css" }[] =
		[];
	function visit(path: string) {
		const key = [path, `${path}.ts`, `${path}.tsx`].find((p) => p in modules);
		if (!key) throw new Error(`Missing eye demo source: ${path}`);
		if (visited.has(key)) return;
		visited.add(key);
		const code = modules[key]!;
		files.push({
			path: `eye/${key.slice(2)}`,
			code,
			lang: key.endsWith(".css") ? "css" : key.endsWith(".tsx") ? "tsx" : "ts",
		});
		for (const match of code.matchAll(
			/(?:from\s*|import\s*)["'](\.[^"']+)["']/g,
		)) {
			const segments = [
				...key.split("/").slice(1, -1),
				...match[1]!.split("/"),
			];
			const resolved: string[] = [];
			for (const segment of segments) {
				if (segment === "..") resolved.pop();
				else if (segment !== ".") resolved.push(segment);
			}
			visit(`./${resolved.join("/")}`);
		}
	}
	visit(`./${entry}.tsx`);
	return files;
}

export const corneaSources = {
	step1: collect("cornea/CorneaStep1"),
	aspheric: collect("cornea/CorneaAspheric"),
	astigmatism: collect("cornea/CorneaAstigmatism"),
	layered: collect("cornea/CorneaLayered"),
	tearFilm: collect("cornea/CorneaTearFilm"),
	master: collect("cornea/CorneaMaster"),
	keratoconus: collect("cornea/CorneaKeratoconus"),
	placido: collect("cornea/CorneaPlacido"),
	realistic: collect("cornea/CorneaRealistic"),
};
export const pupilSources = {
	step1: collect("pupil/PupilStep1"),
	parametric: collect("pupil/IrisParametric"),
	step2: collect("pupil/PupilStep2"),
	reflex: collect("pupil/PupilReflex"),
	neon: collect("pupil/PupilHardwareSync"),
	pathway: collect("pupil/NervePathway"),
};
