import { retinaSources } from "../retina/retinaSources";
import demo from "./ExtraocularDemo.tsx?raw";
import css from "./motility.css?raw";
import geometry from "./motilityGeometry.ts?raw";
import model from "./motilityModel.ts?raw";

const file = (name: string, code: string, lang: "ts" | "tsx" | "css") => ({
	path: `eye/motility/${name}`,
	code,
	lang,
});
export const motilitySources = [
	file("ExtraocularDemo.tsx", demo, "tsx"),
	file("motilityModel.ts", model, "ts"),
	file("motilityGeometry.ts", geometry, "ts"),
	file("motility.css", css, "css"),
	...retinaSources.assembly.filter(
		(f) =>
			![
				"eye/retina/RetinaAssembly.tsx",
				"eye/retina/RetinalFocusInset.tsx",
				"eye/retina/retinalFocus.ts",
			].includes(f.path),
	),
];
