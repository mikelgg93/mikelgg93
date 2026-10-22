import { lensSources } from "../lens/lensSources";
import { simulationSources } from "../simulationSources";
import profile from "./globeProfile.ts?raw";
import posterior from "./posteriorEye.ts?raw";
import assembly from "./RetinaAssembly.tsx?raw";
import cup from "./RetinaCup.tsx?raw";
import layers from "./RetinaLayers.tsx?raw";
import cells from "./RetinalCells.tsx?raw";
import focusInset from "./RetinalFocusInset.tsx?raw";
import mosaic from "./RetinaMosaic.tsx?raw";
import sampling from "./RetinaSampling.tsx?raw";
import surface from "./RetinaSurface.tsx?raw";
import css from "./retina.css?raw";
import anatomy from "./retinaAnatomy.ts?raw";
import geometry from "./retinaGeometry.ts?raw";
import focus from "./retinalFocus.ts?raw";
import model from "./retinaModel.ts?raw";

function file(path: string, code: string) {
	const lang: "ts" | "tsx" | "css" = path.endsWith("css")
		? "css"
		: path.endsWith("tsx")
			? "tsx"
			: "ts";
	return { path: `eye/retina/${path}`, code, lang };
}
const shared = [
	file("retinaModel.ts", model),
	file("retina.css", css),
	...simulationSources,
];
const common3D = lensSources.assembly.filter((f) =>
	[
		"eye/eyeDimensions.ts",
		"eye/lens/lensScene.ts",
		"eye/lens/lens.css",
		"eye/disposeThree.ts",
		"eye/threeResize.ts",
	].includes(f.path),
);
const styles = common3D.filter((f) => f.lang === "css");
export const retinaSources = {
	cup: [
		file("RetinaCup.tsx", cup),
		file("retinaGeometry.ts", geometry),
		...shared,
		...common3D,
	],
	surface: [
		file("RetinaSurface.tsx", surface),
		file("posteriorEye.ts", posterior),
		file("globeProfile.ts", profile),
		file("retinaAnatomy.ts", anatomy),
		...shared,
		...lensSources.assembly.filter(
			(f) =>
				!f.path.endsWith("LensAssembly.tsx") &&
				!simulationSources.some((s) => s.path === f.path),
		),
	],
	layers: [
		file("RetinalCells.tsx", cells),
		file("RetinaLayers.tsx", layers),
		...shared,
		...styles,
	],
	mosaic: [file("RetinaMosaic.tsx", mosaic), ...shared, ...common3D],
	sampling: [file("RetinaSampling.tsx", sampling), ...shared, ...styles],
	assembly: [
		file("RetinaAssembly.tsx", assembly),
		file("retinalFocus.ts", focus),
		file("RetinalFocusInset.tsx", focusInset),
		file("posteriorEye.ts", posterior),
		file("globeProfile.ts", profile),
		file("retinaAnatomy.ts", anatomy),
		...shared,
		...lensSources.assembly.filter(
			(f) =>
				![
					...simulationSources.map((file) => file.path),
					"eye/lens/LensAssembly.tsx",
					"eye/lens/intraocularLens.ts",
					"eye/lens/LensViews.tsx",
				].includes(f.path),
		),
	],
};
