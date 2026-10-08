// Build-time sources only: used by the article's Astro code viewer.

import dispose from "../disposeThree.ts?raw";
import resize from "../threeResize.ts?raw";
import geometry from "./ciliaryGeometry.ts?raw";
import anatomy from "./LensAnatomy.tsx?raw";
import cataract from "./LensCataract.tsx?raw";
import domes from "./LensDomes.tsx?raw";
import focus from "./LensFocus.tsx?raw";
import grin from "./LensGrin.tsx?raw";
import views from "./LensViews.tsx?raw";
import css from "./lens.css?raw";
import model from "./lensModel.ts?raw";
import optics from "./lensOptics.ts?raw";
import scene from "./lensScene.ts?raw";

function file(path: string, code: string) {
	const lang: "ts" | "tsx" | "css" = path.endsWith(".css")
		? "css"
		: path.endsWith(".tsx")
			? "tsx"
			: "ts";
	return { path, code, lang };
}
const local = (name: string, code: string) => file(`eye/lens/${name}`, code);
const styles = local("lens.css", css);
const opticalModel = local("lensOptics.ts", optics);
const accommodation = local("lensModel.ts", model);
const shared3D = [
	local("LensViews.tsx", views),
	local("lensScene.ts", scene),
	file("eye/disposeThree.ts", dispose),
	file("eye/threeResize.ts", resize),
	styles,
];
export const lensSources = {
	domes: [local("LensDomes.tsx", domes), opticalModel, ...shared3D],
	grin: [local("LensGrin.tsx", grin), opticalModel, styles],
	anatomy: [
		local("LensAnatomy.tsx", anatomy),
		local("ciliaryGeometry.ts", geometry),
		accommodation,
		opticalModel,
		...shared3D,
	],
	focus: [local("LensFocus.tsx", focus), accommodation, styles],
	cataract: [local("LensCataract.tsx", cataract), ...shared3D],
};
