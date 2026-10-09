import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// A portable, offline HTML file: all JavaScript, CSS and fonts are embedded.
// This is deliberately separate from Astro's route build and changes no deploy settings.
const root = resolve(import.meta.dir, "..");
const result = await Bun.build({
	entrypoints: [
		resolve(root, "src/components/eye/presentation/standalone.tsx"),
	],
	format: "iife",
	target: "browser",
	minify: true,
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
if (!result.success)
	throw new AggregateError(result.logs, "Presentation bundle failed");
const script = await result.outputs
	.find((output) => output.path.endsWith(".js"))
	?.text();
const style = await result.outputs
	.find((output) => output.path.endsWith(".css"))
	?.text();
if (!script || !style)
	throw new Error("Missing presentation JavaScript or CSS");
let fonts = "";
for (const [family, name, weight, style] of [
	["geist-sans", "Geist Sans", 400, "normal"],
	["geist-mono", "Geist Mono", 400, "normal"],
	["old-standard-tt", "Old Standard TT", 400, "italic"],
] as const) {
	const file = resolve(
		root,
		`node_modules/@fontsource/${family}/files/${family}-latin-${weight}-${style}.woff2`,
	);
	const bytes = await readFile(file);
	fonts += `@font-face{font-family:'${name}';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${bytes.toString("base64")}) format('woff2')}\n`;
}
// Preserve the licences with the portable file; Michelangelus is never bundled.
const notices = await Promise.all(
	[
		"@fontsource/geist-sans",
		"@fontsource/geist-mono",
		"@fontsource/old-standard-tt",
		"three",
		"react",
		"react-dom",
		"scheduler",
	].map(
		async (name) =>
			`${name}\n${await readFile(resolve(root, "node_modules", name, "LICENSE"), "utf8")}`,
	),
);
const licences = notices.join("\n\n").replaceAll("</script", "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#000000"><title>Building an eye · WebGL construction notes</title><style>${fonts}${style}</style></head><body><script type="text/plain" id="third-party-notices">${licences}</script><div id="presentation"></div><noscript>This animated presentation needs JavaScript and WebGL.</noscript><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>`;
const output = resolve(root, "dist/presentations/webgl-eye/standalone.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html);
console.log(
	`Offline presentation written to ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
);
