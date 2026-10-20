import { describe, expect, test } from "bun:test";
import { retinalFocus } from "../src/components/eye/retina/retinalFocus";

describe("separate reduced-eye focus illustration", () => {
	test("matched demand and response focus on the inner foveal reference", () => {
		for (let d = 0; d <= 8; d += 0.25)
			expect(Math.abs(retinalFocus(d, d).errorMm)).toBeLessThan(1e-12);
	});
	test("lag and excess accommodation move focus in opposite directions", () => {
		expect(retinalFocus(6, 0).errorMm).toBeLessThan(0);
		expect(retinalFocus(0, 6).errorMm).toBeGreaterThan(0);
		expect(retinalFocus(6, 0).errorMm).toBeCloseTo(-2.4691358, 6);
	});
	test("invalid inputs cannot create invalid geometry", () => {
		for (const d of [NaN, Infinity, -Infinity, -100, 0, 8, 100])
			for (const r of [NaN, Infinity, -100, 0, 8, 100])
				for (const v of Object.values(retinalFocus(d, r)))
					expect(Number.isFinite(v)).toBe(true);
	});
});
