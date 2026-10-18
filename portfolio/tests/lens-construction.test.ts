import { expect, test } from "bun:test";
import {
	BACK_RADIUS,
	createRoundedLensGeometry,
	createTeachingCap,
	EQUATOR_RADIUS,
	FRONT_RADIUS,
	LENS_THICKNESS,
	roundedLensProfile,
} from "../src/components/eye/lens/lensConstruction";

test("fixed opposing caps share a rim and retain their central radii", () => {
	for (const radius of [FRONT_RADIUS, BACK_RADIUS]) {
		const geometry = createTeachingCap(radius);
		const profile = geometry.parameters.points;
		expect(profile[0]!.x).toBe(EQUATOR_RADIUS);
		expect(profile[0]!.y).toBe(0);
		const apex = profile.at(-1)!;
		for (const p of profile) {
			expect(p.x ** 2 + (p.y - apex.y + radius) ** 2).toBeCloseTo(
				radius ** 2,
				8,
			);
		}
		geometry.dispose();
	}
});

test("rounded profile closes at the poles with one smooth equator and no folded sides", () => {
	const profile = roundedLensProfile();
	expect(profile[0]!.x).toBe(0);
	expect(profile.at(-1)!.x).toBe(0);
	expect(profile.at(-1)!.y - profile[0]!.y).toBeCloseTo(LENS_THICKNESS, 8);
	const equator = profile.findIndex((p) => p.x === EQUATOR_RADIUS);
	expect(profile.filter((p) => p.x === EQUATOR_RADIUS)).toHaveLength(1);
	expect(profile[equator]!.y).toBeCloseTo(0, 8);
	for (let i = 1; i < profile.length; i++)
		expect(profile[i]!.y).toBeGreaterThan(profile[i - 1]!.y);
	for (const neighbor of [profile[equator - 1]!, profile[equator + 1]!]) {
		expect(Math.abs((EQUATOR_RADIUS - neighbor.x) / neighbor.y)).toBeLessThan(
			0.04,
		);
	}
	const geometry = createRoundedLensGeometry();
	for (const attribute of ["position", "normal"]) {
		expect(
			[...geometry.getAttribute(attribute).array].every(Number.isFinite),
		).toBe(true);
	}
	geometry.computeBoundingBox();
	expect(geometry.boundingBox!.max.x).toBeCloseTo(1, 5);
	expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeCloseTo(
		2,
		5,
	);
	geometry.dispose();
});
