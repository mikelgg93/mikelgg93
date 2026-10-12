import { strToU8, zipSync } from "three/examples/jsm/libs/fflate.module.js";

export function GET() {
	const sources = import.meta.glob<string>("/examples/eye-starter/*", {
		query: "?raw",
		import: "default",
		eager: true,
	});
	const files = Object.fromEntries(
		Object.entries(sources).map(([path, text]) => [
			`eye-starter/${path.split("/").at(-1)}`,
			strToU8(text),
		]),
	);
	const archive = zipSync(files, { mtime: new Date(1980, 0, 1) });
	return new Response(new Uint8Array(archive), {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": "attachment; filename=eye-starter.zip",
		},
	});
}
