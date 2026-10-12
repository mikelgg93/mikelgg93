import {
	CORNEAL_APEX_Z,
	LENS_FRONT_FACTOR,
	POSTERIOR_CORNEAL_APEX_Z,
	RELAXED_LENS_THICKNESS,
} from "../eyeDimensions";

export type Surface = { rx: number; ry: number; qx: number; qy: number };
export type EyePrescription = {
	id: string;
	cct: number;
	acd: number; // INTERNAL: posterior cornea to anterior lens, mm.
	lt: number;
	axial: number; // Corneal apex to the declared posterior endpoint, mm.
	cornea: [Surface, Surface];
	lens: [Surface, Surface];
	retina: Surface;
};
export const conic = (r: number, q: number): Surface => ({
	rx: r,
	ry: r,
	qx: q,
	qy: q,
});

// Geometry prescriptions only. No indices, GRIN or optical ray tracing are implemented here.
// Optical radii are signed for propagation from anterior to posterior.
export const NAVARRO: EyePrescription = {
	id: "navarro",
	cct: 0.55,
	acd: 3.05,
	lt: 4,
	axial: 23.9203,
	cornea: [conic(7.72, -0.26), conic(6.5, 0)],
	lens: [conic(10.2, -3.1316), conic(-6, -1)],
	retina: conic(-12, 0),
}; // Escudero-Sanz & Navarro (1999), Table 1, DOI 10.1364/JOSAA.16.001881.

export const TEACHING: EyePrescription = {
	id: "teaching",
	cct: CORNEAL_APEX_Z - POSTERIOR_CORNEAL_APEX_Z,
	acd:
		POSTERIOR_CORNEAL_APEX_Z - (RELAXED_LENS_THICKNESS * LENS_FRONT_FACTOR) / 2,
	lt: RELAXED_LENS_THICKNESS,
	axial: 24.3,
	cornea: [conic(7.8, -0.26), conic(6.5, -0.4)],
	// Exact conic equivalents of Part IV's two ellipsoidal halves: R=a²/b, Q=a²/b²−1.
	lens: [
		conic(4.6 ** 2 / 1.53, 4.6 ** 2 / 1.53 ** 2 - 1),
		conic(-(4.6 ** 2) / 2.07, 4.6 ** 2 / 2.07 ** 2 - 1),
	],
	retina: conic(-12.3, 0),
}; // Part IV: endpoint is the RPE proxy; its neural surface and pit lie anterior to it.

export function atchison(sr: number): EyePrescription {
	if (!Number.isFinite(sr) || sr < -10 || sr > 0)
		throw new RangeError("SR must be between -10 and 0 D");
	return {
		id: "atchison",
		cct: 0.55,
		acd: 3.15,
		lt: 3.6,
		axial: 23.58 - 0.299 * sr,
		cornea: [conic(7.77 + 0.022 * sr, -0.15), conic(6.4, -0.275)],
		lens: [conic(11.48, -5), conic(-5.9, -2)],
		retina: {
			rx: -12.91 - 0.094 * sr,
			ry: -12.72 + 0.004 * sr,
			qx: 0.27 + 0.026 * sr,
			qy: 0.25 + 0.017 * sr,
		},
	};
} // Centred 2006 model; Atchison & Thibos (2016), Table 1, DOI 10.1111/cxo.12352.

export function vitreousDepth(eye: EyePrescription) {
	return eye.axial - eye.cct - eye.acd - eye.lt;
}

export function biconicSag(x: number, y: number, s: Surface): number {
	if (
		![x, y, s.rx, s.ry, s.qx, s.qy].every(Number.isFinite) ||
		s.rx === 0 ||
		s.ry === 0
	)
		throw new RangeError("Invalid surface");
	const discriminant =
		1 - (1 + s.qx) * (x / s.rx) ** 2 - (1 + s.qy) * (y / s.ry) ** 2;
	if (discriminant < 0) throw new RangeError("Outside the conic's real domain");
	return ((x * x) / s.rx + (y * y) / s.ry) / (1 + Math.sqrt(discriminant));
}
