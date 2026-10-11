import { lensSources } from "../lens/lensSources";
import debug from "../useViewerDebug.ts?raw";
import posterior from "./posteriorEye.ts?raw";
import assembly from "./RetinaAssembly.tsx?raw";
import cup from "./RetinaCup.tsx?raw";
import layers from "./RetinaLayers.tsx?raw";
import mosaic from "./RetinaMosaic.tsx?raw";
import sampling from "./RetinaSampling.tsx?raw";
import css from "./retina.css?raw";
import anatomy from "./retinaAnatomy.ts?raw";
import geometry from "./retinaGeometry.ts?raw";
import model from "./retinaModel.ts?raw";

function file(path: string, code: string) {
	const lang: "ts" | "tsx" | "css" = path.endsWith("css")
		? "css"
		: path.endsWith("tsx")
			? "tsx"
			: "ts";
	return { path: `eye/retina/${path}`, code, lang };
}
const shared = [file("retinaModel.ts", model), file("retina.css", css)];
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
const debugSource = {
	path: "eye/useViewerDebug.ts",
	code: debug,
	lang: "ts" as const,
};
export const retinaSources = {
	cup: [
		file("RetinaCup.tsx", cup),
		file("retinaGeometry.ts", geometry),
		...shared,
		...common3D,
	],
	layers: [file("RetinaLayers.tsx", layers), debugSource, ...shared, ...styles],
	mosaic: [file("RetinaMosaic.tsx", mosaic), ...shared, ...common3D],
	sampling: [
		file("RetinaSampling.tsx", sampling),
		debugSource,
		...shared,
		...styles,
	],
	assembly: [
		file("RetinaAssembly.tsx", assembly),
		file("posteriorEye.ts", posterior),
		file("retinaAnatomy.ts", anatomy),
		...shared,
		...lensSources.assembly.filter(
			(f) =>
				![
					"eye/lens/LensAssembly.tsx",
					"eye/lens/intraocularLens.ts",
					"eye/lens/LensViews.tsx",
				].includes(f.path),
		),
	],
};
