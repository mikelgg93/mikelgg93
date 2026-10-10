import { expect, test } from "bun:test";
import {
	atchison,
	biconicSag,
	conic,
	NAVARRO,
	TEACHING,
	vitreousDepth,
} from "../src/components/eye/models/eyeModels";
import {
	createPatch,
	PATCHES,
	patchPoint,
	updatePatch,
} from "../src/components/eye/models/modelGeometry";
import {
	acceptsDrawing,
	COVARIANCE,
	cholesky,
	covarianceFor,
	drawVector,
	GUARDS,
	generatePopulation,
	MEAN,
	normalGenerator,
	populationEye,
	sampleCorrelation,
	statistics,
} from "../src/components/eye/models/populationModel";

test("prescriptions retain published vertex positions and signed sag", () => {
	expect(vitreousDepth(NAVARRO)).toBeCloseTo(16.3203, 10);
	expect(TEACHING.acd).toBeCloseTo(3.52, 10);
	expect(atchison(0).axial).toBeCloseTo(23.58, 10);
	expect(vitreousDepth(atchison(-10))).toBeCloseTo(19.27, 10);
	expect(atchison(-10).cornea[0].rx).toBeCloseTo(7.55, 10);
	expect(biconicSag(0, 0, conic(-6, -1))).toBeCloseTo(0, 12);
	expect(biconicSag(3, 0, conic(-6, -1))).toBe(-0.75);
	for (const invalid of [NaN, Infinity, -11, 1])
		expect(() => atchison(invalid)).toThrow();
	expect(() => biconicSag(8, 0, conic(6, 1))).toThrow();
	for (let r = 0; r <= 4.2; r += 0.1) {
		const root = Math.sqrt(1 - (r / 4.6) ** 2);
		expect(patchPoint(TEACHING, "frontLens", r, 0)[2]).toBeCloseTo(
			-(5.6 - 1.53 * root),
			10,
		);
		expect(patchPoint(TEACHING, "backLens", r, 0)[2]).toBeCloseTo(
			-(5.6 + 2.07 * root),
			10,
		);
	}
});

test("Cholesky reconstructs the published five-variable covariance and rejects invalid matrices", () => {
	const factor = cholesky(COVARIANCE);
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++) {
			const reconstructed = factor[i]!.reduce(
				(s, l, k) => s + l * factor[j]![k]!,
				0,
			);
			expect(reconstructed).toBeCloseTo(COVARIANCE[i]![j]!, 12);
		}
	for (const invalid of [
		[],
		[[1, 2]],
		[
			[1, 2],
			[0, 1],
		],
		[
			[1, 2],
			[2, 1],
		],
		[[0]],
		[[NaN]],
		[[Infinity]],
	])
		expect(() => cholesky(invalid)).toThrow();
});

test("unbounded Gaussian draws reproduce marginal moments and covariance, not merely plausible histograms", () => {
	for (const correlated of [false, true]) {
		const normal = normalGenerator(2026),
			factor = cholesky(covarianceFor(correlated));
		const samples = Array.from({ length: 40000 }, () =>
			drawVector(normal, factor),
		);
		for (let i = 0; i < 5; i++) {
			const s = statistics(samples.map((v) => v[i]!)),
				sd = Math.sqrt(COVARIANCE[i]![i]!);
			expect(Math.abs(s.mean - MEAN[i]!)).toBeLessThan(sd * 0.03);
			expect(Math.abs(s.sd / sd - 1)).toBeLessThan(0.03);
			for (let j = 0; j < i; j++) {
				const target = correlated
					? COVARIANCE[i]![j]! /
						Math.sqrt(COVARIANCE[i]![i]! * COVARIANCE[j]![j]!)
					: 0;
				expect(
					Math.abs(sampleCorrelation(samples, i, j)! - target),
				).toBeLessThan(0.025);
			}
		}
	}
});

test("sampling is repeatable; invalid vectors are rejected whole; zero and one samples are defined", () => {
	expect(generatePopulation(73, true)).toEqual(generatePopulation(73, true));
	expect(generatePopulation(74, true).samples).not.toEqual(
		generatePopulation(73, true).samples,
	);
	expect(generatePopulation(73, true, 0)).toEqual({
		samples: [],
		attempted: 0,
		rejected: 0,
	});
	expect(generatePopulation(73, true, 1).samples).toHaveLength(1);
	expect(statistics([])).toEqual({ mean: 0, sd: 0 });
	expect(statistics([5])).toEqual({ mean: 5, sd: 0 });
	expect(sampleCorrelation([], 0, 1)).toBeNull();
	expect(sampleCorrelation([[1, 2]], 0, 1)).toBeNull();
	for (const invalid of [NaN, Infinity, -Infinity, -1, 0, 1000]) {
		for (let i = 0; i < 5; i++) {
			const v: number[] = [...MEAN];
			v[i] = invalid;
			expect(acceptsDrawing(v)).toBe(false);
			expect(() => populationEye(v)).toThrow();
		}
	}
	expect(acceptsDrawing(MEAN.slice(0, 4))).toBe(false);
	expect(acceptsDrawing([43, 0.8, 5, 5.8, 19])).toBe(false);
	expect(() => normalGenerator(-1)).toThrow();
	expect(() => generatePopulation(1, true, 1.5)).toThrow();
	const bounded = generatePopulation(777, true, 10000);
	expect(bounded.rejected).toBeGreaterThan(0);
	expect(bounded.attempted).toBe(bounded.samples.length + bounded.rejected);
	expect(bounded.samples.every(acceptsDrawing)).toBe(true);
});

test("every Atchison slider position and all valid population guard corners have finite, separated surfaces", () => {
	const eyes = [
		TEACHING,
		NAVARRO,
		...Array.from({ length: 41 }, (_, i) => atchison(-i / 4)),
	];
	for (let corner = 0; corner < 32; corner++) {
		const vector = GUARDS.map(([lo, hi], i) => (corner & (1 << i) ? hi : lo));
		if (acceptsDrawing(vector)) eyes.push(populationEye(vector));
	}
	const geometry = createPatch(),
		attribute = geometry.getAttribute("position");
	for (const eye of eyes) {
		for (const patch of PATCHES) {
			updatePatch(geometry, eye, patch);
			if (
				!Array.from(attribute.array).every(Number.isFinite) ||
				!Array.from(geometry.getAttribute("normal").array).every(
					Number.isFinite,
				)
			)
				throw new Error(`${eye.id}: ${patch}`);
			expect(geometry.getAttribute("position")).toBe(attribute);
			expect(geometry.boundingSphere!.radius).toBeGreaterThan(0);
		}
		for (let i = 0; i <= 30; i++) {
			const r = i / 30;
			const frontC = patchPoint(eye, "frontCornea", r * 5, 0),
				backC = patchPoint(eye, "backCornea", r * 5, 0);
			const frontL = patchPoint(eye, "frontLens", r * 4.2, 0),
				backL = patchPoint(eye, "backLens", r * 4.2, 0);
			expect(frontC[2]).toBeGreaterThan(backC[2]);
			expect(frontL[2]).toBeGreaterThan(backL[2]);
		}
	}
	geometry.dispose();
});
