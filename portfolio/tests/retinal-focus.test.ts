import { describe, expect, test } from "bun:test";
import {
	rayHeight,
	retinalFocus,
} from "../src/components/eye/retina/retinalFocus";

describe("separate reduced-eye focus illustration", () => {
	test("matched demand and response focus on the photoreceptor-side reference", () => {
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

test("rays continue through focus to the receiving reference with the expected footprint", () => {
	const far = retinalFocus(6, 0),
		near = retinalFocus(0, 6);
	expect(far.retinalZ).toBeCloseTo(-18.65, 10);
	for (const model of [far, near])
		expect(rayHeight(2, model.focusZ, model)).toBe(0);
	expect(rayHeight(2, far.retinalZ, far)).toBeCloseTo(0.2, 10);
	expect(rayHeight(2, near.retinalZ, near)).toBeCloseTo(-0.2, 10);
});
