import * as THREE from "three";
export const muscles = [
	{
		id: "MR",
		en: "Medial rectus",
		es: "Recto medial",
		action: "Adduction",
		actionEs: "Aducción",
		nerve: "III",
	},
	{
		id: "LR",
		en: "Lateral rectus",
		es: "Recto lateral",
		action: "Abduction",
		actionEs: "Abducción",
		nerve: "VI",
	},
	{
		id: "SR",
		en: "Superior rectus",
		es: "Recto superior",
		action: "Elevation · intorsion · adduction",
		actionEs: "Elevación · intorsión · aducción",
		nerve: "III",
	},
	{
		id: "IR",
		en: "Inferior rectus",
		es: "Recto inferior",
		action: "Depression · extorsion · adduction",
		actionEs: "Depresión · extorsión · aducción",
		nerve: "III",
	},
	{
		id: "SO",
		en: "Superior oblique",
		es: "Oblicuo superior",
		action: "Intorsion · depression · abduction",
		actionEs: "Intorsión · depresión · abducción",
		nerve: "IV",
	},
	{
		id: "IO",
		en: "Inferior oblique",
		es: "Oblicuo inferior",
		action: "Extorsion · elevation · abduction",
		actionEs: "Extorsión · elevación · abducción",
		nerve: "III",
	},
] as const;
export type MuscleId = (typeof muscles)[number]["id"];
export const gazeTargets = [
	{ en: "Primary position", es: "Posición primaria", h: 0, v: 0 },
	{ en: "Adduction", es: "Aducción", h: 15, v: 0 },
	{ en: "Elevation + adduction", es: "Elevación + aducción", h: 15, v: 15 },
	{ en: "Elevation", es: "Elevación", h: 0, v: 15 },
	{ en: "Elevation + abduction", es: "Elevación + abducción", h: -15, v: 15 },
	{ en: "Abduction", es: "Abducción", h: -15, v: 0 },
	{ en: "Depression + abduction", es: "Depresión + abducción", h: -15, v: -15 },
	{ en: "Depression", es: "Depresión", h: 0, v: -15 },
	{ en: "Depression + adduction", es: "Depresión + aducción", h: 15, v: -15 },
] as const;
const forward = new THREE.Vector3(0, 0, 1);
// A head-fixed right-eye convention: +x nasal, +y superior, +z anterior.
// The rotation vector lies in the primary x-y plane (Listing-compatible poses).
export function gazePose(horizontal: number, vertical: number) {
	const bounded = (x: number) =>
		THREE.MathUtils.degToRad(
			Number.isFinite(x) ? THREE.MathUtils.clamp(x, -20, 20) : 0,
		);
	const h = bounded(horizontal),
		v = bounded(vertical);
	const direction = new THREE.Vector3(
		Math.sin(h) * Math.cos(v),
		Math.sin(v),
		Math.cos(h) * Math.cos(v),
	);
	return new THREE.Quaternion().setFromUnitVectors(forward, direction);
}
export function animatedGaze(seconds: number) {
	const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
	const index = Math.floor(t / 3) % gazeTargets.length;
	const a = gazeTargets[index]!,
		b = gazeTargets[(index + 1) % gazeTargets.length]!;
	const f = THREE.MathUtils.clamp(((t % 3) - 1.6) / 1.4, 0, 1),
		s = f * f * (3 - 2 * f);
	return { h: a.h + (b.h - a.h) * s, v: a.v + (b.v - a.v) * s, index };
}
