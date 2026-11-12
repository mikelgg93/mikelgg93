import { expect, test } from "bun:test";
import { fieldResponse } from "../src/components/eye/retina/receptiveField";

test("balanced fields cancel uniform illumination at every position", () => {
	for (const x of [-1.5, 0, 1.5]) {
		const response = fieldResponse("uniform", x);
		expect(response.centre).toBeCloseTo(1, 12);
		expect(response.surround).toBeCloseTo(1, 12);
		expect(response.on).toBe(0);
	}
});
test("central contrast, surround illumination and contrast reversal have distinct signs", () => {
	const spot = fieldResponse("spot", 0);
	const dark = fieldResponse("dark", 0);
	expect(spot.on).toBeGreaterThan(0);
	expect(dark.on).toBeCloseTo(-spot.on, 12);
	expect(fieldResponse("annulus", 0).on).toBeLessThan(0);
	expect(fieldResponse("spot", 1).on).toBeLessThan(0);
});
test("spatial symmetry and finite signed outputs hold throughout the controls", () => {
	for (const pattern of ["spot", "dark", "annulus", "uniform"] as const) {
		for (const x of [0, 0.5, 1, 1.5]) {
			const result = fieldResponse(pattern, x);
			expect(result.on).toBeCloseTo(fieldResponse(pattern, -x).on, 10);
			expect(result.off).toBe(-result.on);
			expect(Math.abs(result.on)).toBeLessThanOrEqual(1);
		}
		for (const x of [NaN, Infinity, -100, 100])
			expect(Number.isFinite(fieldResponse(pattern, x).on)).toBe(true);
	}
});
