import { retinalPoint } from "./retinaAnatomy";

/** Equivalent principal plane chosen for emmetropia at rest; not a surface ray tracer. */
export function retinalFocus(demand: number, response: number) {
	const bounded = (x: number) =>
		Number.isFinite(x) ? Math.min(8, Math.max(0, x)) : 0;
	const retinalZ = retinalPoint(0, 0).z;
	const principalZ = retinalZ + (1000 * (4 / 3)) / 60;
	const focusZ =
		principalZ - (1000 * (4 / 3)) / (60 + bounded(response) - bounded(demand));
	return { principalZ, focusZ, retinalZ, errorMm: focusZ - retinalZ };
}
