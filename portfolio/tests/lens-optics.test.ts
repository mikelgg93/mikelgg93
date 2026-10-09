import { expect, test } from "bun:test";
import { CILIARY_PROFILE } from "../src/components/eye/lens/ciliaryApparatus";
import {
	ciliaryPoint,
	deformCiliary,
	muscleGeometry,
} from "../src/components/eye/lens/ciliaryGeometry";
import { lensShape } from "../src/components/eye/lens/lensModel";
import {
	capHeight,
	DOME_APERTURE,
	GRIN_EDGE_INDEX,
	grinIndex,
	traceGrinRay,
} from "../src/components/eye/lens/lensOptics";

test("opposing caps have a shared rim and valid spherical curvature across both controls", () => {
	for (let R = 6; R <= 14; R += 0.1) {
		expect(capHeight(R, DOME_APERTURE)).toBe(0);
		const centre = -Math.sqrt(R ** 2 - DOME_APERTURE ** 2);
		for (let r = 0; r <= DOME_APERTURE; r += 0.1) {
			const z = capHeight(R, r);
			expect(Number.isFinite(z) && z >= 0).toBe(true);
			expect(r ** 2 + (z - centre) ** 2).toBeCloseTo(R ** 2, 10);
		}
	}
	for (const value of [NaN, Infinity, -Infinity, -1, 100])
		expect(Number.isFinite(capHeight(value, value))).toBe(true);
});

test("GRIN index is higher centrally, continuous at the edge and uniform when disabled", () => {
	expect(grinIndex(0, 0, 0.05)).toBeCloseTo(1.42);
	expect(grinIndex(2, 0, 0.05)).toBe(GRIN_EDGE_INDEX);
	expect(grinIndex(0, 4.5, 0.05)).toBe(GRIN_EDGE_INDEX);
	for (const x of [-2, -1, 0, 1, 2])
		expect(grinIndex(x, 0, 0)).toBe(GRIN_EDGE_INDEX);
});

test("numerical GRIN rays exit, stay finite and respect axial and mirror symmetry", () => {
	for (let gradient = 0; gradient <= 0.06001; gradient += 0.005) {
		const axis = traceGrinRay(0, gradient);
		expect(axis.complete).toBe(true);
		expect(axis.points.every((p) => p.y === 0)).toBe(true);
		for (let height = 0.4; height <= 3.2001; height += 0.4) {
			const ray = traceGrinRay(height, gradient);
			const mirror = traceGrinRay(-height, gradient);
			expect(ray.complete && mirror.complete).toBe(true);
			expect(
				ray.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
			).toBe(true);
			expect(ray.exit!.y).toBeLessThan(0);
			expect(ray.exit!.y).toBeCloseTo(-mirror.exit!.y, 10);
			expect(ray.exit!.x).toBeCloseTo(mirror.exit!.x, 10);
		}
	}
});

test("uniform interiors are straight; GRIN adds curvature and converges as the step shrinks", () => {
	const uniform = traceGrinRay(3, 0);
	const points = uniform.points.slice(1, -1);
	const first = points[0]!,
		last = points.at(-1)!;
	for (const p of points)
		expect(
			(p.x - first.x) * (last.y - first.y) -
				(p.y - first.y) * (last.x - first.x),
		).toBeCloseTo(0, 10);
	const grin = traceGrinRay(3, 0.06);
	expect(grin.exit!.y).toBeLessThan(uniform.exit!.y);
	const fine = traceGrinRay(3, 0.06, 0.005);
	const coarse = traceGrinRay(3, 0.06, 0.05);
	expect(coarse.exit!.y).toBeCloseTo(fine.exit!.y, 5);
	for (const value of [NaN, Infinity, -Infinity, -100, 100]) {
		const ray = traceGrinRay(value, value, value);
		expect(ray.complete).toBe(true);
		expect(
			ray.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
		).toBe(true);
	}
});

test("ciliary anatomy deforms inward while preserving the outer anchor and lens clearance", () => {
	{
		const geometry = muscleGeometry(CILIARY_PROFILE);
		const rest = new Float32Array(geometry.getAttribute("position").array);
		for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
			deformCiliary(geometry, rest, fraction);
			expect(
				[
					...geometry.getAttribute("position").array,
					...geometry.getAttribute("normal").array,
				].every(Number.isFinite),
			).toBe(true);
			const anchor = ciliaryPoint(7.1, 0, 1.1, fraction);
			expect(anchor.x).toBeCloseTo(7.1, 10);
			expect(anchor.z).toBeCloseTo(1.1, 10);
			const foldCentre = ciliaryPoint(5.85, 0, 0.05, fraction);
			expect(foldCentre.x - 0.55).toBeGreaterThan(
				lensShape(8 * fraction).lensRadius,
			);
		}
		geometry.dispose();
	}
});
