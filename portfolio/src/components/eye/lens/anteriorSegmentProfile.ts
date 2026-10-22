import { conicSag } from "../cornea/conic";
import { CORNEAL_APEX_Z, POSTERIOR_CORNEAL_APEX_Z } from "../eyeDimensions";

// Shared drawing landmarks (mm), not fitted ocular biometry. Positive z is anterior.
// The corneoscleral wall, iris root and ciliary attachment use the same points.
export const LIMBUS_RADIUS = 5.8;
export const IRIS_ROOT_RADIUS = 6;
export const IRIS_ROOT_Z = 1.3;
// Smooth anterior globe meridians, fitted to the chosen equator and limbal
// endpoints. The ciliary attachment follows the wall, not the other way round.
export function scleralWallRadius(z: number, outer = false) {
	const radius = outer ? 12.2 : 11.5;
	const limbusZ = outer
		? CORNEAL_APEX_Z - conicSag(LIMBUS_RADIUS, 0, 7.8, 7.8, -0.26)
		: POSTERIOR_CORNEAL_APEX_Z - conicSag(LIMBUS_RADIUS, 0, 6.5, 6.5, -0.4);
	const axial = (limbusZ + 7.6) / Math.sqrt(1 - (LIMBUS_RADIUS / radius) ** 2);
	return radius * Math.sqrt(Math.max(0, 1 - ((z + 7.6) / axial) ** 2));
}
export const ciliaryWallRadius = (z: number) => scleralWallRadius(z);
export const CILIARY_OUTER_PROFILE = Array.from({ length: 33 }, (_, i) => {
	const z = 1.65 - (5.45 * i) / 32;
	return [ciliaryWallRadius(z), z] as const;
});
export const CILIARY_INNER_POSTERIOR_RADIUS = ciliaryWallRadius(-2) - 0.5;
export function ciliaryInnerRadius(z: number) {
	return z < -0.4
		? 6.5 + ((-0.4 - z) * (CILIARY_INNER_POSTERIOR_RADIUS - 6.5)) / 1.6
		: 6.5 - ((z + 0.4) * 0.65) / 0.95;
}
export const CILIARY_BODY_PROFILE = [
	...CILIARY_OUTER_PROFILE,
	[ciliaryWallRadius(-3.8) - 0.15, -3.8],
	[CILIARY_INNER_POSTERIOR_RADIUS, -2],
	[6.5, -0.4],
	[5.85, 0.55],
	[5.85, 1.05],
	[IRIS_ROOT_RADIUS, IRIS_ROOT_Z],
	CILIARY_OUTER_PROFILE[0]!,
] as const;
