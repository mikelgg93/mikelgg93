import { lensSources } from "../lens/lensSources";
import debug from "../useViewerDebug.ts?raw";
import models from "./eyeModels.ts?raw";
import comparison from "./ModelComparison.tsx?raw";
import scene from "./ModelScene.tsx?raw";
import geometry from "./modelGeometry.ts?raw";
import css from "./models.css?raw";
import normal from "./NormalVariation.tsx?raw";
import population from "./PopulationVariation.tsx?raw";
import statistics from "./populationModel.ts?raw";

function file(path: string, code: string) {
	const lang: "ts" | "tsx" | "css" = path.endsWith("css")
		? "css"
		: path.endsWith("tsx")
			? "tsx"
			: "ts";
	return { path: `eye/models/${path}`, code, lang };
}
const shared = lensSources.assembly.filter((f) =>
	[
		"eye/eyeDimensions.ts",
		"eye/lens/lensScene.ts",
		"eye/lens/LensViews.tsx",
		"eye/lens/lens.css",
		"eye/disposeThree.ts",
		"eye/threeResize.ts",
	].includes(f.path),
);
const maths = [
	file("eyeModels.ts", models),
	file("populationModel.ts", statistics),
];
const common = [
	file("ModelScene.tsx", scene),
	file("modelGeometry.ts", geometry),
	file("models.css", css),
	...maths,
	...shared,
];
export const modelSources = {
	comparison: [file("ModelComparison.tsx", comparison), ...common],
	normal: [
		file("NormalVariation.tsx", normal),
		{ path: "eye/useViewerDebug.ts", code: debug, lang: "ts" as const },
		...maths,
		file("models.css", css),
		...shared.filter(
			(f) => f.lang === "css" || f.path === "eye/eyeDimensions.ts",
		),
	],
	population: [
		file("PopulationVariation.tsx", population),
		file("ModelComparison.tsx", comparison),
		...common,
	],
};
