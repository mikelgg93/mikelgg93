import { RETINAL_WALL } from "./retinaAnatomy";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

/** Equivalent principal plane chosen for emmetropia at rest; not a surface ray tracer. */
export function retinalFocus(demand: number, response: number) {
	const bounded = (x: number) =>
		Number.isFinite(x) ? Math.min(8, Math.max(0, x)) : 0;
	// Illustrative receiving plane, 50 micrometres anterior to the RPE proxy.
	const retinalZ = CUP_CENTRE_Z - CUP_RADIUS - RETINAL_WALL + 0.05;
	const principalZ = retinalZ + (1000 * (4 / 3)) / 60;
	const focusZ =
		principalZ - (1000 * (4 / 3)) / (60 + bounded(response) - bounded(demand));
	return {
		principalZ,
		focusZ,
		retinalZ,
		errorMm: focusZ - retinalZ,
		defocusD: bounded(response) - bounded(demand),
	};
}

export type RetinalFocusResult = ReturnType<typeof retinalFocus>;
export function rayHeight(
	height: number,
	z: number,
	model: RetinalFocusResult,
) {
	return (height * (z - model.focusZ)) / (model.principalZ - model.focusZ);
}
