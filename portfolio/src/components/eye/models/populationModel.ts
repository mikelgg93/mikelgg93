import { conic, type EyePrescription, NAVARRO } from "./eyeModels";

export type ParameterIndex = 0 | 1 | 2 | 3 | 4;
export type EyeVector = [number, number, number, number, number];

export const PARAMETERS = ["K", "CCT", "ACD", "LT", "AL"] as const;
export const UNITS = ["D", "mm", "mm", "mm", "mm"] as const;
// Rozema, Atchison & Tassignon (2011), Appendix A1/A2, right-eye marginal.
// Order in the original 17-vector: columns 2, 13, 14, 12, 15 (one-based).
export const MEAN = [43.294, 0.545, 2.87, 4.07, 23.667] as const;
export const COVARIANCE = [
	[1.836, -0.002, 0.031, -0.043, -0.581],
	[-0.002, 0.001, -0.002, 0, 0.001],
	[0.031, -0.002, 0.143, -0.091, 0.239],
	[-0.043, 0, -0.091, 0.191, -0.008],
	[-0.581, 0.001, 0.239, -0.008, 1.233],
] as const;
export const SOURCE = "https://doi.org/10.1167/iovs.10-6705";
// Broad drawing guards, NOT clinical reference intervals. Reject whole vectors.
export const GUARDS = [
	[35, 52],
	[0.35, 0.8],
	[1.5, 5],
	[2.5, 5.8],
	[19, 30.5],
] as const;

export function cholesky(matrix: readonly (readonly number[])[]): number[][] {
	const n = matrix.length;
	if (
		!n ||
		matrix.some(
			(row) => row.length !== n || row.some((v) => !Number.isFinite(v)),
		)
	)
		throw new RangeError("Covariance must be a finite square matrix");
	const l = Array.from({ length: n }, () => Array<number>(n).fill(0));
	for (let i = 0; i < n; i++) {
		for (let j = 0; j <= i; j++) {
			if (Math.abs(matrix[i]![j]! - matrix[j]![i]!) > 1e-12)
				throw new RangeError("Covariance must be symmetric");
			let value = matrix[i]![j]!;
			for (let k = 0; k < j; k++) value -= l[i]![k]! * l[j]![k]!;
			if (i === j) {
				if (value <= 0)
					throw new RangeError("Covariance must be positive definite");
				l[i]![j] = Math.sqrt(value);
			} else l[i]![j] = value / l[j]![j]!;
		}
	}
	return l;
}

// Deterministic Mulberry32 generator; midpoint mapping keeps U strictly inside (0, 1).
export function uniformGenerator(seed: number) {
	if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
		throw new RangeError("Seed must be uint32");
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
	};
}
export function normalGenerator(seed: number) {
	const uniform = uniformGenerator(seed);
	let spare: number | undefined;
	return () => {
		if (spare !== undefined) {
			const result = spare;
			spare = undefined;
			return result;
		}
		const r = Math.sqrt(-2 * Math.log(uniform())),
			theta = 2 * Math.PI * uniform();
		spare = r * Math.sin(theta);
		return r * Math.cos(theta);
	};
}
export function covarianceFor(correlated: boolean) {
	return COVARIANCE.map((row, i) =>
		row.map((v, j) => (correlated || i === j ? v : 0)),
	);
}
export function drawVector(
	normal: () => number,
	factor: number[][],
): EyeVector {
	if (
		factor.length !== 5 ||
		factor.some((row) => row.length !== 5 || !row.every(Number.isFinite))
	)
		throw new RangeError("Expected a finite 5 × 5 factor");
	const z = MEAN.map(() => normal());
	return MEAN.map(
		(mean, i) => mean + factor[i]!.reduce((sum, l, j) => sum + l * z[j]!, 0),
	) as EyeVector;
}
export function acceptsDrawing(values: readonly number[]): values is EyeVector {
	return (
		values.length === 5 &&
		values.every(
			(v, i) => Number.isFinite(v) && v >= GUARDS[i]![0] && v <= GUARDS[i]![1],
		) &&
		values[4]! - values[1]! - values[2]! - values[3]! > 10
	);
}
export function generatePopulation(
	seed: number,
	correlated: boolean,
	count = 256,
) {
	if (!Number.isInteger(count) || count < 0 || count > 100000)
		throw new RangeError("Invalid population size");
	const normal = normalGenerator(seed),
		factor = cholesky(covarianceFor(correlated));
	const samples: EyeVector[] = [];
	let attempted = 0;
	while (samples.length < count && attempted < Math.max(100, count * 100)) {
		const sample = drawVector(normal, factor);
		attempted++;
		if (acceptsDrawing(sample)) samples.push(sample);
	}
	if (samples.length !== count)
		throw new Error("Drawing guards rejected too many samples");
	return { samples, attempted, rejected: attempted - samples.length };
}
export function populationEye(values: readonly number[]): EyePrescription {
	if (!acceptsDrawing(values)) throw new RangeError("Invalid drawing sample");
	const [k, cct, acd, lt, axial] = values;
	return {
		...NAVARRO,
		id: "population",
		cct,
		acd,
		lt,
		axial,
		cornea: [conic(337.5 / k, -0.26), NAVARRO.cornea[1]],
	}; // K uses conventional index 1.3375. All other shapes stay fixed for this drawing.
}
export function statistics(values: readonly number[]) {
	if (!values.length) return { mean: 0, sd: 0 };
	if (!values.every(Number.isFinite)) throw new RangeError("Non-finite sample");
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	return {
		mean,
		sd:
			values.length > 1
				? Math.sqrt(
						values.reduce((s, v) => s + (v - mean) ** 2, 0) /
							(values.length - 1),
					)
				: 0,
	};
}
export function sampleCorrelation(
	samples: readonly (readonly number[])[],
	a: number,
	b: number,
): number | null {
	if (samples.length < 2) return null;
	const x = statistics(samples.map((v) => v[a]!)),
		y = statistics(samples.map((v) => v[b]!));
	if (!x.sd || !y.sd) return null;
	return (
		samples.reduce((sum, v) => sum + (v[a]! - x.mean) * (v[b]! - y.mean), 0) /
		((samples.length - 1) * x.sd * y.sd)
	);
}
