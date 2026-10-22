// Build-time sources only: used by the article's Astro code viewer.

import conic from "../cornea/conic.ts?raw";
import dispose from "../disposeThree.ts?raw";
import dimensions from "../eyeDimensions.ts?raw";
import { simulationSources } from "../simulationSources";
import resize from "../threeResize.ts?raw";
import cycle from "./accommodationCycle.ts?raw";
import anterior from "./anteriorEyeGeometry.ts?raw";
import profile from "./anteriorSegmentProfile.ts?raw";
import apparatus from "./ciliaryApparatus.ts?raw";
import geometry from "./ciliaryGeometry.ts?raw";
import cue from "./FocusCue.tsx?raw";
import anatomy from "./LensAnatomy.tsx?raw";
import assembly from "./LensAssembly.tsx?raw";
import cataract from "./LensCataract.tsx?raw";
import divider from "./LensDivider.tsx?raw";
import domes from "./LensDomes.tsx?raw";
import focus from "./LensFocus.tsx?raw";
import grin from "./LensGrin.tsx?raw";
import surface from "./LensSurface.tsx?raw";
import css from "./lens.css?raw";
import construction from "./lensConstruction.ts?raw";
import material from "./lensMaterial.ts?raw";
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
const motionSources = [
	local("accommodationCycle.ts", cycle),
	local("FocusCue.tsx", cue),
];
const constructionSource = local("lensConstruction.ts", construction);
const shared3D = [
	file("eye/cornea/conic.ts", conic),
	constructionSource,
	local("anteriorSegmentProfile.ts", profile),
	...simulationSources,
	file("eye/eyeDimensions.ts", dimensions),
	local("lensScene.ts", scene),
	local("lensMaterial.ts", material),
	file("eye/disposeThree.ts", dispose),
	file("eye/threeResize.ts", resize),
	styles,
];
export const lensSources = {
	assembly: [
		local("LensAssembly.tsx", assembly),
		...motionSources,
		local("anteriorEyeGeometry.ts", anterior),
		local("ciliaryApparatus.ts", apparatus),
		local("ciliaryGeometry.ts", geometry),
		accommodation,
		opticalModel,
		...shared3D,
	],
	domes: [local("LensDomes.tsx", domes), ...shared3D],
	surface: [
		local("LensSurface.tsx", surface),
		local("LensDivider.tsx", divider),
		...shared3D,
	],
	grin: [
		local("LensGrin.tsx", grin),
		opticalModel,
		styles,
		...simulationSources,
	],
	anatomy: [
		local("LensAnatomy.tsx", anatomy),
		...motionSources,
		local("ciliaryGeometry.ts", geometry),
		local("ciliaryApparatus.ts", apparatus),
		accommodation,
		opticalModel,
		...shared3D,
	],
	focus: [
		local("LensFocus.tsx", focus),
		...simulationSources,
		accommodation,
		constructionSource,
		styles,
	],
	cataract: [local("LensCataract.tsx", cataract), ...shared3D],
};
