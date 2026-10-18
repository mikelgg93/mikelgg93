// Shared drawing landmarks (mm), not fitted ocular biometry. Positive z is anterior.
// The corneoscleral wall, iris root and ciliary attachment use the same points.
export const LIMBUS_RADIUS = 5.8;
export const IRIS_ROOT_RADIUS = 6;
export const IRIS_ROOT_Z = 1.3;
export const CILIARY_OUTER_PROFILE = [
	[6.55, 1.65],
	[7.35, 0],
	[8.45, -2],
	[9.15, -3.8],
] as const;
export const CILIARY_BODY_PROFILE = [
	...CILIARY_OUTER_PROFILE,
	[9.0, -3.8],
	[7.95, -2],
	[6.5, -0.4],
	[5.85, 0.55],
	[5.85, 1.05],
	[IRIS_ROOT_RADIUS, IRIS_ROOT_Z],
	CILIARY_OUTER_PROFILE[0],
] as const;

export function ciliaryWallRadius(z: number) {
	for (let i = 0; i < CILIARY_OUTER_PROFILE.length - 1; i++) {
		const a = CILIARY_OUTER_PROFILE[i]!,
			b = CILIARY_OUTER_PROFILE[i + 1]!;
		if (z >= b[1]) {
			const t = Math.max(0, Math.min(1, (a[1] - z) / (a[1] - b[1])));
			return a[0] + (b[0] - a[0]) * t;
		}
	}
	return CILIARY_OUTER_PROFILE.at(-1)![0];
}
