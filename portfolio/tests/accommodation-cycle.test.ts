import { expect, test } from "bun:test";
import {
	focusDemand,
	nearPupil,
} from "../src/components/eye/lens/accommodationCycle";
import { lensShape } from "../src/components/eye/lens/lensModel";

test("near/far cycle is bounded, periodic and reverses lens and pupil together", () => {
	expect(focusDemand(0)).toBe(0);
	expect(focusDemand(7)).toBe(6);
	expect(focusDemand(13)).toBe(0);
	for (let t = 0; t <= 28; t += 0.05) {
		const demand = focusDemand(t);
		expect(demand).toBeGreaterThanOrEqual(0);
		expect(demand).toBeLessThanOrEqual(6);
		expect(focusDemand(t + 14)).toBeCloseTo(demand, 8);
		expect(nearPupil(demand)).toBeGreaterThanOrEqual(3.4 - 1e-12);
		expect(nearPupil(demand)).toBeLessThanOrEqual(5.8);
	}
	const far = lensShape(focusDemand(0)),
		near = lensShape(focusDemand(7));
	expect(near.thickness).toBeGreaterThan(far.thickness);
	expect(near.ringRadius).toBeLessThan(far.ringRadius);
	expect(nearPupil(6)).toBeLessThan(nearPupil(0));
});
